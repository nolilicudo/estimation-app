/**
 * Home Depot lumber price sync via SerpApi.
 *
 * Fetches the current store price for each lumber item that has a
 * homeDepotSku set, then auto-applies it to costPrice and recomputes
 * displayPrice using the item's existing markupMultiplier.
 *
 * Store: Home Depot Lindon UT #4407  (zip 84042)
 */

import * as db from "./db";
import { lumberItems, lumberPriceHistory } from "../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";
import { ENV } from "./_core/env";

const STORE_ID = "4407";
const DELIVERY_ZIP = "84042";
const SERPAPI_BASE = "https://serpapi.com/search";

interface SerpApiProductResult {
  price?: number;
  product_results?: {
    price?: number;
    prices?: Array<{ raw?: number; value?: number }>;
  };
  error?: string;
}

/**
 * Fetch the current Home Depot store price for a single product ID.
 * Returns null if the product cannot be found or the API returns an error.
 */
export async function fetchHomeDepotPrice(productId: string): Promise<number | null> {
  const apiKey = ENV.serpapiKey;
  if (!apiKey) {
    console.warn("[HomeDepotSync] SERPAPI_KEY not set — skipping price fetch");
    return null;
  }

  const params = new URLSearchParams({
    engine: "home_depot_product",
    product_id: productId,
    store_id: STORE_ID,
    delivery_zip: DELIVERY_ZIP,
    api_key: apiKey,
  });

  const url = `${SERPAPI_BASE}?${params.toString()}`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) {
      console.error(`[HomeDepotSync] HTTP ${resp.status} for product ${productId}`);
      return null;
    }
    const data = (await resp.json()) as SerpApiProductResult;

    if (data.error) {
      console.error(`[HomeDepotSync] SerpApi error for ${productId}: ${data.error}`);
      return null;
    }

    // Try product_results.price first, then top-level price
    const price =
      data.product_results?.price ??
      data.product_results?.prices?.[0]?.raw ??
      data.product_results?.prices?.[0]?.value ??
      data.price;

    if (typeof price !== "number" || price <= 0) {
      console.warn(`[HomeDepotSync] No valid price for product ${productId}`);
      return null;
    }

    return price;
  } catch (err) {
    console.error(`[HomeDepotSync] Fetch error for product ${productId}:`, err);
    return null;
  }
}

export interface SyncResult {
  itemId: number;
  itemName: string;
  sku: string;
  oldCostPrice: number;
  newCostPrice: number;
  newDisplayPrice: number;
  success: boolean;
  error?: string;
}

/**
 * Sync all lumber items that have a homeDepotSku set.
 * Auto-applies the fetched price as costPrice and recomputes displayPrice.
 * Returns a per-item result array.
 */
export async function syncAllLumberPrices(): Promise<SyncResult[]> {
  const drizzle = await db.getDb();
  if (!drizzle) throw new Error("Database not available");

  // Fetch all active items with a SKU
  const items = await drizzle
    .select()
    .from(lumberItems)
    .where(isNotNull(lumberItems.homeDepotSku));

  const results: SyncResult[] = [];
  const now = new Date();

  for (const item of items) {
    const sku = item.homeDepotSku!;
    const oldCostPrice = parseFloat(item.costPrice as unknown as string) || 0;
    const markupMultiplier = parseFloat(item.markupMultiplier as unknown as string) || 1.3;

    try {
      const newPrice = await fetchHomeDepotPrice(sku);

      if (newPrice === null) {
        results.push({
          itemId: item.id,
          itemName: item.name,
          sku,
          oldCostPrice,
          newCostPrice: oldCostPrice,
          newDisplayPrice: parseFloat((oldCostPrice * markupMultiplier).toFixed(2)),
          success: false,
          error: "Price not found",
        });
        continue;
      }

      const newDisplayPrice = parseFloat((newPrice * markupMultiplier).toFixed(2));
      const oldDisplayPrice = parseFloat(item.displayPrice as unknown as string) || 0;

      const d = await db.getDb();
      if (!d) throw new Error("Database not available");
      await d
        .update(lumberItems)
        .set({
          costPrice: newPrice.toFixed(2) as unknown as any,
          displayPrice: newDisplayPrice.toFixed(2) as unknown as any,
          lastSyncedPrice: newPrice.toFixed(2) as unknown as any,
          lastSyncedAt: now,
        })
        .where(eq(lumberItems.id, item.id));

      // Log price history only when price actually changed
      if (Math.abs(newPrice - oldCostPrice) >= 0.01) {
        try {
          await d.insert(lumberPriceHistory).values({
            lumberItemId: item.id,
            lumberItemName: item.name,
            sku,
            oldCostPrice: oldCostPrice.toFixed(2) as unknown as any,
            newCostPrice: newPrice.toFixed(2) as unknown as any,
            oldDisplayPrice: oldDisplayPrice.toFixed(2) as unknown as any,
            newDisplayPrice: newDisplayPrice.toFixed(2) as unknown as any,
            source: "scheduled",
          });
        } catch (histErr) {
          console.warn(`[HomeDepotSync] Failed to log price history for ${item.name}:`, histErr);
        }
      }

      results.push({
        itemId: item.id,
        itemName: item.name,
        sku,
        oldCostPrice,
        newCostPrice: newPrice,
        newDisplayPrice,
        success: true,
      });

      console.log(
        `[HomeDepotSync] ${item.name} (SKU ${sku}): $${oldCostPrice} → $${newPrice} (display: $${newDisplayPrice})`
      );

      // Polite delay between requests
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      results.push({
        itemId: item.id,
        itemName: item.name,
        sku,
        oldCostPrice,
        newCostPrice: oldCostPrice,
        newDisplayPrice: parseFloat((oldCostPrice * markupMultiplier).toFixed(2)),
        success: false,
        error: String(err),
      });
    }
  }

  console.log(
    `[HomeDepotSync] Sync complete: ${results.filter((r) => r.success).length}/${results.length} items updated`
  );
  return results;
}
