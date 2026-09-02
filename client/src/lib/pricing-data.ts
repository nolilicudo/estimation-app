/**
 * Tanzite Stone Decking Pricing Data
 * Design Your Price — Orem, Utah
 *
 * Mountain Modern Design: warm earth tones, canyon rust accents, stone textures
 * Pricing sourced from tanzite.com as of 2025/2026
 */

export type Collection = "rainier" | "appalachian";

export interface ColorOption {
  id: string;
  name: string;
  hex: string; // representative color for the swatch
  pricePerSqft: number;
}

export interface AccessoryItem {
  id: string;
  name: string;
  unit: string; // "sqft" | "linear_ft" | "each"
  pricePerUnit: number;
  description: string;
  requiredFor?: Collection[];
  isOptional: boolean;
  showInScope?: boolean;
}

export interface CollectionInfo {
  id: Collection;
  name: string;
  description: string;
  features: string[];
  colors: ColorOption[];
  image: string;
}

// Rainier Collection Colors & Pricing
const rainierColors: ColorOption[] = [
  { id: "aged-teak", name: "Aged Teak", hex: "#8B7355", pricePerSqft: 11.95 },
  { id: "american-walnut", name: "American Walnut", hex: "#5C4033", pricePerSqft: 12.23 },
  { id: "carrara-marble", name: "Carrara Marble", hex: "#D4D2CF", pricePerSqft: 11.95 },
  { id: "sierra-grey", name: "Sierra Grey", hex: "#9E9E9E", pricePerSqft: 11.95 },
  { id: "slate-black", name: "Slate Black", hex: "#3D3D3D", pricePerSqft: 12.23 },
  { id: "driftwood", name: "Driftwood", hex: "#A89F91", pricePerSqft: 11.95 },
  { id: "travertine", name: "Travertine", hex: "#C8B99A", pricePerSqft: 11.95 },
  { id: "canyon-brown", name: "Canyon Brown", hex: "#7B5B3A", pricePerSqft: 11.95 },
];

// Appalachian Collection V2 Colors & Pricing
const appalachianColors: ColorOption[] = [
  { id: "white-ash", name: "White Ash", hex: "#C8BEB0", pricePerSqft: 10.99 },
  { id: "american-walnut-app", name: "American Walnut", hex: "#5C4033", pricePerSqft: 10.99 },
  { id: "aged-teak-app", name: "Aged Teak", hex: "#8B7355", pricePerSqft: 10.99 },
  { id: "silver-maple", name: "Silver Maple", hex: "#B0A898", pricePerSqft: 10.99 },
  { id: "driftwood-app", name: "Driftwood", hex: "#A89F91", pricePerSqft: 10.99 },
];

export const collections: CollectionInfo[] = [
  {
    id: "rainier",
    name: "Rainier Collection",
    description:
      "Waterproof stone decking system with free-floating installation. Perfect for both indoor and outdoor settings with EPDM membrane waterproofing.",
    features: [
      "Waterproof installation",
      "Free-floating system",
      "Indoor & outdoor use",
      "EPDM membrane included",
      "8 color options",
    ],
    colors: rainierColors,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/rainier-showcase-nuMkxWfFrs2SZqW9tKKMJs.webp",
  },
  {
    id: "appalachian",
    name: "Appalachian Collection",
    description:
      "Hidden fastener stone decking system installed directly against the deck frame. No visible screws for a clean, seamless look.",
    features: [
      "Hidden fastener system",
      "No visible screws",
      "Direct frame installation",
      "Clean seamless look",
      "5 color options",
    ],
    colors: appalachianColors,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/appalachian-showcase-kgKo6qqGNxKY5xXDq3b35L.webp",
  },
];

// Accessories & Hardware
export const accessories: AccessoryItem[] = [
  {
    id: "grooved-clips",
    name: "Grooved Clips & Fasteners",
    unit: "sqft",
    pricePerUnit: 0.74,
    description: "Required clips for grooved board installation",
    isOptional: false,
  },
  {
    id: "starter-clip",
    name: "Starter Clip & Fastener",
    unit: "sqft",
    pricePerUnit: 0.80,
    description: "Starting clips for first board row",
    isOptional: false,
  },
  {
    id: "edge-clip",
    name: "Edge Clip & Fastener",
    unit: "sqft",
    pricePerUnit: 0.80,
    description: "Clips for edge board finishing",
    isOptional: false,
  },
  {
    id: "joist-tape",
    name: "Joist Tape",
    unit: "sqft",
    pricePerUnit: 0.44,
    description: "Protective tape for joist surfaces",
    isOptional: false,
  },
  {
    id: "epdm-membrane",
    name: "EPDM Membrane",
    unit: "sqft",
    pricePerUnit: 1.50,
    description: "Waterproofing membrane (Rainier only)",
    requiredFor: ["rainier"],
    isOptional: false,
  },
  {
    id: "diamond-blade",
    name: "Diamond Blade",
    unit: "each",
    pricePerUnit: 35.00,
    description: "For cutting stone tiles to size",
    isOptional: true,
  },
  {
    id: "sanding-pad",
    name: "Stone Sanding Pad",
    unit: "each",
    pricePerUnit: 15.00,
    description: "For smoothing cut edges",
    isOptional: true,
  },
];

// Edge finishing options
export interface EdgeOption {
  id: string;
  name: string;
  pricePerLinearFt: number;
  collection: Collection;
}

export const edgeOptions: EdgeOption[] = [
  // Rainier edges
  { id: "bullnose-standard", name: "Standard Bullnose Blocks", pricePerLinearFt: 24.98, collection: "rainier" },
  { id: "aluminium-edge", name: "Aluminium Edge Restraint", pricePerLinearFt: 5.00, collection: "rainier" },
  { id: "no-edge-rainier", name: "No Edge Finishing", pricePerLinearFt: 0, collection: "rainier" },
  // Appalachian edges
  { id: "standard-edge-board", name: "Standard Edge Boards", pricePerLinearFt: 10.99, collection: "appalachian" },
  { id: "corner-edge-board", name: "Corner Edge Boards", pricePerLinearFt: 18.74, collection: "appalachian" },
  { id: "no-edge-app", name: "No Edge Finishing", pricePerLinearFt: 0, collection: "appalachian" },
];

// Installation labor rates (Utah market)
export interface LaborLineItem {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  unit: 'flat' | 'sqft' | 'linear_ft';
  sortOrder: number;
}

export interface LaborTier {
  id: string;
  dbId?: number;
  name: string;
  description: string;
  pricePerSqft: number;
  laborCostPerSqft?: number;
  marginPercent?: number;
  minimumPrice?: number;
  collectionSlug?: string | null;
  lineItems?: LaborLineItem[];
}

export const laborTiers: LaborTier[] = [
  {
    id: "materials-only",
    name: "Materials Only",
    description: "DIY — materials and accessories only, no installation labor",
    pricePerSqft: 0,
  },
  {
    id: "basic",
    name: "Basic Installation",
    description: "Standard deck surface installation on existing frame",
    pricePerSqft: 8,
  },
  {
    id: "standard",
    name: "Standard Installation",
    description: "Surface installation with edge finishing and minor prep work",
    pricePerSqft: 12,
  },
  {
    id: "premium",
    name: "Premium Installation",
    description: "Full installation including framing, substrate prep, and finishing",
    pricePerSqft: 18,
  },
  {
    id: "complex",
    name: "Complex / Multi-Level",
    description: "Multi-level decks, stairs, custom patterns, and full build-out",
    pricePerSqft: 25,
  },
];

// Utah tax rate for Orem
export const UTAH_TAX_RATE = 0.0745; // 7.45%

// Default waste factor
export const DEFAULT_WASTE_FACTOR = 10; // percent

// Stair pricing
export const STAIR_TREAD_PRICE_PER_SQFT = 14.00; // average for stair treads
export const STAIR_RISER_PRICE_PER_LINEAR_FT = 12.00;

// Delivery fee tiers
export interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const deliveryOptions: DeliveryOption[] = [
  { id: "pickup", name: "Customer Pickup", price: 0, description: "Pick up from our Orem, UT location" },
  { id: "local", name: "Local Delivery (Utah County)", price: 150, description: "Delivery within Utah County" },
  { id: "wasatch", name: "Wasatch Front Delivery", price: 250, description: "Salt Lake, Davis, Weber counties" },
  { id: "statewide", name: "Statewide Delivery", price: 450, description: "Anywhere in Utah" },
];
