# Design Brainstorm: Tanzite Stone Decking Calculator

## Company: Design Your Price — Orem, Utah

---

<response>
<idea>

## Idea 1: "Mountain Modern" — Utah Landscape-Inspired Industrial Warmth

**Design Movement**: Mountain Modern / Wasatch Contemporary — inspired by the rugged beauty of Utah's mountain landscapes, blending natural stone textures with clean industrial lines.

**Core Principles**:
1. Warm earth tones grounded by cool slate accents — reflecting Utah's canyon-to-mountain palette
2. Tactile materiality — the UI should feel like touching stone, with textured surfaces and weight
3. Functional clarity — every element serves the estimation workflow, no decorative excess
4. Progressive disclosure — complexity reveals itself as the user advances through the calculator

**Color Philosophy**: A warm sandstone base (#F5EDE3) paired with deep charcoal (#2D2926) for text, canyon rust (#A0522D) as the primary action color, and slate blue-grey (#6B7B8D) for secondary elements. The warmth evokes Utah's red rock while the cool tones reference mountain stone.

**Layout Paradigm**: A vertical scroll storytelling layout with full-width "slab" sections — each section of the calculator sits on its own stone-like card that stacks vertically. The left side features a persistent floating summary panel on desktop that follows the user down.

**Signature Elements**:
1. Subtle stone grain texture overlays on card backgrounds
2. Horizontal rule dividers styled as thin stone seams
3. Color swatches rendered as realistic stone tile thumbnails

**Interaction Philosophy**: Inputs feel weighty — sliders have momentum, number inputs have satisfying increment animations. Selections "lock in" with a subtle thud-like micro-animation.

**Animation**: Sections fade-slide in from below as user scrolls. The cost summary updates with a counting-up number animation. Card hover states lift with a shadow deepening effect.

**Typography System**: DM Serif Display for headings (elegant, grounded), Source Sans 3 for body text (clean, professional). Numbers use tabular figures for alignment in the cost breakdown.

</idea>
<probability>0.08</probability>
<text>Mountain Modern aesthetic inspired by Utah's landscape — warm sandstone and charcoal palette with stone textures, vertical slab layout with floating summary panel.</text>
</response>

<response>
<idea>

## Idea 2: "Blueprint Precision" — Technical Drafting Meets Digital

**Design Movement**: Technical Drafting / Architectural Blueprint — the calculator feels like a professional construction document come to life digitally.

**Core Principles**:
1. Grid-based precision — everything aligns to a visible underlying grid system
2. Monochromatic depth — using shades of navy and white with selective amber highlights
3. Informational density — present data efficiently like a spec sheet
4. Professional authority — the design communicates expertise and trustworthiness

**Color Philosophy**: Deep navy (#1B2838) as the primary background for the calculator workspace, crisp white (#FFFFFF) for input cards, warm amber (#D4A853) for CTAs and highlights, and a light blueprint blue (#E8EEF4) for section backgrounds. The navy conveys professionalism, amber signals action.

**Layout Paradigm**: A two-column dashboard layout — left column is the input configurator (collection, colors, dimensions), right column is a live-updating cost breakdown sheet. On mobile, it collapses to a tabbed interface (Configure | Estimate).

**Signature Elements**:
1. Thin dashed grid lines visible in the background like graph paper
2. Measurement annotations that appear near dimension inputs
3. A "stamp" style logo treatment for Design Your Price

**Interaction Philosophy**: Precise and responsive — inputs snap to values, tooltips explain every field. The interface rewards accuracy with clear, immediate feedback.

**Animation**: Cost values animate with a typewriter-counter effect. Section transitions use a clean slide-left/right. Input focus states pulse with a subtle amber glow.

**Typography System**: Space Grotesk for headings (geometric, technical), IBM Plex Sans for body (engineered readability). Monospace numerals in the cost breakdown for that spec-sheet feel.

</idea>
<probability>0.06</probability>
<text>Blueprint Precision — technical drafting aesthetic with navy/amber palette, two-column dashboard layout, grid paper backgrounds, and spec-sheet typography.</text>
</response>

<response>
<idea>

## Idea 3: "Artisan Catalog" — Premium Product Showcase Calculator

**Design Movement**: Scandinavian Luxury Catalog — the calculator feels like browsing a high-end materials catalog, where the stone products are the heroes.

**Core Principles**:
1. Product-first hierarchy — stone colors and textures dominate the visual space
2. Generous white space — breathing room that signals premium quality
3. Subtle sophistication — refined details over flashy effects
4. Trust through transparency — every cost line item is clearly explained

**Core Principles**:
1. Product-first hierarchy — stone colors and textures dominate the visual space
2. Generous white space — breathing room that signals premium quality
3. Subtle sophistication — refined details over flashy effects
4. Trust through transparency — every cost line item is clearly explained

**Color Philosophy**: Off-white linen (#FAF8F5) as the canvas, warm black (#1A1A1A) for typography, sage green (#7D8C6E) as the primary accent (natural, calming, trustworthy), and a muted gold (#C4A265) for premium highlights. The palette feels organic and upscale.

**Layout Paradigm**: A single-column guided flow with large, full-width product selection cards at the top, followed by a clean form section, and ending with an elegant receipt-style cost summary. Each step is a "chapter" in the estimation journey.

**Signature Elements**:
1. Large stone color swatch cards with hover zoom revealing texture detail
2. A receipt/invoice-style cost breakdown with elegant line separators
3. Subtle paper-like texture on the background

**Interaction Philosophy**: Browsing-oriented — selecting a collection and color feels like shopping in a showroom. Hover states reveal product details. The experience is leisurely and confident.

**Animation**: Smooth crossfade transitions between collection views. Cost summary items slide in one by one. Scroll-triggered parallax on the hero section.

**Typography System**: Cormorant Garamond for headings (editorial elegance), Outfit for body text (modern geometric clarity). Price figures use Outfit at heavier weights for emphasis.

</idea>
<probability>0.07</probability>
<text>Artisan Catalog — Scandinavian luxury catalog aesthetic with linen/sage/gold palette, single-column guided flow, large product showcases, and editorial typography.</text>
</response>

---

## Selected Approach: Idea 1 — "Mountain Modern"

I'm choosing the Mountain Modern approach because it directly connects to the Utah location of Design Your Price, creates an emotional resonance with homeowners considering outdoor stone decking, and the warm earth-tone palette naturally complements the Tanzite stone product colors. The vertical slab layout with floating summary panel provides the best UX for a multi-step calculator while keeping the running total always visible.
