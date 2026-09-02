/**
 * contract-pdf.test.ts
 *
 * Tests for the generateContractPdf function, specifically verifying that
 * the builder pricing badge is rendered when isBuilderPricing is true.
 *
 * Note: PDFKit compresses/encodes text content, so we cannot search for
 * plain text strings in the raw PDF buffer. Instead we verify:
 *  - the output is a valid PDF buffer
 *  - the builder-pricing PDF is larger than the non-builder one (extra badge content)
 *  - no errors are thrown in either mode
 */

import { describe, it, expect } from "vitest";
import { generateContractPdf } from "./contract-pdf";

const baseData = {
  contractText: "This is a test contract.",
  customerName: "John Builder",
  customerEmail: "john@builder.com",
  customerPhone: "(801) 555-1234",
  customerAddress: "123 Main St, Orem, UT 84097",
  collectionName: "Rainier Collection",
  sqft: 400,
  grandTotal: 10000,
  depositAmount: 5000,
  balanceAmount: 5000,
  signedName: "John Builder",
  signedAt: new Date("2026-01-15T12:00:00Z"),
  orderId: 42,
  companyName: "Design Your Price",
};

describe("generateContractPdf", () => {
  it("generates a valid PDF buffer without builder pricing", async () => {
    const buf = await generateContractPdf({ ...baseData, isBuilderPricing: false });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    // All PDFs start with the %PDF header
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("generates a valid PDF buffer with builder pricing badge", async () => {
    const buf = await generateContractPdf({ ...baseData, isBuilderPricing: true });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("builder pricing PDF is larger than non-builder PDF (extra badge content)", async () => {
    const bufNormal = await generateContractPdf({ ...baseData, isBuilderPricing: false });
    const bufBuilder = await generateContractPdf({ ...baseData, isBuilderPricing: true });
    // Builder PDF has extra badge + Pricing Type row so should be larger
    expect(bufBuilder.length).toBeGreaterThan(bufNormal.length);
  });

  it("generates a valid PDF with builder pricing line items in the breakdown table", async () => {
    const buf = await generateContractPdf({
      ...baseData,
      isBuilderPricing: true,
      lineItems: [
        { name: "Materials", cost: 6000 },
        { name: "Labor", cost: 2500 },
        { name: "Builder Pricing — Materials (15% off)", cost: -900 },
        { name: "Builder Pricing — Labor (10% off)", cost: -250 },
        { name: "Tax", cost: 650 },
      ],
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("generates a valid PDF with no line items (fallback to cost categories)", async () => {
    const buf = await generateContractPdf({
      ...baseData,
      isBuilderPricing: false,
      costCategories: {
        materials: 6000,
        labor: 2500,
        delivery: 350,
        tax: 650,
      },
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("does not throw when isBuilderPricing is undefined (default false)", async () => {
    const buf = await generateContractPdf({ ...baseData });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
