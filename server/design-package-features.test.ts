import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Design Package — Free Features & Questionnaire", () => {
  let createdFeatureId: number;
  let createdQuestionId: number;

  it("should create a free feature", async () => {
    const result = await db.createDpFreeFeature({
      name: "Test Free Feature",
      description: "A test feature for vitest",
      photoUrl: "https://example.com/photo.jpg",
      listPrice: 500,
      isActive: 1,
      sortOrder: 99,
    });
    expect(result).toBeDefined();
    expect(result!.id).toBeGreaterThan(0);
    createdFeatureId = result!.id;
  });

  it("should retrieve all free features including the new one", async () => {
    const features = await db.getAllDpFreeFeatures();
    expect(Array.isArray(features)).toBe(true);
    const found = features.find((f: any) => f.id === createdFeatureId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Test Free Feature");
    expect(parseFloat(found?.listPrice ?? "0")).toBe(500);
  });

  it("should update a free feature", async () => {
    await db.updateDpFreeFeature(createdFeatureId, { name: "Updated Feature", listPrice: 750 });
    const features = await db.getAllDpFreeFeatures();
    const found = features.find((f: any) => f.id === createdFeatureId);
    expect(found?.name).toBe("Updated Feature");
    expect(parseFloat(found?.listPrice ?? "0")).toBe(750);
  });

  it("should create a questionnaire question with options", async () => {
    const opts = JSON.stringify([
      { label: "Basic", value: "basic", description: "Standard finish" },
      { label: "Premium", value: "premium", description: "High-end finish" },
    ]);
    const result = await db.createDpQuestion({
      question: "What finish level are you looking for?",
      questionType: "single_choice",
      options: opts,
      isActive: 1,
      sortOrder: 99,
    });
    expect(result).toBeDefined();
    expect(result!.id).toBeGreaterThan(0);
    createdQuestionId = result!.id;
  });

  it("should retrieve all questionnaire questions including the new one", async () => {
    const questions = await db.getAllDpQuestions();
    expect(Array.isArray(questions)).toBe(true);
    const found = questions.find((q: any) => q.id === createdQuestionId);
    expect(found).toBeDefined();
    expect(found?.question).toBe("What finish level are you looking for?");
    expect(found?.questionType).toBe("single_choice");
  });

  it("should delete the test free feature", async () => {
    await db.deleteDpFreeFeature(createdFeatureId);
    const features = await db.getAllDpFreeFeatures();
    const found = features.find((f: any) => f.id === createdFeatureId);
    expect(found).toBeUndefined();
  });

  it("should delete the test questionnaire question", async () => {
    await db.deleteDpQuestion(createdQuestionId);
    const questions = await db.getAllDpQuestions();
    const found = questions.find((q: any) => q.id === createdQuestionId);
    expect(found).toBeUndefined();
  });
});
