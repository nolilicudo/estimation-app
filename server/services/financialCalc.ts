/**
 * FinancialCalculationService
 * Pure calculation functions — no side effects, fully testable.
 */

export interface MortgagePaymentInput {
  principal: number;
  annualRatePercent: number;
  termYears: number;
}

/**
 * Standard fixed-payment mortgage formula.
 * Returns monthly principal + interest payment.
 */
export function calcMonthlyPayment(input: MortgagePaymentInput): number {
  const { principal, annualRatePercent, termYears } = input;
  if (principal <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export interface RenovationFundingInput {
  renovationBudget: number;
  cashContribution: number;
  loanRatePercent: number;
  loanTermYears: number;
  existingMortgagePI: number;
  propertyTaxesMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  additionalMonthly: number;
}

export interface RenovationFundingResult {
  loanAmount: number;
  monthlyLoanPayment: number;
  existingMonthlyHousing: number;
  totalStayAndBuildMonthly: number;
}

export function calcRenovationFunding(input: RenovationFundingInput): RenovationFundingResult {
  const loanAmount = Math.max(0, input.renovationBudget - input.cashContribution);
  const monthlyLoanPayment = calcMonthlyPayment({
    principal: loanAmount,
    annualRatePercent: input.loanRatePercent,
    termYears: input.loanTermYears,
  });
  const totalStayAndBuildMonthly =
    input.existingMortgagePI +
    monthlyLoanPayment +
    input.propertyTaxesMonthly +
    input.insuranceMonthly +
    input.hoaMonthly +
    input.additionalMonthly;
  const existingMonthlyHousing =
    input.existingMortgagePI +
    input.propertyTaxesMonthly +
    input.insuranceMonthly +
    input.hoaMonthly +
    input.additionalMonthly;
  return { loanAmount, monthlyLoanPayment, existingMonthlyHousing, totalStayAndBuildMonthly };
}

export interface SellMoveInput {
  currentHomeValue: number;
  mortgageBalance: number;
  marketRatePercent: number; // Freddie Mac 30-yr fixed
  targetMonthlyBudget: number; // = totalStayAndBuildMonthly
  realtorFeePct: number; // default 6
  relocationCostPct: number; // default 1
  closingCostPct: number; // default 2
  propertyTaxRatePercent: number; // annual property tax rate for replacement home (default 1.2%)
  insuranceAnnual: number; // annual insurance estimate for replacement home
  hoaMonthly: number;
}

export interface SellMoveResult {
  salePrice: number;
  realtorFee: number;
  relocationCost: number;
  mortgagePayoff: number;
  netProceedsBeforeClosing: number;
  replacementHomePurchasePrice: number;
  replacementHomeClosingCosts: number;
  availableDownPayment: number;
  loanAmount: number;
  monthlyPI: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyHOA: number;
  totalMonthlyHousingPayment: number;
  totalTransactionCosts: number;
}

/**
 * Algebraically solve for the replacement home price.
 *
 * Let P = replacement home price.
 * Closing costs = P × closingCostPct
 * Available down payment = netProceedsBeforeClosing − P × closingCostPct  (clamped ≥ 0)
 * Loan amount = P − availableDownPayment
 * Monthly PI = calcMonthlyPayment(loan, marketRate, 30yr)
 * Monthly taxes = P × propertyTaxRatePercent / 100 / 12
 * Monthly insurance = insuranceAnnual / 12
 * Monthly HOA = hoaMonthly
 * Total monthly = PI + taxes + insurance + HOA ≤ targetMonthlyBudget
 *
 * We use binary search because the relationship is monotone.
 */
export function calcSellMove(input: SellMoveInput): SellMoveResult {
  const {
    currentHomeValue,
    mortgageBalance,
    marketRatePercent,
    targetMonthlyBudget,
    realtorFeePct,
    relocationCostPct,
    closingCostPct,
    propertyTaxRatePercent,
    insuranceAnnual,
    hoaMonthly,
  } = input;

  const salePrice = currentHomeValue;
  const realtorFee = salePrice * (realtorFeePct / 100);
  const relocationCost = salePrice * (relocationCostPct / 100);
  const mortgagePayoff = mortgageBalance;
  const netProceedsBeforeClosing = salePrice - mortgagePayoff - realtorFee - relocationCost;

  const monthlyInsurance = insuranceAnnual / 12;
  const fixedMonthly = monthlyInsurance + hoaMonthly;
  const availableBudgetForPIAndTax = targetMonthlyBudget - fixedMonthly;

  // Binary search for max affordable replacement home price
  let lo = 0;
  let hi = 5_000_000;
  let bestP = 0;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const closingCosts = mid * (closingCostPct / 100);
    const downPayment = Math.max(0, netProceedsBeforeClosing - closingCosts);
    const loan = Math.max(0, mid - downPayment);
    const pi = calcMonthlyPayment({ principal: loan, annualRatePercent: marketRatePercent, termYears: 30 });
    const taxes = (mid * (propertyTaxRatePercent / 100)) / 12;
    const total = pi + taxes;
    if (total <= availableBudgetForPIAndTax) {
      bestP = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const replacementHomePurchasePrice = Math.round(bestP);
  const replacementHomeClosingCosts = replacementHomePurchasePrice * (closingCostPct / 100);
  const availableDownPayment = Math.max(0, netProceedsBeforeClosing - replacementHomeClosingCosts);
  const loanAmount = Math.max(0, replacementHomePurchasePrice - availableDownPayment);
  const monthlyPI = calcMonthlyPayment({ principal: loanAmount, annualRatePercent: marketRatePercent, termYears: 30 });
  const monthlyTaxes = (replacementHomePurchasePrice * (propertyTaxRatePercent / 100)) / 12;
  const totalMonthlyHousingPayment = monthlyPI + monthlyTaxes + monthlyInsurance + hoaMonthly;
  const totalTransactionCosts = realtorFee + relocationCost + replacementHomeClosingCosts;

  return {
    salePrice,
    realtorFee,
    relocationCost,
    mortgagePayoff,
    netProceedsBeforeClosing,
    replacementHomePurchasePrice,
    replacementHomeClosingCosts,
    availableDownPayment,
    loanAmount,
    monthlyPI,
    monthlyTaxes,
    monthlyInsurance,
    monthlyHOA: hoaMonthly,
    totalMonthlyHousingPayment,
    totalTransactionCosts,
  };
}

export interface AppreciationInput {
  stayHomeValue: number;
  moveHomeValue: number;
  annualRatePercent: number;
  years: number[];
}

export interface AppreciationPoint {
  year: number;
  stayValue: number;
  moveValue: number;
  stayAppreciation: number;
  moveAppreciation: number;
  difference: number;
}

export function calcAppreciation(input: AppreciationInput): AppreciationPoint[] {
  const { stayHomeValue, moveHomeValue, annualRatePercent, years } = input;
  const r = annualRatePercent / 100;
  return years.map((y) => {
    const stayValue = stayHomeValue * Math.pow(1 + r, y);
    const moveValue = moveHomeValue * Math.pow(1 + r, y);
    return {
      year: y,
      stayValue: Math.round(stayValue),
      moveValue: Math.round(moveValue),
      stayAppreciation: Math.round(stayValue - stayHomeValue),
      moveAppreciation: Math.round(moveValue - moveHomeValue),
      difference: Math.round(stayValue - moveValue),
    };
  });
}

export interface ComparableHome {
  address: string;
  soldPrice: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: string;
  soldDate: string;
  distanceMiles: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  similarityScore?: number;
  similarityReason?: string;
}

export interface ScoredComparable extends ComparableHome {
  similarityScore: number;
  pricePerSqft: number;
  similarityReason: string;
}

export interface CMAInput {
  projectedSqft: number;
  projectedBedrooms: number;
  projectedBathrooms: number;
  propertyType: string;
  lotSize?: number;
  yearBuilt?: number;
  comparables: ComparableHome[];
}

/**
 * Score each comparable using the weighted similarity formula.
 * Returns sorted list (highest score first).
 */
export function scoreComparables(input: CMAInput): ScoredComparable[] {
  const { projectedSqft, projectedBedrooms, projectedBathrooms, propertyType, comparables } = input;

  // Normalize distances for scoring (0–1 scale based on max distance in set)
  const maxDist = Math.max(...comparables.map((c) => c.distanceMiles), 0.01);
  const now = Date.now();

  return comparables
    .map((c): ScoredComparable => {
      // 35% — square footage similarity
      const sqftDiff = Math.abs(c.squareFootage - projectedSqft) / projectedSqft;
      const sqftScore = Math.max(0, 1 - sqftDiff / 0.3); // 0% diff = 1.0, 30%+ diff = 0

      // 20% — distance (closer = better)
      const distScore = 1 - c.distanceMiles / maxDist;

      // 15% — sale recency (within 6 months = 1.0, 12 months = 0.5, older = 0)
      const soldMs = new Date(c.soldDate).getTime();
      const ageMonths = (now - soldMs) / (1000 * 60 * 60 * 24 * 30);
      const recencyScore = ageMonths <= 6 ? 1.0 : ageMonths <= 12 ? 0.5 : Math.max(0, 1 - ageMonths / 24);

      // 10% — bedroom similarity
      const bedDiff = Math.abs(c.bedrooms - projectedBedrooms);
      const bedScore = bedDiff === 0 ? 1 : bedDiff === 1 ? 0.5 : 0;

      // 10% — bathroom similarity
      const bathDiff = Math.abs(c.bathrooms - projectedBathrooms);
      const bathScore = bathDiff === 0 ? 1 : bathDiff <= 0.5 ? 0.75 : bathDiff <= 1 ? 0.5 : 0;

      // 5% — property type match
      const typeScore = c.propertyType?.toLowerCase() === propertyType?.toLowerCase() ? 1 : 0;

      // 5% — lot size similarity (if available)
      const lotScore = input.lotSize && c.lotSize
        ? Math.max(0, 1 - Math.abs(c.lotSize - input.lotSize) / input.lotSize / 0.5)
        : 0.5; // neutral when unavailable

      const similarityScore =
        sqftScore * 0.35 +
        distScore * 0.20 +
        recencyScore * 0.15 +
        bedScore * 0.10 +
        bathScore * 0.10 +
        typeScore * 0.05 +
        lotScore * 0.05;

      const reasons: string[] = [];
      if (sqftScore > 0.7) reasons.push("similar size");
      if (distScore > 0.7) reasons.push("nearby");
      if (recencyScore >= 1) reasons.push("sold recently");
      if (bedScore === 1) reasons.push("same bedrooms");
      if (bathScore === 1) reasons.push("same bathrooms");
      if (typeScore === 1) reasons.push("same property type");

      return {
        ...c,
        similarityScore: Math.round(similarityScore * 100) / 100,
        pricePerSqft: Math.round((c.soldPrice / c.squareFootage) * 100) / 100,
        similarityReason: reasons.length > 0 ? reasons.join(", ") : "general match",
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

export interface CMAResult {
  estimatedValue: number;
  lowValue: number;
  highValue: number;
  confidence: "high" | "medium" | "low";
  comparablesUsed: number;
  newestSaleDate: string;
  oldestSaleDate: string;
  weightedPricePerSqft: number;
}

/**
 * Weighted price-per-sqft CMA estimate using top comparables.
 */
export function calcCMAValue(projectedSqft: number, comparables: ScoredComparable[]): CMAResult {
  if (comparables.length === 0) {
    return {
      estimatedValue: 0,
      lowValue: 0,
      highValue: 0,
      confidence: "low",
      comparablesUsed: 0,
      newestSaleDate: "",
      oldestSaleDate: "",
      weightedPricePerSqft: 0,
    };
  }

  const totalScore = comparables.reduce((s, c) => s + c.similarityScore, 0);
  const weightedPPSF = comparables.reduce((s, c) => s + (c.pricePerSqft * c.similarityScore) / totalScore, 0);
  const estimatedValue = Math.round(weightedPPSF * projectedSqft);

  // Low/high: ±10% for high confidence, ±15% for medium, ±20% for low
  const confidence: "high" | "medium" | "low" =
    comparables.length >= 3 && comparables[0].similarityScore >= 0.7
      ? "high"
      : comparables.length >= 2
      ? "medium"
      : "low";
  const spread = confidence === "high" ? 0.10 : confidence === "medium" ? 0.15 : 0.20;

  const soldDates = comparables.map((c) => c.soldDate).sort();

  return {
    estimatedValue,
    lowValue: Math.round(estimatedValue * (1 - spread)),
    highValue: Math.round(estimatedValue * (1 + spread)),
    confidence,
    comparablesUsed: comparables.length,
    newestSaleDate: soldDates[soldDates.length - 1] ?? "",
    oldestSaleDate: soldDates[0] ?? "",
    weightedPricePerSqft: Math.round(weightedPPSF * 100) / 100,
  };
}
