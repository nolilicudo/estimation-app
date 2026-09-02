import { describe, it, expect } from "vitest";

/**
 * Validates that SERPAPI_KEY is set and can successfully fetch a known
 * Home Depot product (2x4x8 PT lumber, product_id=206931753) from the
 * Lindon UT store (#4407).
 */
describe("SerpApi Home Depot integration", () => {
  it("should have SERPAPI_KEY set", () => {
    expect(process.env.SERPAPI_KEY).toBeTruthy();
    expect(process.env.SERPAPI_KEY!.length).toBeGreaterThan(20);
  });

  it("should fetch a real product price from Home Depot Lindon store", async () => {
    const apiKey = process.env.SERPAPI_KEY;
    const productId = "206931753"; // 2x4x8 PT Ground Contact — known SKU
    const url = `https://serpapi.com/search?engine=home_depot_product&product_id=${productId}&store_id=4407&delivery_zip=84042&api_key=${apiKey}`;

    const resp = await fetch(url);
    expect(resp.ok).toBe(true);

    const data = await resp.json() as any;
    expect(data.error).toBeUndefined();

    const price = data.product_results?.price ?? data.price;
    expect(typeof price).toBe("number");
    expect(price).toBeGreaterThan(0);
  }, 20_000);
});
