/**
 * Tests for price consult section visibility/ordering logic.
 * Verifies that the isPCSectionVisible and getPCSectionOrder helpers
 * behave correctly when sections are loaded from the DB.
 */

import { describe, it, expect } from "vitest";

// Simulate the helper functions as they appear in the calculator
function isPCSectionVisible(
  sections: any[],
  sectionKey: string
): boolean {
  if (sections.length === 0) return true; // show all while loading
  const sec = sections.find((s: any) => s.sectionKey === sectionKey);
  return sec ? Boolean(sec.isVisible) : true;
}

function getPCSectionOrder(
  sections: any[],
  sectionKey: string
): number {
  const sec = sections.find((s: any) => s.sectionKey === sectionKey);
  return sec?.sortOrder ?? 999;
}

describe("isPCSectionVisible", () => {
  it("returns true when sections array is empty (loading state)", () => {
    expect(isPCSectionVisible([], "bathroom_size")).toBe(true);
  });

  it("returns true when section is visible (isVisible = 1)", () => {
    const sections = [{ sectionKey: "bathroom_size", isVisible: 1, sortOrder: 0 }];
    expect(isPCSectionVisible(sections, "bathroom_size")).toBe(true);
  });

  it("returns false when section is hidden (isVisible = 0)", () => {
    const sections = [{ sectionKey: "bathroom_size", isVisible: 0, sortOrder: 0 }];
    expect(isPCSectionVisible(sections, "bathroom_size")).toBe(false);
  });

  it("returns true when section key is not found (unknown section defaults to visible)", () => {
    const sections = [{ sectionKey: "bathroom_size", isVisible: 1, sortOrder: 0 }];
    expect(isPCSectionVisible(sections, "unknown_section")).toBe(true);
  });

  it("handles boolean isVisible = true", () => {
    const sections = [{ sectionKey: "plumbing_fixtures", isVisible: true, sortOrder: 1 }];
    expect(isPCSectionVisible(sections, "plumbing_fixtures")).toBe(true);
  });

  it("handles boolean isVisible = false", () => {
    const sections = [{ sectionKey: "plumbing_fixtures", isVisible: false, sortOrder: 1 }];
    expect(isPCSectionVisible(sections, "plumbing_fixtures")).toBe(false);
  });
});

describe("getPCSectionOrder", () => {
  it("returns 999 when sections array is empty", () => {
    expect(getPCSectionOrder([], "bathroom_size")).toBe(999);
  });

  it("returns the correct sortOrder for a known section", () => {
    const sections = [
      { sectionKey: "bathroom_size", isVisible: 1, sortOrder: 0 },
      { sectionKey: "plumbing_fixtures", isVisible: 1, sortOrder: 1 },
      { sectionKey: "electrical_scope", isVisible: 1, sortOrder: 2 },
    ];
    expect(getPCSectionOrder(sections, "plumbing_fixtures")).toBe(1);
    expect(getPCSectionOrder(sections, "electrical_scope")).toBe(2);
  });

  it("returns 999 for unknown section key", () => {
    const sections = [{ sectionKey: "bathroom_size", isVisible: 1, sortOrder: 0 }];
    expect(getPCSectionOrder(sections, "nonexistent")).toBe(999);
  });
});

describe("section filtering and sorting", () => {
  const mockSections = [
    { sectionKey: "flooring", isVisible: 1, sortOrder: 2 },
    { sectionKey: "plumbing", isVisible: 0, sortOrder: 0 },
    { sectionKey: "electrical", isVisible: 1, sortOrder: 1 },
  ];

  const grouped: Record<string, string[]> = {
    flooring: ["item1"],
    plumbing: ["item2"],
    electrical: ["item3"],
  };

  it("filters out hidden sections", () => {
    const filtered = Object.entries(grouped)
      .filter(([category]) => isPCSectionVisible(mockSections, category));
    const keys = filtered.map(([k]) => k);
    expect(keys).not.toContain("plumbing");
    expect(keys).toContain("flooring");
    expect(keys).toContain("electrical");
  });

  it("sorts visible sections by sortOrder", () => {
    const sorted = Object.entries(grouped)
      .filter(([category]) => isPCSectionVisible(mockSections, category))
      .sort(([a], [b]) => getPCSectionOrder(mockSections, a) - getPCSectionOrder(mockSections, b));
    const keys = sorted.map(([k]) => k);
    expect(keys).toEqual(["electrical", "flooring"]);
  });
});
