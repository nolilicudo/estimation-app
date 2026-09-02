/**
 * Scheduled Home Depot lumber price sync.
 *
 * Strategy: run on startup if 30+ days have passed since the last sync,
 * then re-check every 12 hours. This is resilient to sandbox hibernation —
 * a pure cron job would silently miss its window whenever the process is
 * asleep at the scheduled time.
 *
 * "Last sync" is determined by the most recent `lastSyncedAt` value across
 * all lumber items that have a homeDepotSku.
 */

import { syncAllLumberPrices } from "./homeDepotSync";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { lumberItems } from "../drizzle/schema";
import { isNotNull, desc } from "drizzle-orm";

const SYNC_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;      // re-check every 12 hours

let syncRunning = false;

async function getLastSyncedAt(): Promise<Date | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select({ lastSyncedAt: lumberItems.lastSyncedAt })
      .from(lumberItems)
      .where(isNotNull(lumberItems.homeDepotSku))
      .orderBy(desc(lumberItems.lastSyncedAt))
      .limit(1);
    return rows[0]?.lastSyncedAt ?? null;
  } catch {
    return null;
  }
}

async function runSyncIfDue() {
  if (syncRunning) {
    console.log("[ScheduledSync] Previous sync still running — skipping");
    return;
  }

  const lastSync = await getLastSyncedAt();
  const now = Date.now();
  const msSinceLast = lastSync ? now - lastSync.getTime() : Infinity;

  if (msSinceLast < SYNC_INTERVAL_MS) {
    const daysUntilNext = ((SYNC_INTERVAL_MS - msSinceLast) / 86_400_000).toFixed(1);
    const daysSinceLast = (msSinceLast / 86_400_000).toFixed(1);
    console.log(`[ScheduledSync] Last sync was ${daysSinceLast} days ago — next in ~${daysUntilNext} days`);
    return;
  }

  syncRunning = true;
  console.log("[ScheduledSync] Starting monthly Home Depot lumber price sync…");
  try {
    const results = await syncAllLumberPrices();
    const ok = results.filter((r) => r.success).length;
    const fail = results.filter((r) => !r.success).length;
    console.log(`[ScheduledSync] Done: ${ok} updated, ${fail} failed`);
  } catch (err) {
    console.error("[ScheduledSync] Error during sync:", err);
  } finally {
    syncRunning = false;
  }
}

export function startScheduledSync() {
  if (!ENV.serpapiKey) {
    console.log("[ScheduledSync] SERPAPI_KEY not set — price sync disabled");
    return;
  }

  // Check immediately on startup (catches up after hibernation)
  runSyncIfDue().catch((err) =>
    console.error("[ScheduledSync] Startup check error:", err)
  );

  // Then re-check every 12 hours so we never miss a monthly window by more than 12h
  setInterval(() => {
    runSyncIfDue().catch((err) =>
      console.error("[ScheduledSync] Interval check error:", err)
    );
  }, CHECK_INTERVAL_MS);

  console.log("[ScheduledSync] Home Depot price sync scheduled (once a month, checked every 12h)");
}
