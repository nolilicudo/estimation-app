/**
 * MortgageRateService
 * Fetches the current Freddie Mac Primary Mortgage Market Survey (PMMS) 30-yr fixed rate.
 * Caches in DB for 7 days. Falls back to admin-configured rate if fetch fails.
 */
import * as db from "../db";

const PMMS_URL = "https://www.freddiemac.com/pmms/docs/historicalweeklydata.xls";
const FRED_API_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface MortgageRateResult {
  rate: number;
  source: string;
  effectiveDate: string;
  isFallback: boolean;
  isCached: boolean;
}

/**
 * Get the current 30-yr fixed mortgage rate.
 * 1. Check DB cache (< 7 days old)
 * 2. Fetch from FRED (St. Louis Fed — free, no API key needed)
 * 3. Fall back to admin-configured rate in site_settings
 */
export async function getCurrentMortgageRate(fallbackRate?: number): Promise<MortgageRateResult> {
  // 1. Check cache
  try {
    const cached = await db.getLatestMortgageRate();
    if (cached && Date.now() - cached.retrievedAt < CACHE_TTL_MS) {
      return {
        rate: parseFloat(cached.rate),
        source: cached.source,
        effectiveDate: cached.effectiveDate,
        isFallback: cached.isFallback === 1,
        isCached: true,
      };
    }
  } catch {
    // DB unavailable — continue to fetch
  }

  // 2. Fetch from FRED (CSV: date,rate)
  try {
    const res = await fetch(FRED_API_URL, {
      headers: { "User-Agent": "TanziteCalculator/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split("\n").filter((l) => l && !l.startsWith("DATE"));
      const lastLine = lines[lines.length - 1];
      if (lastLine) {
        const [date, rateStr] = lastLine.split(",");
        const rate = parseFloat(rateStr?.trim() ?? "");
        if (!isNaN(rate) && rate > 0) {
          // Cache in DB
          try {
            await db.saveMortgageRate({
              rate: rate.toFixed(4),
              source: "Freddie Mac PMMS via FRED",
              effectiveDate: date?.trim() ?? new Date().toISOString().split("T")[0],
              retrievedAt: Date.now(),
              isFallback: 0,
            });
          } catch {
            // Cache failure is non-fatal
          }
          return {
            rate,
            source: "Freddie Mac PMMS via FRED",
            effectiveDate: date?.trim() ?? "",
            isFallback: false,
            isCached: false,
          };
        }
      }
    }
  } catch {
    // Fetch failed — use fallback
  }

  // 3. Fallback
  const rate = fallbackRate ?? 6.72;
  const today = new Date().toISOString().split("T")[0];
  try {
    await db.saveMortgageRate({
      rate: rate.toFixed(4),
      source: "Admin Fallback",
      effectiveDate: today,
      retrievedAt: Date.now(),
      isFallback: 1,
    });
  } catch {
    // non-fatal
  }
  return {
    rate,
    source: "Admin Fallback",
    effectiveDate: today,
    isFallback: true,
    isCached: false,
  };
}
