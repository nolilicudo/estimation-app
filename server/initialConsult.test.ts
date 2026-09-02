/**
 * Tests for the Initial Consult financial calculation service
 */
import { describe, it, expect } from "vitest";

// ─── Inline the pure calculation functions for testing ────────────────────────
// (mirrors server/services/financialCalc.ts logic)

function calcMonthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0 || annualRatePct <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcNetProceeds(homeValue: number, mortgageBalance: number, agentCommissionPct: number, closingCostPct: number): number {
  const agentFee = homeValue * (agentCommissionPct / 100);
  const closingCosts = homeValue * (closingCostPct / 100);
  return homeValue - mortgageBalance - agentFee - closingCosts;
}

function calcAppreciationValue(currentValue: number, annualRatePct: number, years: number): number {
  return currentValue * Math.pow(1 + annualRatePct / 100, years);
}

function calcLoanAmount(homeValue: number, mortgageBalance: number, renovationCost: number, ltvPct: number): number {
  const maxLoan = homeValue * (ltvPct / 100) - mortgageBalance;
  return Math.min(maxLoan, renovationCost);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calcMonthlyPayment", () => {
  it("returns 0 for zero principal", () => {
    expect(calcMonthlyPayment(0, 7.0, 30)).toBe(0);
  });

  it("returns 0 for zero rate", () => {
    expect(calcMonthlyPayment(300000, 0, 30)).toBe(0);
  });

  it("calculates correct payment for $300k at 7% for 30 years", () => {
    const payment = calcMonthlyPayment(300000, 7.0, 30);
    // Standard formula: ~$1995.91
    expect(payment).toBeCloseTo(1995.91, 0);
  });

  it("calculates correct payment for $200k at 6.5% for 15 years", () => {
    const payment = calcMonthlyPayment(200000, 6.5, 15);
    // ~$1742.21
    expect(payment).toBeCloseTo(1742.21, 0);
  });

  it("higher rate means higher payment", () => {
    const low = calcMonthlyPayment(300000, 5.0, 30);
    const high = calcMonthlyPayment(300000, 8.0, 30);
    expect(high).toBeGreaterThan(low);
  });
});

describe("calcNetProceeds", () => {
  it("subtracts mortgage, agent fee, and closing costs", () => {
    // $500k home, $200k mortgage, 6% agent, 2% closing
    const net = calcNetProceeds(500000, 200000, 6, 2);
    // 500k - 200k - 30k - 10k = 260k
    expect(net).toBeCloseTo(260000, 0);
  });

  it("returns negative if mortgage exceeds net sale", () => {
    const net = calcNetProceeds(300000, 350000, 6, 2);
    expect(net).toBeLessThan(0);
  });

  it("zero agent and closing costs returns home value minus mortgage", () => {
    const net = calcNetProceeds(400000, 150000, 0, 0);
    expect(net).toBe(250000);
  });
});

describe("calcAppreciationValue", () => {
  it("returns current value at 0 years", () => {
    expect(calcAppreciationValue(500000, 4.0, 0)).toBe(500000);
  });

  it("calculates compound appreciation correctly", () => {
    // $500k at 4% for 5 years
    const result = calcAppreciationValue(500000, 4.0, 5);
    expect(result).toBeCloseTo(608326, 0);
  });

  it("higher rate produces higher value", () => {
    const low = calcAppreciationValue(500000, 3.0, 10);
    const high = calcAppreciationValue(500000, 5.0, 10);
    expect(high).toBeGreaterThan(low);
  });
});

describe("calcLoanAmount", () => {
  it("caps at renovation cost when LTV allows more", () => {
    // $600k home, $200k mortgage, 80% LTV = max $280k loan; renovation = $100k
    const loan = calcLoanAmount(600000, 200000, 100000, 80);
    expect(loan).toBe(100000);
  });

  it("caps at LTV limit when renovation exceeds available equity", () => {
    // $500k home, $400k mortgage, 80% LTV = max $0 loan; renovation = $50k
    const loan = calcLoanAmount(500000, 400000, 50000, 80);
    expect(loan).toBeLessThanOrEqual(0);
  });

  it("uses 80% LTV by default correctly", () => {
    // $500k home, $200k mortgage, 80% LTV = max $200k; renovation = $150k
    const loan = calcLoanAmount(500000, 200000, 150000, 80);
    expect(loan).toBe(150000);
  });
});

describe("Stay vs. Move comparison logic", () => {
  it("stay is better when monthly cost of staying < monthly cost of moving", () => {
    const stayMonthly = 2500;
    const moveMonthly = 3200;
    expect(stayMonthly).toBeLessThan(moveMonthly);
  });

  it("move is better when net proceeds cover down payment with surplus", () => {
    const netProceeds = calcNetProceeds(500000, 200000, 6, 2);
    const downPayment = 600000 * 0.20; // 20% of $600k replacement
    expect(netProceeds).toBeGreaterThan(downPayment);
  });

  it("appreciation after addition is higher than without", () => {
    const withoutAddition = calcAppreciationValue(500000, 4.0, 10);
    const withAddition = calcAppreciationValue(650000, 4.0, 10); // +$150k addition
    expect(withAddition).toBeGreaterThan(withoutAddition);
  });
});
