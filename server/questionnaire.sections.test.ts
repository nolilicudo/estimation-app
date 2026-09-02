/**
 * Tests for 10-section questionnaire restructuring:
 *  - Section field on questions
 *  - pricingTier field on options
 *  - photo_upload question type
 *  - Section-grouped answer submission
 */
import { describe, it, expect } from "vitest";

// ─── Section metadata ─────────────────────────────────────────────────────────

const SECTION_ORDER = [
  "project_basics",
  "existing_conditions",
  "site_access",
  "structure_foundation_roof",
  "mechanical_electrical_plumbing",
  "exterior_finishes",
  "interior_finishes",
  "trade_upgrades",
  "overall_finish_level",
  "photos_inspiration",
];

const SECTION_LABELS: Record<string, string> = {
  project_basics: "Project Basics",
  existing_conditions: "Existing Home Conditions",
  site_access: "Site & Access",
  structure_foundation_roof: "Structure / Foundation / Roof",
  mechanical_electrical_plumbing: "Mechanical, Electrical & Plumbing",
  exterior_finishes: "Exterior Finishes",
  interior_finishes: "Interior Finishes",
  trade_upgrades: "Trade-Specific Feature Upgrades",
  overall_finish_level: "Overall Finish Level",
  photos_inspiration: "Photos / Inspiration Images",
};

// ─── Section order tests ──────────────────────────────────────────────────────

describe("Section order and metadata", () => {
  it("has exactly 10 sections", () => {
    expect(SECTION_ORDER).toHaveLength(10);
  });

  it("all sections have labels", () => {
    for (const s of SECTION_ORDER) {
      expect(SECTION_LABELS[s]).toBeTruthy();
    }
  });

  it("section order matches expected sequence", () => {
    expect(SECTION_ORDER[0]).toBe("project_basics");
    expect(SECTION_ORDER[4]).toBe("mechanical_electrical_plumbing");
    expect(SECTION_ORDER[9]).toBe("photos_inspiration");
  });
});

// ─── Question type validation ─────────────────────────────────────────────────

type QuestionType = "single" | "multi" | "quantity_select" | "voice_photo" | "photo_upload";

function isValidQuestionType(type: string): type is QuestionType {
  return ["single", "multi", "quantity_select", "voice_photo", "photo_upload"].includes(type);
}

describe("Question type validation", () => {
  it("accepts photo_upload as a valid question type", () => {
    expect(isValidQuestionType("photo_upload")).toBe(true);
  });

  it("accepts all standard question types", () => {
    const types: QuestionType[] = ["single", "multi", "quantity_select", "voice_photo", "photo_upload"];
    for (const t of types) {
      expect(isValidQuestionType(t)).toBe(true);
    }
  });

  it("rejects unknown question types", () => {
    expect(isValidQuestionType("unknown_type")).toBe(false);
    expect(isValidQuestionType("")).toBe(false);
  });
});

// ─── pricingTier validation ───────────────────────────────────────────────────

function isValidPricingTier(tier: number | null | undefined): boolean {
  if (tier === null || tier === undefined) return true; // null is allowed (no tier)
  return Number.isInteger(tier) && tier >= 1 && tier <= 5;
}

describe("pricingTier validation", () => {
  it("accepts null (no tier assigned)", () => {
    expect(isValidPricingTier(null)).toBe(true);
    expect(isValidPricingTier(undefined)).toBe(true);
  });

  it("accepts tiers 1 through 5", () => {
    for (let i = 1; i <= 5; i++) {
      expect(isValidPricingTier(i)).toBe(true);
    }
  });

  it("rejects tiers outside 1-5", () => {
    expect(isValidPricingTier(0)).toBe(false);
    expect(isValidPricingTier(6)).toBe(false);
    expect(isValidPricingTier(-1)).toBe(false);
  });

  it("rejects non-integer tiers", () => {
    expect(isValidPricingTier(2.5)).toBe(false);
  });
});

// ─── Photo upload question logic ──────────────────────────────────────────────

type PhotoState = { photoUrls: string[]; isUploading: boolean };

function canProceedFromPhotoUpload(_state: PhotoState): boolean {
  // photo_upload questions are always optional — can always proceed
  return true;
}

function buildAnswerPayloadForPhotoUpload(questionId: number, state: PhotoState) {
  if (state.photoUrls.length === 0) return null; // skip if no photos
  return {
    questionId,
    selectedOptionIds: [],
    photoUrls: state.photoUrls,
  };
}

describe("Photo upload question logic", () => {
  it("always allows proceeding from a photo_upload question", () => {
    const emptyState: PhotoState = { photoUrls: [], isUploading: false };
    const withPhotos: PhotoState = { photoUrls: ["https://example.com/photo.jpg"], isUploading: false };
    expect(canProceedFromPhotoUpload(emptyState)).toBe(true);
    expect(canProceedFromPhotoUpload(withPhotos)).toBe(true);
  });

  it("excludes photo_upload from answer payload when no photos uploaded", () => {
    const state: PhotoState = { photoUrls: [], isUploading: false };
    const result = buildAnswerPayloadForPhotoUpload(42, state);
    expect(result).toBeNull();
  });

  it("includes photo_upload in answer payload when photos are present", () => {
    const state: PhotoState = {
      photoUrls: ["https://cdn.example.com/photo1.jpg", "https://cdn.example.com/photo2.jpg"],
      isUploading: false,
    };
    const result = buildAnswerPayloadForPhotoUpload(42, state);
    expect(result).not.toBeNull();
    expect(result?.questionId).toBe(42);
    expect(result?.photoUrls).toHaveLength(2);
    expect(result?.selectedOptionIds).toHaveLength(0);
  });
});

// ─── Section grouping logic ───────────────────────────────────────────────────

type Question = {
  id: number;
  text: string;
  section: string | null;
  type: QuestionType;
};

function groupQuestionsBySection(questions: Question[]): Map<string, Question[]> {
  const groups = new Map<string, Question[]>();
  for (const s of SECTION_ORDER) {
    const qs = questions.filter(q => q.section === s);
    if (qs.length > 0) groups.set(s, qs);
  }
  return groups;
}

describe("Section grouping logic", () => {
  const sampleQuestions: Question[] = [
    { id: 1, text: "Project type?", section: "project_basics", type: "single" },
    { id: 2, text: "Project size?", section: "project_basics", type: "single" },
    { id: 3, text: "Existing foundation?", section: "structure_foundation_roof", type: "single" },
    { id: 4, text: "Upload exterior photo", section: "photos_inspiration", type: "photo_upload" },
    { id: 5, text: "Flooring choice?", section: "interior_finishes", type: "single" },
  ];

  it("groups questions by section correctly", () => {
    const groups = groupQuestionsBySection(sampleQuestions);
    expect(groups.get("project_basics")).toHaveLength(2);
    expect(groups.get("structure_foundation_roof")).toHaveLength(1);
    expect(groups.get("interior_finishes")).toHaveLength(1);
    expect(groups.get("photos_inspiration")).toHaveLength(1);
  });

  it("omits sections with no questions", () => {
    const groups = groupQuestionsBySection(sampleQuestions);
    expect(groups.has("site_access")).toBe(false);
    expect(groups.has("mechanical_electrical_plumbing")).toBe(false);
  });

  it("preserves SECTION_ORDER ordering in grouped output", () => {
    const groups = groupQuestionsBySection(sampleQuestions);
    const keys = Array.from(groups.keys());
    // project_basics should come before interior_finishes
    const pbIdx = keys.indexOf("project_basics");
    const ifIdx = keys.indexOf("interior_finishes");
    expect(pbIdx).toBeLessThan(ifIdx);
  });

  it("places photo_upload questions in the photos_inspiration section", () => {
    const groups = groupQuestionsBySection(sampleQuestions);
    const photoSection = groups.get("photos_inspiration") ?? [];
    expect(photoSection.every(q => q.type === "photo_upload")).toBe(true);
  });
});

// ─── Section completion logic ─────────────────────────────────────────────────

function isSectionComplete(
  questions: Question[],
  answers: Record<number, number[]>,
  freeformAnswers: Record<number, string>,
): boolean {
  return questions.every(q => {
    if (q.type === "photo_upload") return true; // always optional
    return (answers[q.id]?.length ?? 0) > 0 || !!freeformAnswers[q.id];
  });
}

describe("Section completion logic", () => {
  const qs: Question[] = [
    { id: 10, text: "Q1", section: "project_basics", type: "single" },
    { id: 11, text: "Q2", section: "project_basics", type: "single" },
  ];

  it("marks section incomplete when no answers given", () => {
    expect(isSectionComplete(qs, {}, {})).toBe(false);
  });

  it("marks section incomplete when only some questions answered", () => {
    expect(isSectionComplete(qs, { 10: [1] }, {})).toBe(false);
  });

  it("marks section complete when all non-photo questions answered", () => {
    expect(isSectionComplete(qs, { 10: [1], 11: [2] }, {})).toBe(true);
  });

  it("photo_upload questions never block section completion", () => {
    const qsWithPhoto: Question[] = [
      { id: 20, text: "Q1", section: "photos_inspiration", type: "photo_upload" },
      { id: 21, text: "Q2", section: "photos_inspiration", type: "photo_upload" },
    ];
    expect(isSectionComplete(qsWithPhoto, {}, {})).toBe(true);
  });
});

// ─── Photo category mapping ───────────────────────────────────────────────────

const PHOTO_UPLOAD_CATEGORIES = [
  "existing_exterior_wall",
  "existing_roofline",
  "electrical_panel",
  "mechanical_room",
  "basement_crawl_space",
  "backyard_access",
  "existing_interior_space",
  "inspiration_photos",
];

describe("Photo upload categories", () => {
  it("has 8 photo upload categories", () => {
    expect(PHOTO_UPLOAD_CATEGORIES).toHaveLength(8);
  });

  it("includes all required photo categories from spec", () => {
    expect(PHOTO_UPLOAD_CATEGORIES).toContain("existing_exterior_wall");
    expect(PHOTO_UPLOAD_CATEGORIES).toContain("electrical_panel");
    expect(PHOTO_UPLOAD_CATEGORIES).toContain("inspiration_photos");
    expect(PHOTO_UPLOAD_CATEGORIES).toContain("mechanical_room");
  });
});
