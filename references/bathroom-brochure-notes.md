# Design Your Bathroom Brochure Notes

Source: `/home/ubuntu/upload/DesignyourBathroom.pdf`

## Pages 6-10 extracted findings

### Page 6 — Electrical and HVAC

**Electrical work**
- Waterproof light: $225
- New light install: $215
- 3-way switch rough-in: $225
- New GFCI: $275
- New outlet: $118
- New panel upgrade (no new main): $2,750
- Dedicated circuit 20 amp circuit: $500
- Towel warmer install (without finish): $350
- Heated shower bench: $750 + dedicated GFCI
- Replace GFCI: $120
- Replace light fixture: $100
- Replace switch/outlet: $60
- Ceiling fan with switch: $425 (fixture not included)

**HVAC**
- New location for duct: $700
- Flush register vent: customer buys vent
- Flush exhaust vent: $260 (customer buys vent)
- New exhaust vent: $850
- Heated floors: $75/sqft
- Replace existing exhaust vent: $300

### Page 7 — Carpentry

- PVC baseboards: $12/ft
- Barn door / 80 inch paint-grade solid core door: $1,475 (custom build)
- Barn door hung (door supplied by customer): $385
- Pocket door / 80 inch paint-grade solid core door: $1,250
- Standard interior door: $600
- Baseboard: $6.25–$10/ft
- Bathroom hardware: $200 (install only $125)
- Mirror install: $75
- Medicine cabinet install: $200
- Recessing medicine cabinet: $350

### Page 8 / 4 image — Walls and painting

**Walls**
- Drywall patchwork: $700 per day
- Wallpaper: $15/sqft or $500 minimum (wallpaper not included)

**Painting**
- Whole small bathroom: $650
- Whole hall bathroom: $800
- Whole large bathroom: $1,000
- Doors: $180 each

### Page 9 — Tile floor/wall/ceiling pricing and layouts

Tile section note:
- Includes an uncoupling membrane or 1/2 inch cement backerboard depending on floor height requirements
- Includes all grout, thinset, leveling kits, spacers, and edge trim

**Tile pricing table**
| Surface | Mosaic/Sheets | Small/Subway | Large | Plank | Extra Large |
|---|---:|---:|---:|---:|---:|
| Floor | $17.00 | $15.00 | $12.00 | $13.00 | $15.00 |
| Wall | $26.00 | $26.00 | $17.00 | $21.00 | $25.00 |
| Ceiling | $41.00 | $41.00 | $32.00 | $36.00 | $40.00 |

**Additional layout upcharges visible on diagram**
- One square tile: no visible upcharge labels
- One rectangular tile: labels include +$3 on some layouts
- Two tiles: labels include +$3, +$6, +$8, +$10, +$12 depending on layout complexity
- The diagram shows pattern pricing that should be represented in admin as configurable layout upcharges rather than hardcoded values.

### Page 10 — Shower bench and shelf

**Shower bench**
- Floating: $300 + remnant top
- Floor mounted: $400 + tile and remnant top
- Fold down: $250 (customer supplies bench)

**Shower shelf**
- White or glass shelf: $75
- Stone shelf: $150

## Build implications from user request

The bathroom configurator now needs to support:
- Exact square footage input OR length x width input
- Admin-managed feasibility checklists for plumbing changes and HVAC changes
- Tub selection with type and size
- Shower selection with curb type, niches by size, benches, glass type, and glass wall length
- Layered tile choices where selecting tile expands into tile size and tile layout pattern selections
- Brochure prices exposed in the admin panel for editing rather than hardcoded in the UI

## Recommended admin categories from brochure + user request
- Plumbing feasibility checklist items
- HVAC feasibility checklist items
- Tub options
- Tub sizes
- Shower base/curb options
- Shower niche sizes
- Shower bench options
- Shower glass types with dimensional pricing where needed
- Tile size categories
- Tile layout pattern upcharges
- Vanity options
- Flooring options
- Countertop options
- Toilet options
- Wall finish options
- Electrical line items
- HVAC line items
- Carpentry line items
- Painting line items
- Wallpaper line items
- Shower accessory line items

## Notes
- Because the layout-upcharge numbers in the brochure images are visual and not fully normalized into text, model them as editable admin records with defaults based on the brochure, so they can be corrected without code changes.
- The brochure should be treated as the starting price source, but the admin panel must remain the source of truth after import.


## Pages 1-5 extracted findings

### Page 2 — Vanity cost breakdown context

The brochure states that vanity pricing includes materials and install in a Euro or face-framed look. Insert or recessed panels add 20% to the cost. Standard depth is 18–22 inches with a 1.5 inch countertop overhang for the countertop. Custom reasonable configuration is allowed. Double sinks start with 60 inch vanities.

### Page 3 — Vanity pricing and countertop pricing

**Vanity pricing table**

| Size | Painted | Alder/Maple | White Oak | Walnut |
|---|---:|---:|---:|---:|
| 18 in | 640 | 980 | 1025 | 1120 |
| 24 in | 800 | 1215 | 1280 | 1400 |
| 30 in | 1000 | 1520 | 1600 | 1840 |
| 36 in | 1200 | 1825 | 1920 | 2200 |
| 42 in | 1400 | 2125 | 2240 | 2560 |
| 48 in | 1600 | 2450 | 2560 | 2920 |
| 60 in | 2000 | 3040 | 3200 | 3600 |
| 72 in | 2400 | 3650 | 3850 | 4320 |
| 84 in | 2800 | 4250 | 4500 | 5040 |

**Floating vanity supports**
- $175 supports every 16 inches with a minimum of 2

**Countertops**
- Remnant stone includes 4 inch backsplash
- Decorative edges add $20/ft
- Remnant stone minimum $450 or $70/sqft
- Full slabs: brochure links to supplier reference, no fixed price shown on page
- Solid surface: minimum $500 or $50/sqft

### Page 4 — Sink options

**Undermount vanity sinks**
- Rectangular or circular
- $250 each including material, cut, polish, and install

**Vessel sinks**
- Variety of styles; customer buys sink
- $50 each for consumables to set, mounting ring, sealing edge

**Trough / ramp sinks**
- Incorporates countertop material into sink
- $1,300 each (custom build)

### Page 5 — Plumbing and slab work

**Plumbing**
- Installation and consumables do not include the finish
- Rough-in and trim-out of a new fixture: $1,250
- Trim-out only of a fixture staying in the same place: $400
- Vanity sink connection: $350
- Tub install: $700
- Freestanding tub install: $1,450
- Wall mounted faucet rough-in and trim-out: $750
- Freestanding tub filler: $1,000
- Rough-in new toilet: $1,400
- Toilet install: $320
- Steam shower (without valves): $3,500

**Under slab work**
- Concrete: $3,000/day at a rate of 10 feet per day
- Includes removal of the existing concrete and infill after testing is done

## Additional modeling implications from pages 1-5

The admin model should support:
- Vanity as a structured option with type/material families and width-based pricing
- Countertop option families with minimums, per-sqft pricing, and decorative edge upcharges per linear foot
- Sink type selection and quantity pricing
- Plumbing line items split between relocate/new fixture/trim-out/install types
- Optional under-slab work with footage or day-based pricing


## Pages 11-14 extracted findings

### Page 11 — Shower pan and surround preparation

| Item | Pricing model | Price |
|---|---|---:|
| Shower pan install — standard | 7–16 sqft | 800 |
| Shower pan install — large | 17–30 sqft | 1000 |
| Shower pan install — extra large | 31+ sqft | 1400 |
| Curbless shower upcharge | flat add-on | 800 |
| Shower surround prep + waterproofing | per sqft | 14 |

### Page 12 — Self-leveler and countertop edge upgrade

| Item | Pricing model | Price |
|---|---|---:|
| Self-leveler | per bag | 100 |
| Coverage at 1/4 inch thickness | per bag coverage | 50 sqft |
| Coverage at 1/2 inch thickness | per bag coverage | 25 sqft |
| Coverage at 3/4 inch thickness | per bag coverage | 12 sqft |
| Mitered countertop edges | per edge | 75 |

These values imply the flooring configuration should support an optional subfloor leveling input, ideally based on area and thickness so bag counts can be derived automatically.

### Page 13 — Shower niche options

| Item | Pricing model | Price |
|---|---|---:|
| Shower niche — small | flat add-on | 350 |
| Shower niche — large | flat add-on | 500 |
| Shower niche — ledge | flat add-on | 400 |

This directly supports the requested shower configuration flow where niche type and size become nested options once a shower type is selected.

### Page 14 — Demolition and specialty shower finish

| Item | Pricing model | Price |
|---|---|---:|
| Demolition labor | per day | 1000 |
| Floor covering removal | flat add-on | 150 |
| Demo zip wall | per wall | 300 |
| Dump trailer | flat add-on | 450 |
| Tadelakt plaster shower | per sqft | 50 |

## Brochure-driven implementation implications

The bathroom configurator should now support the following additional pricing behaviors:

| Area | Needed modeling behavior |
|---|---|
| Bathroom size | Allow either exact total sqft or entered length × width, with sqft auto-calculated when dimensions are entered |
| Plumbing / HVAC changes | Add admin-managed feasibility checklist items that must be acknowledged before those changes can be priced |
| Tub configuration | Support tub type selection: alcove, drop-in, freestanding; also support size selection and install-specific pricing |
| Shower configuration | Support shower type (curbed or curbless), shower size, glass layout type, optional bench, and niche type/size |
| Tile selections | Support layered configuration: material family first, then tile size, then layout pattern |
| Vanity | Support custom, prebuilt wood, and prebuilt painted, with width-driven pricing and optional floating support count |
| Flooring | Support LVP click-lock and tile families, with tile size and pattern layout options, plus optional self-leveler calculations |
| Countertops | Support remnant minimum pricing and full slab / solid surface per-sqft fabrication pricing with optional edge upgrades |
| Toilet | Support standard, concealed p-trap, and smart toilet |
| Wall finish | Support paint, wallpaper, and tile wall systems, with tile again requiring size and layout pattern |
| Demolition / prep | Add configurable optional line items for demolition, dust containment zip walls, dump trailer, under-slab work, and specialty plaster systems |

These brochure-derived prices should be entered into the admin-facing bathroom pricing tables so Tanner can adjust them over time without changing code.


## Pages 6-10 re-extracted findings (corrected)

### Page 6 — Electrical and HVAC pricing (confirmed)

**Electrical work**

| Item | Price |
|---|---:|
| Waterproof light | 225 |
| New light install | 215 |
| 3-way switch rough-in | 225 |
| New GFCI | 275 |
| New outlet | 118 |
| New panel upgrade (no new main) | 2750 |
| Dedicated circuit 20 amp | 500 |
| Towel warmer install (without finish) | 350 |
| Heated shower bench | 750 + dedicated circuit |
| Replace GFCI | 120 |
| Replace light fixture | 100 |
| Replace switch or outlet | 60 |
| Ceiling fan with switch (not fixture) | 425 |

**HVAC**

| Item | Price |
|---|---:|
| New location for duct | 700 |
| Flush register vent | customer buys vent |
| Flush exhaust vent (customer buys vent) | 260 |
| New exhaust vent | 850 |
| Heated floors | 75/sqft |
| Replace existing exhaust vent | 300 |

### Page 7 — Carpentry (confirmed)

| Item | Price |
|---|---:|
| PVC baseboards | 12/ft |
| Barn door with 80 inch paint grade solid core door (custom build) | 1475 |
| Barn door hung (door supplied by customer) | 385 |
| Pocket door with 80 inch paint grade solid core door | 1250 |
| Standard interior door | 600 |
| Baseboard | 6.25–10/ft |
| Bathroom hardware (install only) | 125 |
| Bathroom hardware (full supply and install) | 200 |
| Mirror install | 75 |
| Medicine cabinet install | 200 |
| Recessing medicine cabinet | 350 |

### Page 8 — Walls and painting (confirmed)

**Walls**

| Item | Price |
|---|---:|
| Drywall patchwork | 700/day |
| Wall paper install (not including wall paper) | 15/sqft or 500 minimum |

**Painting**

| Item | Price |
|---|---:|
| Whole small bathroom | 650 |
| Whole hall bathroom | 800 |
| Whole large bathroom | 1000 |
| Doors | 180 each |

### Page 9 — Tile pricing (confirmed)

**Tile installation pricing per sqft**

| Location | Mosaic / Sheets | Small / Subway | Large | Plank | Extra Large |
|---|---:|---:|---:|---:|---:|
| Floor | 17 | 15 | 12 | 13 | 15 |
| Wall | 26 | 26 | 17 | 21 | 25 |
| Ceiling | 41 | 41 | 32 | 36 | 40 |

**Layout pattern upcharges (per sqft)**

| Pattern | Upcharge |
|---|---:|
| Herringbone | +3 |
| Windmill vertical | +3 |
| Windmill horizontal | +3 |
| Diamond | +2 |
| Checkerboard | +6 |
| Basketweave | +3 |
| Basketweave vertical | +3 |
| Herringbone horizontal | +3 |
| Big tiles herringbone | +3 |
| Big tiles herringbone horizontal | +3 |
| Big tiles herringbone vertical | +3 |
| Big tiles diamond | +6 |
| Big tiles staggered horizontal | +6 |
| Big tiles windmill horizontal | +10 |
| Big tiles windmill vertical | +8 |
| Running bond / standard | 0 |

**Deep cleaning**

| Item | Price |
|---|---:|
| Deep cleaning bathroom only | 250 |
| Deep cleaning main floor | 500 |

### Page 10 — Shower bench and shelf (confirmed)

**Shower bench**

| Type | Price |
|---|---:|
| Floating bench | 300/lf plus remnant top |
| Floor mounted bench | 400 plus tile and remnant top |
| Fold down bench (customer supplies bench) | 250 |

**Shower shelf**

| Type | Price |
|---|---:|
| White or glass shelf | 75 |
| Stone shelf | 150 |

