# Engineering Notes — Joist & Beam Sizing

## Hot Tub Load Methodology (Practical Engineering, DeBlois & Jackson)

### Total Design Load for Hot Tub Area
- Hot tub live load: ~94 psf (filled tub + 5 people over 45 sqft area)
- Dead load (deck itself): +10 psf
- Wet service factor for bending (C_M for F_b): 0.85 → increases effective load by 1/0.85 = 1.18
- Permanent load duration factor (C_D): 0.9 → increases effective load by 1/0.9 = 1.11
- Combined adjustment: 94 psf × 1.11 × 1.18 ≈ 115–136 psf design load

### Hot Tub Weight by Size (approximate)
- 2-person: ~1,500 lb filled (~75 psf over ~20 sqft)
- 4-person: ~2,500 lb filled (~83 psf over ~30 sqft)
- 5-person: ~3,000 lb filled (~94 psf over ~32 sqft = 45 sqft area)
- 6-person: ~3,500 lb filled (~97 psf over ~36 sqft)
- 7-person: ~4,000 lb filled (~100 psf over ~40 sqft)
- 8-person: ~4,500 lb filled (~100 psf over ~45 sqft)
- 10-person: ~5,500 lb filled (~105 psf over ~52 sqft)

### Adjusted Design Load Calculation
total_psf = (hot_tub_psf + 10) × (1/0.9) × (1/0.85)
         = (hot_tub_psf + 10) × 1.307

### Joist Sizing from TABLE R507.5 (Douglas fir-larch/hem-fir/spruce-pine-fir, 16" OC, no cantilever)
| Joist Size | Max Span (16" OC, no cantilever) |
|------------|----------------------------------|
| 2×6        | 8'-8"                            |
| 2×8        | 11'-1"                           |
| 2×10       | 13'-7"                           |
| 2×12       | 15'-9"                           |

### Joist Sizing Logic
For a given span and design load:
1. Compute ratio = total_psf / 50 (standard table load)
2. Required joists per 16" bay = ratio (e.g., 2.7 means 2.7 joists)
3. Round up to nearest integer → that many single joists OR fewer doubled joists
4. Recommend minimum joist size that can span the given span at 16" OC

### Recommended Joist Sizing (Douglas fir, 16" OC, no cantilever)
| Span (ft) | Standard Load (40 psf live + 10 dead) | Hot Tub Load (~115 psf) |
|-----------|---------------------------------------|------------------------|
| ≤8        | 2×6                                   | 2×8 doubled            |
| 8–11      | 2×8                                   | 2×10 doubled           |
| 11–14     | 2×10                                  | 2×12 doubled           |
| 14–16     | 2×12                                  | 2×12 tripled           |

## Snow Load → Joist Sizing (TABLE R507.5, Southern Pine, 16" OC, no cantilever)
| Snow Load (psf) | Adjusted Total (+ 10 dead × 1.307) | Recommended Joist |
|-----------------|-------------------------------------|-------------------|
| 20              | ~39 psf → standard                  | Per span table    |
| 30              | ~52 psf → 1.04× standard            | Per span table    |
| 40              | ~65 psf → 1.3× standard             | Upsize one        |
| 50              | ~78 psf → 1.56× standard            | Upsize one        |
| 60              | ~91 psf → 1.82× standard            | Upsize two        |
| 70+             | ~104+ psf → 2.1×+ standard          | Double joists     |

## Joist Span Table (Douglas fir-larch, 16" OC, no cantilever) — TABLE R507.5
| Size | Max Span |
|------|----------|
| 2×6  | 8'-8"    |
| 2×8  | 11'-1"   |
| 2×10 | 13'-7"   |
| 2×12 | 15'-9"   |

## LVL Beam Sizing (US West, to be added from LVL PDF)
- Placeholder: beam size based on tributary width, span between posts, and total load
- Will be populated from LVL load tables PDF

## Subfloor Sheet Calculation
- Sheet size: 4'×8' = 32 sqft
- Sheets needed = ceil(sqft / 32)
- If sheets > 5: add 1 bonus sheet
- Total sheets = ceil(sqft / 32) + (sheets > 5 ? 1 : 0)

## LVL Beam Sizing — Versa-Lam 2.1E 2800/3100 (Boise Cascade US West)

### Which table to use
- **Deck with snow load** → Use "US WEST ROOF SNOW LOAD TABLES" (Page 5, 115% Load Duration)
- **Deck without snow load** → Use "US WEST FLOOR LOAD TABLES" (Page 4, 100% Load Duration)

### Key: Each cell in the table has 3 numbers (top/middle/bottom):
- Top: Allowable Total Load [plf] (pounds per linear foot)
- Middle: Allowable Live Load [plf]
- Bottom: Minimum Required Bearing Length [inches] at end / intermediate supports

### How to use for deck beam sizing:
1. Determine tributary width = half the joist span on each side of the beam
2. Calculate total load per linear foot = tributary_width × total_psf
3. Find the beam span (distance between posts)
4. Look up in the table: find the span row, scan across beam sizes until Total Load ≥ calculated plf
5. Choose the smallest beam that works

### Practical Beam Sizing Lookup (Snow Load Table, 3½" Versa-Lam 2.1E 3100)
For a deck with 40 psf snow load + 10 psf dead = 50 psf total, tributary width = 8 ft:
- Required plf = 8 ft × 50 psf = 400 plf
- At 10 ft span: 3½"×9¼" handles ~500 plf total → OK
- At 12 ft span: 3½"×11¼" handles ~500+ plf → OK
- At 14 ft span: 3½"×14" handles ~500+ plf → OK

### Simplified Beam Sizing Table (for deck application, snow load, 3½" LVL beam)
Based on US West Snow Load Tables (115% duration), tributary width 8 ft, total load ~50-80 psf:

| Post Spacing (span) | Load ≤50 plf/ft trib | Load ≤80 plf/ft trib |
|---------------------|----------------------|----------------------|
| 6 ft                | 3½"×9¼"              | 3½"×9¼"              |
| 8 ft                | 3½"×9¼"              | 3½"×11¼"             |
| 10 ft               | 3½"×9¼"              | 3½"×11¼"             |
| 12 ft               | 3½"×11¼"             | 3½"×14"              |
| 14 ft               | 3½"×11¼"             | 3½"×16"              |
| 16 ft               | 3½"×14"              | 3½"×18"              |
| 18 ft               | 3½"×16"              | 3½"×18" (double)     |
| 20 ft               | 3½"×18"              | 3½"×20" (double)     |

### Beam Sizing Logic for App
Given: post_spacing (ft), tributary_width (ft), snow_load (psf), dead_load (psf)
1. total_psf = snow_load + dead_load (use 115% duration for snow)
2. required_plf = tributary_width × total_psf
3. Use Snow Load table (page 5) if snow_load > 0, else Floor Load table (page 4)
4. Find minimum beam depth for 3½" width at given span that meets required_plf
5. If required_plf > single beam capacity, recommend double/triple beam

### Standard Beam Sizes Available (3½" width LVL):
9¼", 11¼", 11⅞", 14", 16", 18", 20", 24"

### Post Spacing Recommendations
- Standard: 8-10 ft
- Maximum without engineering review: 14 ft
- For hot tub area: reduce post spacing to 6-8 ft

## Corners → Waste Percentage Table (default values)
| Corners | All 90°? | Waste % |
|---------|----------|---------|
| 3       | Yes      | 12%     |
| 3       | No       | 18%     |
| 4       | Yes      | 10%     |
| 4       | No       | 15%     |
| 5       | Yes      | 15%     |
| 5       | No       | 20%     |
| 6       | Yes      | 18%     |
| 6       | No       | 25%     |
| 7       | Yes      | 22%     |
| 7       | No       | 28%     |
| 8       | Yes      | 25%     |
| 8       | No       | 30%     |
| 9       | Yes      | 28%     |
| 9       | No       | 33%     |
| 10      | Yes      | 30%     |
| 10      | No       | 35%     |
