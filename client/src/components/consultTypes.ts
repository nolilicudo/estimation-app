/**
 * Shared types for the Initial Consult wizard.
 * Kept in a separate file so non-component exports don't break Vite Fast Refresh.
 */

export interface PropertyData {
  formattedAddress?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  estimatedValue?: number;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  lotSize?: number;
  geocodedFallback?: boolean;
}

export interface ComparableHome {
  address: string;
  soldPrice: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  soldDate: string;
  distanceMiles: number;
  score: number;
  pricePerSqft: number;
  yearBuilt?: number;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface FinancialResults {
  renovation: {
    loanAmount?: number;
    monthlyLoanPayment: number;
    totalStayAndBuildMonthly: number;
    existingMonthlyHousing: number;
    addedMonthlyFromRenovation?: number;
  };
  sellMove: {
    netProceedsBeforeClosing: number;
    replacementHomePurchasePrice: number;
    monthlyPI: number;
    totalMonthlyHousingPayment: number;
    realtorFee: number;
    relocationCost: number;
    availableDownPayment: number;
    monthlyTaxes: number;
    monthlyInsurance: number;
    monthlyHOA: number;
    loanAmount: number;
    replacementHomeClosingCosts: number;
    totalTransactionCosts: number;
  };
  appreciation: Array<{
    year: number;
    stayValue: number;
    moveValue: number;
    stayAppreciation: number;
    moveAppreciation: number;
    difference: number;
  }>;
}

export interface CachedConsultState {
  step: number;
  completed: number[];
  addressInput: string;
  propertyData: PropertyData | null;
  homeValue: number;
  mortgageBalance: number;
  existingMortgagePI: number;
  propertyTaxesMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  additionalMonthly: number;
  additionSqft: number;
  additionBedrooms: number;
  additionBathrooms: number;
  additionKitchens: number;
  renovationBudget: number;
  projectedAfterValue: number;
  comparables: ComparableHome[];
  selectedComps: number[];
  cmaValue: number;
  manualCmaOverride: boolean;
  cashContribution: number;
  loanTermYears: number;
  mortgageRatePercent: number;
  loanRatePercent: number;
  realtorFeePct: number;
  relocationCostPct: number;
  closingCostPct: number;
  propertyTaxRatePct: number;
  replacementInsuranceAnnual: number;
  replacementHoaMonthly: number;
  appreciationRatePct: number;
  financialResults: FinancialResults | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

export function defaultCachedConsultState(): CachedConsultState {
  return {
    step: 1, completed: [],
    addressInput: "", propertyData: null,
    homeValue: 0, mortgageBalance: 0, existingMortgagePI: 0,
    propertyTaxesMonthly: 0, insuranceMonthly: 0, hoaMonthly: 0, additionalMonthly: 0,
    additionSqft: 0, additionBedrooms: 0, additionBathrooms: 0, additionKitchens: 0,
    renovationBudget: 0, projectedAfterValue: 0,
    comparables: [], selectedComps: [], cmaValue: 0, manualCmaOverride: false,
    cashContribution: 0, loanTermYears: 15,
    mortgageRatePercent: 7.0, loanRatePercent: 7.5,
    realtorFeePct: 6, relocationCostPct: 1, closingCostPct: 2,
    propertyTaxRatePct: 1.2, replacementInsuranceAnnual: 1800, replacementHoaMonthly: 0,
    appreciationRatePct: 4,
    financialResults: null,
    clientName: "", clientEmail: "", clientPhone: "",
  };
}

export interface ConsultHandoffData {
  /** Addition square footage from Step 2 */
  additionSqft: number;
  /** Bedrooms being added */
  additionBedrooms: number;
  /** Bathrooms being added */
  additionBathrooms: number;
  /** Kitchens being added */
  additionKitchens: number;
  /** Renovation budget entered in Step 2 */
  renovationBudget: number;
  /** Property address from Step 1 */
  propertyAddress: string;
  /** Estimated current home value */
  homeValue: number;
  /** Client name (if entered in Step 8 save form) */
  clientName: string;
  /** Client email */
  clientEmail: string;
  /** Client phone */
  clientPhone: string;
  /** Mortgage balance */
  mortgageBalance: number;
  /** Appreciation rate % used */
  appreciationRatePct: number;
  /** Loan rate % used */
  loanRatePercent: number;
  /** Loan term years */
  loanTermYears: number;
  /** Full financial results from the analysis */
  financialResults: {
    renovation: {
      loanAmount?: number;
      monthlyLoanPayment: number;
      totalStayAndBuildMonthly: number;
      existingMonthlyHousing: number;
      addedMonthlyFromRenovation?: number;
    };
    sellMove: {
      netProceedsBeforeClosing: number;
      replacementHomePurchasePrice: number;
      monthlyPI: number;
      totalMonthlyHousingPayment: number;
      realtorFee: number;
      relocationCost: number;
      availableDownPayment: number;
      monthlyTaxes: number;
      monthlyInsurance: number;
      monthlyHOA: number;
      loanAmount: number;
      replacementHomeClosingCosts: number;
      totalTransactionCosts: number;
    };
    appreciation: Array<{
      year: number;
      stayValue: number;
      moveValue: number;
      stayAppreciation: number;
      moveAppreciation: number;
      difference: number;
    }>;
  } | null;
}
