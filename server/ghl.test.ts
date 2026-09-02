/**
 * GHL Integration Tests
 *
 * Validates that the GHL API key and location ID are correctly configured
 * by making a lightweight GET request to the GHL contacts endpoint.
 */
import { describe, it, expect } from "vitest";
import "dotenv/config";

const GHL_BASE = "https://services.leadconnectorhq.com";

describe("GHL API credentials", () => {
  it("should have GHL_API_KEY and GHL_LOCATION_ID set", () => {
    expect(process.env.GHL_API_KEY, "GHL_API_KEY must be set").toBeTruthy();
    expect(process.env.GHL_LOCATION_ID, "GHL_LOCATION_ID must be set").toBeTruthy();
  });

  it("should be able to query GHL contacts using the API key", async () => {
    const apiKey = process.env.GHL_API_KEY!;
    const locationId = process.env.GHL_LOCATION_ID!;

    const res = await fetch(
      `${GHL_BASE}/contacts/?locationId=${locationId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
      }
    );

    expect(
      res.status,
      `GHL API returned ${res.status} — check GHL_API_KEY and GHL_LOCATION_ID`
    ).toBe(200);

    const json = await res.json() as any;
    expect(json, "Response should be an object").toBeTypeOf("object");
    expect(Array.isArray(json.contacts), "Response should contain contacts array").toBe(true);
  }, 15000);
});
