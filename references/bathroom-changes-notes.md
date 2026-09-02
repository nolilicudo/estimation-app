# Bathroom Changes Implementation Notes

## Completed
1. Fixture actions: "Relocate" → "Wall Mounted Change" (vanity_sink only), "Update In Place" → "Install New Trim Only" (all), bidet deactivated
2. Shampoo storage section removed entirely (UI + pricing)
3. Radiant heat pricing engine updated: separate from other electrical items, uses brand multiplier (Schluter 1.0, Vevor 0.6), bench_only = 6 sqft, panel upgrade = $2500

## In Progress — Electrical Section UI Overhaul
- Need to replace the radiant heat quantity +/- with a multi-step flow in the UI
- The electrical section is at line ~2340 in DesignPackageCalculator.tsx
- Current radiant heat uses `electricalQtys.get('radiant_heat')` for sqft — need to replace with new state vars
- New state vars added: radiantHeatMode, radiantHeatCoverage, radiantHeatBrand, radiantHeatSqft, radiantPanelCapacity

## Key Line Numbers (approximate after edits)
- State declarations: ~237-244
- Pricing engine (bathroomPricing useMemo): starts ~300, electrical at ~342, radiant at ~354
- Electrical UI section: ~2340
- Dependency array: ~684

## Remaining Items (Phase 3+)
- Electrical UI: show section total that updates dynamically
- Radiant heat UI: multi-step flow (mode → coverage → brand → sqft → panel check)
- Curbless shower: joist type verification (I-joist, engineered, dimensional)
- Niches: multiple selection + lighting
- Glass: frameless/wrought iron, height, door mount
- Tile outside shower: sqft OR L×W
- Stone casing: $400 add-on
- Painting: bathroom-only vs other areas, sqft-based calc
- Vanity: custom/stock/install-only, floating as material option, countertop length
- Countertops: reorder to #10
- Multi-bathroom support

## DB Schema Changes Made
- dp_bathroom_electrical_options: added `pricingType` column (VARCHAR 32, default 'per_unit')
- dp_bathroom_accessories: new table (8 items seeded)
- dp_bathroom_floating_vanity_config: new table (singleton, id=1)
- dp_bathroom_fixture_types: bidet set is_active=0
- dp_bathroom_fixture_actions: bidet actions is_active=0, vanity_sink relocate label changed, all update labels changed
