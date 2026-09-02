/**
 * seed-questionnaire-sections.mjs
 *
 * Replaces all existing questionnaire_questions and questionnaire_options with
 * the full 10-section Design Package questionnaire structure.
 *
 * Sections:
 *  1. project_basics
 *  2. existing_conditions
 *  3. site_access
 *  4. structure_foundation_roof
 *  5. mechanical_electrical_plumbing
 *  6. exterior_finishes
 *  7. interior_finishes
 *  8. trade_upgrades
 *  9. overall_finish_level
 * 10. photos_inspiration
 *
 * Run: node scripts/seed-questionnaire-sections.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// CDN URLs for tier images (compressed webp)
const TIER_IMAGES = {
  flooring: [
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/flooring-tier1-Nn3J3s7VqJVxKTKPf66t9J.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/flooring-tier2-fMaQPXWNNi2mjfPenBKrjN.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/flooring-tier3-WAJVy3VkumywdMU5Apoi2B.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/flooring-tier4-Ed6nAeR2UppCKtW5QaZmST.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/flooring-tier5-bVvYrvn9ayzfHcBEpuT27Y.webp",
  ],
  bathroom: [
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/bathroom-tier1-2Nfr58RMgyibiKQc5LGZDN.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/bathroom-tier2-XQofBKuVXb2abPzUx9G6a6.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/bathroom-tier3-D8pPVmnQb4pjSSqim5fj9z.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/bathroom-tier4-LPRbZtnHe4Tz8LGMWD4Cpd.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/bathroom-tier5-aRA4TPJVEgLifLxdASuLu8.webp",
  ],
  kitchen: [
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/kitchen-tier1-bLTMeDG7dPZio3Ci7bWwF7.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/kitchen-tier2-BtkK79QtSjqmXM2JaEUdDP.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/kitchen-tier3-nxvnjiNd3HQmTLt92yZA64.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/kitchen-tier4-m6gLsUubhtvxYdQkaJuach.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/kitchen-tier5-RftHHNSF9N5eZDUCPw9GC8.webp",
  ],
  exterior: [
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/exterior-tier1-gK7ps3ZShKeyMUG8MakocA.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/exterior-tier2-dj6YLHgDf8CxGffVHihouE.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/exterior-tier3-g5huo9DKCaxv4hCiwbJvc2.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/exterior-tier4-Z9ueLXAvQqND8PJv92y2Tx.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/exterior-tier5-GtVJSNmx9coWwT3oWTkK7c.webp",
  ],
};

// Helper: build tier options for a visual-choice question
function tierOptions(category, labels, subtexts, priceAdj) {
  return labels.map((label, i) => ({
    text: label,
    subtext: subtexts[i] || "",
    imageUrl: TIER_IMAGES[category][i],
    sortOrder: i + 1,
    priceAdjustment: priceAdj[i] || 0,
    priceAdjustmentType: "flat",
    pricingTier: i + 1,
  }));
}

// Full question structure
const SECTIONS = [
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: PROJECT BASICS
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "project_basics",
    questions: [
      {
        text: "What type of project are you planning?",
        subtext: "Select the primary scope of work.",
        type: "single",
        inputType: "options",
        sortOrder: 10,
        options: [
          { text: "Home Addition", subtext: "Adding square footage to the existing home", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Full Home Remodel", subtext: "Major renovation of most or all rooms", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Kitchen Remodel", subtext: "Kitchen-focused renovation", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Bathroom Remodel", subtext: "Bathroom-focused renovation", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Basement Finish", subtext: "Finishing an unfinished basement", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "ADU / Guest Suite", subtext: "Accessory dwelling unit or in-law suite", sortOrder: 6, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "What is the approximate square footage of the project area?",
        subtext: "For additions, this is the new square footage being added. For remodels, this is the area being renovated.",
        type: "single",
        inputType: "number",
        sortOrder: 20,
        options: [],
      },
      {
        text: "Which rooms will be included in this project?",
        subtext: "Select all that apply.",
        type: "multi",
        inputType: "checkboxes",
        dropdownOptions: ["Kitchen", "Primary Bathroom", "Secondary Bathroom", "Living Room", "Dining Room", "Bedroom(s)", "Laundry Room", "Mudroom / Entry", "Home Office", "Basement", "Garage", "Outdoor Living Space"],
        sortOrder: 30,
        options: [],
      },
      {
        text: "What is your target timeline to start construction?",
        subtext: "This helps us prioritize the design schedule.",
        type: "single",
        inputType: "options",
        sortOrder: 40,
        options: [
          { text: "ASAP (within 1–2 months)", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "3–6 months", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "6–12 months", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "12+ months / just planning", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "What is your approximate construction budget range?",
        subtext: "This helps us design to the right scope and material level.",
        type: "single",
        inputType: "options",
        sortOrder: 50,
        options: [
          { text: "Under $100,000", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "$100,000 – $250,000", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "$250,000 – $500,000", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "$500,000 – $1,000,000", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Over $1,000,000", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure yet", sortOrder: 6, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: EXISTING HOME CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "existing_conditions",
    questions: [
      {
        text: "Approximately when was your home built?",
        subtext: "Older homes may have different structural, electrical, and plumbing requirements.",
        type: "single",
        inputType: "options",
        sortOrder: 110,
        options: [
          { text: "Before 1950", sortOrder: 1, priceAdjustment: 5000, priceAdjustmentType: "flat" },
          { text: "1950–1979", sortOrder: 2, priceAdjustment: 2500, priceAdjustmentType: "flat" },
          { text: "1980–1999", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "2000–2015", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "2016 or newer", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure", sortOrder: 6, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "What is the foundation type of your home?",
        subtext: "This affects how we design the addition connection and structural support.",
        type: "single",
        inputType: "options",
        sortOrder: 120,
        options: [
          { text: "Full basement", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Crawl space", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Slab on grade", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Combination / not sure", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "What is the ceiling height in the existing area being remodeled?",
        subtext: "Standard is 8 ft. Taller ceilings affect material quantities and labor.",
        type: "single",
        inputType: "options",
        sortOrder: 130,
        options: [
          { text: "8 ft (standard)", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "9 ft", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "10 ft or taller", sortOrder: 3, priceAdjustment: 2000, priceAdjustmentType: "flat" },
          { text: "Vaulted / cathedral", sortOrder: 4, priceAdjustment: 4000, priceAdjustmentType: "flat" },
          { text: "Not sure", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Are there any known existing issues with the home?",
        subtext: "Select all that apply. These may need to be addressed before or during the project.",
        type: "multi",
        inputType: "checkboxes",
        dropdownOptions: ["Water damage or moisture issues", "Mold or mildew", "Outdated knob-and-tube wiring", "Asbestos (suspected or confirmed)", "Lead paint", "Settling or foundation cracks", "Pest damage", "None known"],
        sortOrder: 140,
        options: [],
      },
      {
        text: "Will any walls need to be removed or relocated?",
        subtext: "Load-bearing wall removal requires structural engineering.",
        type: "single",
        inputType: "options",
        sortOrder: 150,
        options: [
          { text: "Yes — load-bearing walls", sortOrder: 1, priceAdjustment: 8000, priceAdjustmentType: "flat" },
          { text: "Yes — non-load-bearing walls only", sortOrder: 2, priceAdjustment: 2000, priceAdjustmentType: "flat" },
          { text: "No wall changes needed", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure yet", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: SITE & ACCESS
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "site_access",
    questions: [
      {
        text: "How would you describe access to the project area from the street or yard?",
        subtext: "Difficult access can increase labor and material delivery costs.",
        type: "single",
        inputType: "options",
        sortOrder: 210,
        options: [
          { text: "Easy — wide open access", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Moderate — some obstacles (fence, gate, narrow path)", sortOrder: 2, priceAdjustment: 1500, priceAdjustmentType: "flat" },
          { text: "Difficult — steep slope, very narrow, or restricted", sortOrder: 3, priceAdjustment: 4000, priceAdjustmentType: "flat" },
        ],
      },
      {
        text: "Is the project site on a slope or hillside?",
        subtext: "Sloped sites may require additional grading, retaining walls, or engineered foundations.",
        type: "single",
        inputType: "options",
        sortOrder: 220,
        options: [
          { text: "Flat or nearly flat", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Gentle slope", sortOrder: 2, priceAdjustment: 2000, priceAdjustmentType: "flat" },
          { text: "Moderate slope", sortOrder: 3, priceAdjustment: 5000, priceAdjustmentType: "flat" },
          { text: "Steep hillside", sortOrder: 4, priceAdjustment: 12000, priceAdjustmentType: "flat" },
        ],
      },
      {
        text: "Are there known utility lines (gas, electric, water, sewer) in the project area?",
        subtext: "Underground utilities must be located before excavation.",
        type: "single",
        inputType: "options",
        sortOrder: 230,
        options: [
          { text: "Yes — locations are known", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Possibly — not sure of locations", sortOrder: 2, priceAdjustment: 500, priceAdjustmentType: "flat" },
          { text: "No utilities in the area", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Are there any HOA restrictions or design review requirements?",
        subtext: "HOA approvals can affect timeline and design options.",
        type: "single",
        inputType: "options",
        sortOrder: 240,
        options: [
          { text: "Yes — HOA approval required", sortOrder: 1, priceAdjustment: 1000, priceAdjustmentType: "flat" },
          { text: "No HOA", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: STRUCTURE / FOUNDATION / ROOF
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "structure_foundation_roof",
    questions: [
      {
        text: "What type of roof does your existing home have?",
        subtext: "The addition roof must tie into or match the existing roof system.",
        type: "single",
        inputType: "options",
        sortOrder: 310,
        options: [
          { text: "Gable (peaked, triangular ends)", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Hip (slopes on all four sides)", sortOrder: 2, priceAdjustment: 2000, priceAdjustmentType: "flat" },
          { text: "Flat or low-slope", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Complex / multiple roof lines", sortOrder: 4, priceAdjustment: 4000, priceAdjustmentType: "flat" },
          { text: "Not sure", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "What is the existing roofing material?",
        subtext: "New work should match or complement the existing roof.",
        type: "single",
        inputType: "options",
        sortOrder: 320,
        options: [
          { text: "Asphalt shingles", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Metal (standing seam or corrugated)", sortOrder: 2, priceAdjustment: 3000, priceAdjustmentType: "flat" },
          { text: "Tile (clay or concrete)", sortOrder: 3, priceAdjustment: 4000, priceAdjustmentType: "flat" },
          { text: "Cedar shake or wood shingles", sortOrder: 4, priceAdjustment: 2000, priceAdjustmentType: "flat" },
          { text: "TPO / EPDM (flat roof membrane)", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure", sortOrder: 6, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Will new foundation work be required?",
        subtext: "Additions typically require new footings. Remodels may not.",
        type: "single",
        inputType: "options",
        sortOrder: 330,
        options: [
          { text: "Yes — new addition requires new foundation", sortOrder: 1, priceAdjustment: 15000, priceAdjustmentType: "flat" },
          { text: "No — remodel only, no new foundation", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Is the project a second-story addition?",
        subtext: "Second-story additions require structural review of the existing first-floor framing.",
        type: "single",
        inputType: "options",
        sortOrder: 340,
        options: [
          { text: "Yes — adding a second story", sortOrder: 1, priceAdjustment: 20000, priceAdjustmentType: "flat" },
          { text: "No — single story or interior remodel", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: MECHANICAL, ELECTRICAL & PLUMBING
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "mechanical_electrical_plumbing",
    questions: [
      {
        text: "What is the size of your existing electrical panel?",
        subtext: "Larger projects may require a panel upgrade to support new loads.",
        type: "single",
        inputType: "options",
        sortOrder: 410,
        options: [
          { text: "100 amp", sortOrder: 1, priceAdjustment: 3500, priceAdjustmentType: "flat" },
          { text: "150 amp", sortOrder: 2, priceAdjustment: 1500, priceAdjustmentType: "flat" },
          { text: "200 amp", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "400 amp (or sub-panel)", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "What type of heating and cooling system does your home currently have?",
        subtext: "This determines how we extend HVAC to the new space.",
        type: "single",
        inputType: "options",
        sortOrder: 420,
        options: [
          { text: "Forced air (furnace + ducts)", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Boiler / radiant heat", sortOrder: 2, priceAdjustment: 2000, priceAdjustmentType: "flat" },
          { text: "Mini-split / ductless", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Heat pump", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "No central HVAC (window units / space heaters)", sortOrder: 5, priceAdjustment: 5000, priceAdjustmentType: "flat" },
          { text: "Not sure", sortOrder: 6, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Will the project include new plumbing fixtures (sinks, toilets, showers, etc.)?",
        subtext: "New plumbing requires routing to existing supply and drain lines.",
        type: "single",
        inputType: "options",
        sortOrder: 430,
        options: [
          { text: "Yes — multiple new fixtures", sortOrder: 1, priceAdjustment: 8000, priceAdjustmentType: "flat" },
          { text: "Yes — one or two fixtures", sortOrder: 2, priceAdjustment: 3000, priceAdjustmentType: "flat" },
          { text: "No new plumbing fixtures", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Is there a gas line in the home?",
        subtext: "Gas appliances (range, fireplace, water heater) require gas line routing.",
        type: "single",
        inputType: "options",
        sortOrder: 440,
        options: [
          { text: "Yes — gas is available", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "No — all electric", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: EXTERIOR FINISHES
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "exterior_finishes",
    questions: [
      {
        text: "Which of these pictures feels closest to the exterior finish level you want?",
        subtext: "Choose the image that best represents your desired exterior quality and style.",
        type: "single",
        inputType: "options",
        sortOrder: 510,
        options: tierOptions(
          "exterior",
          [
            "Level 1 — Basic Vinyl Siding",
            "Level 2 — Quality Fiber Cement",
            "Level 3 — Board & Batten with Accents",
            "Level 4 — Cedar or Composite with Stone",
            "Level 5 — Natural Stone & Cedar Luxury",
          ],
          [
            "Standard vinyl siding, asphalt shingles, basic windows",
            "Fiber cement siding, architectural shingles, vinyl windows",
            "Fiber cement with board & batten accents, covered porch, clad windows",
            "Real cedar or composite, stone veneer, clad windows, metal roof accents",
            "Natural stone + cedar, standing seam metal roof, custom entry, designer landscaping",
          ],
          [0, 5000, 12000, 25000, 50000]
        ),
      },
      {
        text: "What type of windows are you planning for the new space?",
        subtext: "Window quality significantly affects energy efficiency and aesthetics.",
        type: "single",
        inputType: "options",
        sortOrder: 520,
        options: [
          { text: "Standard vinyl double-pane", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Fiberglass or composite frame", sortOrder: 2, priceAdjustment: 3000, priceAdjustmentType: "flat" },
          { text: "Wood-clad or aluminum-clad", sortOrder: 3, priceAdjustment: 6000, priceAdjustmentType: "flat" },
          { text: "Custom or oversized windows", sortOrder: 4, priceAdjustment: 12000, priceAdjustmentType: "flat" },
        ],
      },
      {
        text: "Will the project include any outdoor living space (covered patio, deck, etc.)?",
        subtext: "Outdoor living areas are designed as part of the overall project.",
        type: "single",
        inputType: "options",
        sortOrder: 530,
        options: [
          { text: "Yes — covered patio or porch", sortOrder: 1, priceAdjustment: 15000, priceAdjustmentType: "flat" },
          { text: "Yes — uncovered deck or patio", sortOrder: 2, priceAdjustment: 8000, priceAdjustmentType: "flat" },
          { text: "No outdoor living space", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 7: INTERIOR FINISHES
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "interior_finishes",
    questions: [
      {
        text: "Which of these pictures feels closest to the flooring you want?",
        subtext: "Pick the image that best matches your desired floor material and quality.",
        type: "single",
        inputType: "options",
        sortOrder: 610,
        options: tierOptions(
          "flooring",
          [
            "Level 1 — Carpet or Basic LVP",
            "Level 2 — Mid-Grade LVP or Laminate",
            "Level 3 — Engineered Hardwood",
            "Level 4 — Site-Finished Hardwood",
            "Level 5 — Heated Tile / Custom Pattern",
          ],
          [
            "Builder-grade carpet or basic luxury vinyl plank",
            "Mid-grade LVP (LifeProof, COREtec) or quality laminate",
            "Engineered hardwood — oak, maple, or hickory",
            "Site-finished solid hardwood, wide plank, custom stain",
            "Heated large-format tile, custom pattern, or luxury material",
          ],
          [0, 3000, 7000, 14000, 25000]
        ),
      },
      {
        text: "Which of these pictures feels closest to the bathroom finish level you want?",
        subtext: "Pick the image that best represents your desired bathroom quality.",
        type: "single",
        inputType: "options",
        sortOrder: 620,
        options: tierOptions(
          "bathroom",
          [
            "Level 1 — Fiberglass Insert",
            "Level 2 — Acrylic Shower System",
            "Level 3 — Tile Shower, Standard Fixtures",
            "Level 4 — Tile Shower with Niche, Bench & Glass",
            "Level 5 — Wet Room / Curbless / Heated Floors",
          ],
          [
            "One-piece fiberglass shower/tub insert, basic chrome fixtures",
            "Acrylic shower system, standard chrome fixtures, basic tile floor",
            "Tile shower, subway tile, chrome fixtures, tile floor",
            "Tile shower with niche, bench, frameless glass, brushed nickel fixtures",
            "Curbless wet room, heated floors, premium tile, designer fixtures, soaking tub",
          ],
          [0, 4000, 9000, 18000, 35000]
        ),
      },
      {
        text: "Which of these pictures feels closest to the kitchen finish level you want?",
        subtext: "Pick the image that best represents your desired kitchen quality.",
        type: "single",
        inputType: "options",
        sortOrder: 630,
        options: tierOptions(
          "kitchen",
          [
            "Level 1 — Builder-Grade Stock Cabinets",
            "Level 2 — Painted Shaker + Quartz",
            "Level 3 — Semi-Custom Cabinets + Island",
            "Level 4 — Custom Cabinetry + Pro Appliances",
            "Level 5 — Full Custom + Luxury Stone",
          ],
          [
            "Stock oak or maple cabinets, laminate counters, basic appliances",
            "Painted shaker cabinets, quartz counters, stainless appliances, tile backsplash",
            "Semi-custom cabinets, quartz counters, gas range, island with pendants",
            "Custom cabinetry, thick stone counters, professional appliances, designer backsplash",
            "Full custom to ceiling, book-matched stone, top-of-line appliances, butler pantry",
          ],
          [0, 10000, 22000, 45000, 85000]
        ),
      },
      {
        text: "What type of interior doors and trim are you planning?",
        subtext: "Door and trim quality sets the tone for the overall finish level.",
        type: "single",
        inputType: "options",
        sortOrder: 640,
        options: [
          { text: "Standard hollow-core doors, basic casing", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Solid-core doors, standard casing and base", sortOrder: 2, priceAdjustment: 3000, priceAdjustmentType: "flat" },
          { text: "Solid-core with upgraded casing, crown molding", sortOrder: 3, priceAdjustment: 7000, priceAdjustmentType: "flat" },
          { text: "Custom doors, built-up millwork, coffered ceilings", sortOrder: 4, priceAdjustment: 18000, priceAdjustmentType: "flat" },
        ],
      },
      {
        text: "What type of interior paint and wall finish are you planning?",
        subtext: "Wall finishes range from standard flat paint to custom textures and wall coverings.",
        type: "single",
        inputType: "options",
        sortOrder: 650,
        options: [
          { text: "Standard flat or eggshell paint", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Premium paint with accent walls", sortOrder: 2, priceAdjustment: 1500, priceAdjustmentType: "flat" },
          { text: "Specialty finishes (limewash, venetian plaster, shiplap)", sortOrder: 3, priceAdjustment: 5000, priceAdjustmentType: "flat" },
          { text: "Custom wallcovering or designer finishes", sortOrder: 4, priceAdjustment: 10000, priceAdjustmentType: "flat" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 8: TRADE-SPECIFIC FEATURE UPGRADES
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "trade_upgrades",
    questions: [
      {
        text: "Are you interested in any smart home features?",
        subtext: "Select all that apply.",
        type: "multi",
        inputType: "checkboxes",
        dropdownOptions: [
          "Smart lighting (Lutron, Leviton)",
          "Whole-home audio / speakers",
          "Smart thermostat (Nest, Ecobee)",
          "Security cameras and alarm system",
          "Motorized window shades",
          "EV charging station in garage",
          "None / not interested",
        ],
        sortOrder: 710,
        options: [],
      },
      {
        text: "Are you planning any custom built-ins or cabinetry beyond the kitchen?",
        subtext: "Built-ins add significant value but also cost.",
        type: "multi",
        inputType: "checkboxes",
        dropdownOptions: [
          "Built-in bookcase or entertainment center",
          "Mudroom lockers / built-in bench",
          "Home office built-ins",
          "Closet system (walk-in or reach-in)",
          "Laundry room built-ins",
          "None",
        ],
        sortOrder: 720,
        options: [],
      },
      {
        text: "Will the project include a fireplace or fireplace surround?",
        subtext: "Fireplaces require gas or electric rough-in and custom surround design.",
        type: "single",
        inputType: "options",
        sortOrder: 730,
        options: [
          { text: "Yes — gas fireplace with custom surround", sortOrder: 1, priceAdjustment: 12000, priceAdjustmentType: "flat" },
          { text: "Yes — electric fireplace insert", sortOrder: 2, priceAdjustment: 4000, priceAdjustmentType: "flat" },
          { text: "No fireplace", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Are you planning a wet bar, butler pantry, or coffee station?",
        subtext: "These specialty areas require plumbing, cabinetry, and countertop work.",
        type: "single",
        inputType: "options",
        sortOrder: 740,
        options: [
          { text: "Yes — wet bar with sink", sortOrder: 1, priceAdjustment: 8000, priceAdjustmentType: "flat" },
          { text: "Yes — dry bar or coffee station (no sink)", sortOrder: 2, priceAdjustment: 3000, priceAdjustmentType: "flat" },
          { text: "No", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "Will the project include a home theater or dedicated media room?",
        subtext: "Media rooms require acoustic treatment, specialized wiring, and AV rough-in.",
        type: "single",
        inputType: "options",
        sortOrder: 750,
        options: [
          { text: "Yes — dedicated home theater room", sortOrder: 1, priceAdjustment: 20000, priceAdjustmentType: "flat" },
          { text: "Yes — media room (not full theater)", sortOrder: 2, priceAdjustment: 8000, priceAdjustmentType: "flat" },
          { text: "No", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 9: OVERALL FINISH LEVEL
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "overall_finish_level",
    questions: [
      {
        text: "Overall, which finish level best describes what you are going for?",
        subtext: "This helps us calibrate the overall budget and material selections across all trades.",
        type: "single",
        inputType: "options",
        sortOrder: 810,
        options: [
          {
            text: "Level 1 — Functional & Budget-Conscious",
            subtext: "Builder-grade materials throughout. Focus on function over form. Great value.",
            sortOrder: 1,
            priceAdjustment: 0,
            priceAdjustmentType: "none",
            pricingTier: 1,
          },
          {
            text: "Level 2 — Clean & Comfortable",
            subtext: "Mid-grade materials with a clean, modern look. A step above builder-grade.",
            sortOrder: 2,
            priceAdjustment: 0,
            priceAdjustmentType: "none",
            pricingTier: 2,
          },
          {
            text: "Level 3 — Elevated & Stylish",
            subtext: "Upgraded finishes, thoughtful design, and quality materials throughout.",
            sortOrder: 3,
            priceAdjustment: 0,
            priceAdjustmentType: "none",
            pricingTier: 3,
          },
          {
            text: "Level 4 — High-End Custom",
            subtext: "Custom cabinetry, premium materials, designer fixtures. A true showcase home.",
            sortOrder: 4,
            priceAdjustment: 0,
            priceAdjustmentType: "none",
            pricingTier: 4,
          },
          {
            text: "Level 5 — Luxury / No Compromise",
            subtext: "The best of everything. Ultra-premium materials, bespoke details, top-tier craftsmanship.",
            sortOrder: 5,
            priceAdjustment: 0,
            priceAdjustmentType: "none",
            pricingTier: 5,
          },
        ],
      },
      {
        text: "Is there a specific room or area where you want to splurge on finishes?",
        subtext: "Some clients go high-end in the kitchen but keep other areas moderate. Let us know your priorities.",
        type: "single",
        inputType: "options",
        sortOrder: 820,
        options: [
          { text: "Kitchen — this is the most important space", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Primary bathroom — this is my sanctuary", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Main living area — it needs to impress", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Outdoor living / curb appeal", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Consistent quality throughout — no one area stands out", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
      {
        text: "How would you describe your design style preference?",
        subtext: "This guides our material and color palette selections.",
        type: "single",
        inputType: "options",
        sortOrder: 830,
        options: [
          { text: "Modern / Contemporary — clean lines, minimal", sortOrder: 1, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Transitional — blend of traditional and modern", sortOrder: 2, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Farmhouse / Rustic — warm, textured, natural materials", sortOrder: 3, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Traditional / Classic — timeless, formal details", sortOrder: 4, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Mountain Modern — stone, wood, large windows", sortOrder: 5, priceAdjustment: 0, priceAdjustmentType: "none" },
          { text: "Not sure — I need help deciding", sortOrder: 6, priceAdjustment: 0, priceAdjustmentType: "none" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 10: PHOTOS / INSPIRATION IMAGES
  // ─────────────────────────────────────────────────────────────────────────
  {
    section: "photos_inspiration",
    questions: [
      {
        text: "Photo: Existing exterior wall where the addition connects",
        subtext: "Take a photo of the exterior wall where the new addition will attach to the house. Show the full wall from ground to roofline.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 910,
        photoCategory: "Existing Exterior Wall",
        options: [],
      },
      {
        text: "Photo: Existing roofline",
        subtext: "Take a photo showing the existing roofline from outside. Try to capture the roof pitch and any existing valleys or ridges.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 920,
        photoCategory: "Existing Roofline",
        options: [],
      },
      {
        text: "Photo: Electrical panel",
        subtext: "Open the electrical panel door and take a photo of the breaker labels and panel rating (usually shown on a sticker inside the door).",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 930,
        photoCategory: "Electrical Panel",
        options: [],
      },
      {
        text: "Photo: Mechanical room / furnace area",
        subtext: "Take a photo of your furnace, water heater, and any other mechanical equipment. Include the model labels if visible.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 940,
        photoCategory: "Mechanical Room",
        options: [],
      },
      {
        text: "Photo: Basement or crawl space (if accessible)",
        subtext: "If you have a basement or crawl space, take a photo showing the floor joists, foundation walls, and any existing conditions.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 950,
        photoCategory: "Basement / Crawl Space",
        options: [],
      },
      {
        text: "Photo: Backyard or side yard access",
        subtext: "Take a photo of the yard area where the addition or project will be located. Show any fences, slopes, trees, or obstacles.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 960,
        photoCategory: "Yard Access",
        options: [],
      },
      {
        text: "Photo: Existing interior space affected by the addition",
        subtext: "Take a photo of the interior room(s) that will be impacted — walls being removed, areas being opened up, or spaces being renovated.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 970,
        photoCategory: "Existing Interior Space",
        options: [],
      },
      {
        text: "Inspiration photos for style and finish level",
        subtext: "Upload any photos from Pinterest, Houzz, magazines, or other homes that show the style and finish level you are going for. You can upload multiple photos.",
        type: "photo_upload",
        inputType: "options",
        sortOrder: 980,
        photoCategory: "Inspiration Photos",
        options: [],
      },
    ],
  },
];

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("Connected to database");

  try {
    // Clear existing dynamic questionnaire questions and options
    await conn.execute("DELETE FROM questionnaire_options WHERE 1=1");
    await conn.execute("DELETE FROM questionnaire_questions WHERE 1=1");
    console.log("Cleared existing questions and options");

    let questionCount = 0;
    let optionCount = 0;

    for (const sectionData of SECTIONS) {
      for (const q of sectionData.questions) {
        const [result] = await conn.execute(
          `INSERT INTO questionnaire_questions
            (text, subtext, type, inputType, dropdownOptions, sortOrder, isActive, section, tradeCategory)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            q.text,
            q.subtext || null,
            q.type,
            q.inputType,
            q.dropdownOptions ? JSON.stringify(q.dropdownOptions) : null,
            q.sortOrder,
            sectionData.section,
            q.tradeCategory || null,
          ]
        );
        const questionId = result.insertId;
        questionCount++;

        for (const opt of q.options || []) {
          await conn.execute(
            `INSERT INTO questionnaire_options
              (questionId, text, subtext, imageUrl, sortOrder, priceAdjustment, priceAdjustmentType, pricingTier)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              questionId,
              opt.text,
              opt.subtext || null,
              opt.imageUrl || null,
              opt.sortOrder,
              opt.priceAdjustment ?? 0,
              opt.priceAdjustmentType || "none",
              opt.pricingTier || null,
            ]
          );
          optionCount++;
        }
      }
    }

    console.log(`✅ Seeded ${questionCount} questions and ${optionCount} options across 10 sections`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
