# Project TODO

- [x] Basic homepage layout with Mountain Modern design
- [x] Tanzite Stone calculator (Rainier & Appalachian collections)
- [x] Collection picker, color picker, dimensions, edge options
- [x] Stairs section, labor tiers, delivery options
- [x] Cost summary panel with sticky sidebar
- [x] Mobile responsive with sticky bottom summary
- [x] Admin portal with full configuration management
- [x] Company logo integration throughout site
- [x] Material comparison section (Tanzite vs wood/composite/resin stone)
- [x] Demo & Rebuild section with 5 sub-categories
- [x] Simplified edge options (edge restraint only per collection)
- [x] Custom admin login (tanner@designyourprice.com / Design123)
- [x] Multi-product toggle: Resin Rock calculator
- [x] Multi-product toggle: Duradek/Tiledek calculator
- [x] Admin tabs for all product configurations
- [x] Multi-select demolition options (allow selecting multiple demo/rebuild options simultaneously)
- [x] Comparison section toggles (control which materials appear in chart)
- [x] Cross-product comparison (compare quotes across all 3 product types)
- [x] Admin labor cost + margin% → displayed price model (labor cost ÷ (1 - margin%) = estimate price)
- [x] Admin toggle to disable itemized pricing (show only totals on estimate)
- [x] Comparison section: replace static Resin Stone with live Resin Rock calculator estimate
- [x] Comparison section: add Duradek as a comparison row
- [x] Appalachian waterproof add-on: Trex RainEscape + concealed gutter system option
- [x] Appalachian waterproof: soffit material selection (T&G Wood, T&G PVC, Standard Aluminum, Painted Cement Board)
- [x] Separate Rainier vs Appalachian labor tiers (each collection has its own rates)
- [x] Custom line items per labor tier in admin (add/edit/delete arbitrary cost items)
- [x] Minimum price floor per labor tier (if sqft × rate < minimum, use minimum)
- [x] Shared square footage across all product tabs (Tanzite, Resin Rock, Duradek)
- [x] Admin discount button (toggle on/off, custom name, flat/percent amount)
- [x] Hide pricing / scope-of-work mode toggle in admin
- [x] Print estimate button (prints only estimate panel, not full page)
- [x] Email estimate button via Zapier webhook (capture customer name/email, send estimate data to Zapier)
- [x] Expand Email Estimate dialog to collect client name, address, phone, and email
- [x] When Rainier collection is selected, add Trex RainEscape cost to Natural Wood and Composite comparison rows
- [x] Admin toggle to show/hide Duradek/Tiledek product tab (hidden by default on customer side)
- [x] Comparison section: Duradek defaults to off, only shown when show_duradek admin setting is enabled
- [x] Facade repair options: add minimum price floor per option (cost = max(sqft × rate, minimum))
- [x] Three-path hero section: Brochure, Book Appointment, Order Material card- - [x] Brochure modal: capture name, email, phone -> send to Zapier -> Go High Level campaign
- [x] Book Appointment modal: embed GHL calendar (WfipIjVQBk9mvkKjZhTO)
- [x] Order Material flow: in-app contract with digital signature (typed name + checkbox)
- [x] Stripe integration: 50% deposit payment after contract signing
- [x] Stripe: second 50% payment link for delivery (admin-triggered)
- [x] Orders DB table: store order, contract signature, payment status, Stripe payment intent IDs
- [x] Admin orders panel: view submitted orders, payment status, signed contracts
- [x] Admin settings: editable contract text field (stored in DB, loaded into Order Material modal)
- [x] Admin Verbiage tab: "Preview Contract" button with sample values renders the contract template
- [x] Zapier webhook: fire "order_signed" event after deposit with PDF contract as base64 attachment
- [x] Appointment modal: allow scrolling inside the GHL calendar embed to see all time slots
- [x] Appointment modal: show thank-you screen with Back to Calculator button after booking is confirmed
- [x] Deck framing: add minimum price floor per framing option
- [x] Deck framing: separate rate for Rainier vs Appalachian (rainierRate column)
- [x] Deck framing: auto-add subfloor line item when Rainier collection is selected
- [x] Admin: expose framing minimum, Rainier rate, and subfloor settings
- [x] Estimate PDF: label subfloor line items clearly in the estimate table
- [x] Contract text: update default to reference subfloor work in scope of work section
- [x] Dimensions: replace single sqft input with length x width fields that calculate sqft
- [x] Dimensions: replace waste% with corners count (min 3, default 4) + all-90-degrees checkbox
- [x] Admin: Corners/Waste table - editable mapping of corners + 90deg flag to waste percentage
- [x] Subfloor: price-per-sheet field in framing admin; cost = sheets x price (sheets = ceil(sqft/32) + bonus if >5)
- [x] Hot tub section: yes/no toggle; if yes show person size (2-10), joist span, home address
- [x] Hot tub: USU snow load lookup from address (https://www.usu.edu/utahsnowload/)
- [x] Hot tub: auto-recommend joist size and beam size from snow load + span tables
- [x] Hot tub: verified checkbox; if not matching auto-toggle demo + framing
- [x] Framing: show joist span input when framing selected; auto-fill from hot tub address
- [x] Framing: lumber package - joists, hangers, rimboards, beams, hardware itemized by quantity
- [x] Admin: Lumber Package pricing tab with cost per item, markup, and displayed price
- [ ] Hot tub expanded form: person capacity selector (2–10 people) with visual picker
- [ ] Hot tub expanded form: hot tub weight field (lbs, auto-filled from capacity estimate)
- [ ] Hot tub expanded form: joist span input (ft) with helper text
- [ ] Hot tub expanded form: home address field for snow load lookup
- [ ] Hot tub expanded form: USU snow load lookup button → display ground snow load (psf)
- [ ] Hot tub expanded form: auto-recommend joist size (2×10, 2×12) and beam size from snow load + span
- [ ] Hot tub expanded form: "Verified by engineer" checkbox — if unchecked, auto-enable demo + framing
- [ ] Hot tub expanded form: structural notes/warnings displayed based on snow load result
- [ ] Hot tub: show estimated structural upgrade cost in the estimate breakdown
- [x] Hot tub: replace tributary width input with simplified placement question (middle of span vs near post)
- [x] Subfloor: fix sheet count to ceil(sqft / 32) with no bonus sheet — sheets = ceil(total sqft / 32)
- [x] Lumber admin: change markup multiplier to margin % (margin = (price - cost) / price × 100)
- [x] Lumber admin: add "Apply same margin to all" toggle with a global margin % input
- [x] Lumber package: add sales tax % setting and lumber delivery fee to the package total
- [x] Dimensions: add mode toggle — enter L×W fields OR a single sqft number directly
- [x] Add primary Project Address field to calculator; auto-populate hot tub snow load address from it
- [x] Admin: Structural Calc tab — show/edit hot tub data, joist span tables, beam sizing tables, and snow load parameters
- [x] Admin: Make engineering tables editable — move joist spans, LVL beam entries, hot tub weights to DB with CRUD
- [x] Hot tub: size ALL joists for hot tub load (worst-case mid-span) so tub can be placed anywhere on dec- [x] Hot tub: implement dimensional lumber -> LVL -> glulam beam hierarchy
- [x] Hot tub: glulam sizing from Boise Cascade 24F-V4 floor load tables (100% load duration)
- [x] Hot tub: display beam type badge (Dimensional / LVL / Glulam) with size and PLF capacity
- [x] Admin: add glulam beam table (Boise Cascade 24F-V4 data) with CRUD
- [x] Estimate: auto-configured lumber package callout — quantities (joists, rim boards, beam, hangers, hardware) calculated from load calc results (joist size, beam type/size, span, deck dimensions)
- [x] Joist sizing: auto-calc spacing (12" vs 16" OC) based on span + snow load (e.g. 12ft span + 50psf snow = 1200 lbs/joist at 12" OC)
- [x] Joist sizing: recommend both 12" OC and 16" OC options with required joist size for each
- [x] Cantilever bay-out: add question in framing section — is ledger area cantilevered over foundation?
- [x] Cantilever: input for cantilever length (ft); calc double beam sized to carry half joist load, with hangers
- [x] Post spacing optimizer: ask if priority is minimize posts (upsize beam) or minimize cost (add post)
- [x] Post spacing: calculate optimal post spacing from beam capacity and chosen priority
- [x] Lumber package: auto-configure quantities (joists, rim board, beam LF, hangers, post bases/caps, screws, tape) from load calc
- [x] Lumber package: show itemized callout in estimate with quantities x unit price = line total
- [x] Beam catalog: add dimensional beam items (2x8 through triple 2x12, per LF) to lumber_items
- [x] Beam catalog: add glulam beam placeholder items (pricing TBD) to lumber_items
- [x] Stairs: replace current stair section with doorway height input (inches off ground)
- [x] Stairs: show two riser options — standard (7"-7.5") and easy (6"-6.5") — with step count and total run
- [x] Stairs: landing check — checkbox for 3'x3' minimum landing at base
- [x] Stairs: landing material selector (concrete, stone, other) with optional pricing
- [x] Fix joist spacing calc: 16" OC must require equal or larger joist than 12" OC (wider spacing = more load per joist)
- [x] Framing lumber package: auto-fill span, snow load, joist size, beam size from hot tub section when both are filled out
- [x] Framing section: same structural calc flow as hot tub (span, snow load, address, joist/beam recommendation) when new framing is selected
- [x] Railing calculator: DB table (railing_options) with wire railing and custom welded powder-coated (horizontal/vertical bars) options
- [x] Railing calculator: auto-calc LF from edge LF + stair steps (1.2 LF per tread per side, rounded up)
- [x] Railing calculator: 24" height check — warn/auto-enable railing when deck is 24"+ off ground
- [x] Railing calculator: stair railing selector — one side or both sides
- [x] Railing calculator: wire railing vs custom welded railing type picker
- [x] Railing calculator: custom welded — horizontal vs vertical bar orientation picker
- [x] Railing calculator: edge-mounted configuration note in estimate
- [x] Admin: railing options tab — price per LF, markup, active/inactive toggle
- [x] Estimate: railing line item in cost summary with LF quantity and total
- [x] Subfloor: fix sheet calc to sqft/32 rounded up with bonus sheet option; default price $35/sheet in admin
- [x] Stairs: add base price + per-LF pricing after 4ft; minimum stair width 3ft; default 4ft in UI
- [x] Framing: add engineering cost ($400) and permit ($300) when framing selected; mandatory for second-story deck
- [x] Admin Lumber Items: Apply Margin to All must update all margin % fields and recalculate prices live
- [x] Railing: change deck height question to yes/no "Is the deck over 24 inches tall?"
- [x] Railing: LF from stairs = steps × 1ft × 1.2 multiplier (doubled if railing on both sides)
- [x] Railing: auto-adjust total railing LF based on current step count and edge LF
- [x] Admin: all pricing items (accessories, edge options, demo, footing, concrete, framing, facade, etc.) must show cost $, margin %, and price $ fields
- [x] Stairs: add stair type selector — Standard, Spiral, or Landing Turn
- [x] Stairs: landing count input when Landing Turn is selected
- [x] Stairs: auto-add center support when steps > 10 (doubled 2x12 + 4x4 posts + extra footings on each side)
- [x] Spiral stairs: default diameter 60", expandable size selector
- [x] Spiral stairs: tread material selector (Metal Diamond Grate, Dekton, Stone Decking, Resin Rock)
- [x] Admin: dedicated Stairs tab with pricing for Standard, Spiral, and Landing Turn stair types
- [x] Admin: move subfloor settings from Pricing Settings tab to Lumber Items tab
- [x] Structural calc: move joist span, post spacing, cantilever, snow load inputs from Hot Tub section to Framing section
- [x] Structural calc: framing section always drives the base lumber package (deck load + snow load)
- [x] Hot tub: simplify to toggle + person size selector only; adds hot tub PSF load on top of base deck structural calc
- [x] Structural calc: when hot tub is enabled, re-run joist/beam sizing with combined load (deck + hot tub PSF)
- [x] LumberPackageCallout: drive from framing structural state (not hot tub state); show hot tub load adjustment note when hot tub is enabled
- [x] Demo: concrete removal gets its own separate sqft input (independent of other demo items)
- [x] Demo: add minimum price field per demolition option (admin + DB)
- [x] Demo: enforce minimum price in cost calc (max(sqft × rate, minimum))
- [x] Concrete: add Concrete Pump ($1,000) and Concrete Buggy ($350) as optional add-ons
- [x] Concrete: pump/buggy add-ons selectable in UI and included in concrete cost total
- [x] Concrete: pump/buggy prices editable in admin
- [x] Framing (Rainier): subfloor becomes a selectable option (checkbox/toggle) instead of auto-added
- [x] Framing (Rainier): subfloor only appears when Rainier collection is selected
- [x] Framing (Rainier): subfloor cost included in estimate when selected
- [x] Lumber package: per-item "needs lift" checkbox on each lumber line item
- [x] Lumber package: admin-configurable beam size thresholds for 1-lift and 2-lift requirements
- [x] Lumber package: auto-suggest lift based on beam size threshold; user can override per item
- [x] Lumber package: lift cost added to framing/lumber subtotal in estimate
- [ ] Soffit: add aluminum soffit option to soffit_items table
- [ ] Soffit: add materialCost + installCost columns; displayed price = (materialCost + installCost) × margin
- [ ] Exterior facades: add materialCost + installCost columns; displayed price = (materialCost + installCost) × margin
- [ ] Rain escape: add materialCost + installCost columns; displayed price = (materialCost + installCost) × margin
- [ ] Railing: add materialCost + installCost columns; displayed price = (materialCost + installCost) × margin
- [ ] Stairs: add materialCost + installCost columns; displayed price = (materialCost + installCost) × margin
- [ ] Admin: update soffit, facade, rain escape, railing, stair panels to show separate material cost and install cost fields
- [ ] Stairs: support multiple stair configurations per project (add/remove stair runs)
- [ ] Stairs: each stair run has its own style, width, tread count, and material selection
- [ ] Framing: add "existing deck replacement" toggle to structural framing section
- [ ] Framing: when existing deck replacement is toggled, show post installation input (existing post spacing in ft)
- [ ] Framing: existing post spacing feeds into beam sizing calc (beam must span existing post spacing)
- [ ] Lumber items: add category field to lumber_items table
- [ ] Lumber items: add sortOrder field; auto-assign to bottom of list on create; bump-down logic when inserted at specific position
- [ ] Lumber items: admin UI shows category column and sortOrder with position-insert controls
- [ ] Stairs: replace height-off-ground input with stair count input (number of steps)
- [ ] SerpApi: add SERPAPI_KEY secret to project
- [ ] SerpApi: add homeDepotSku, lastSyncedPrice, lastSyncedAt fields to lumber_items schema
- [ ] SerpApi: build admin.syncLumberPrices tRPC procedure (calls SerpApi for each item with SKU, auto-applies price)
- [ ] SerpApi: schedule auto-sync every 4 days via cron job
- [ ] SerpApi: add "Sync from Home Depot" button + last-synced timestamp in admin Lumber Items tab
- [ ] Lumber items: seed pressure treated lumber category with Home Depot SKUs (Lindon store #4407)
- [ ] Lumber items: seed Doug Fir dimensional lumber category with Home Depot SKUs (Lindon store #4407)
- [x] Admin: Sign Requests tab — list all pending/signed/expired sign requests with timestamps and status badges
- [x] Admin: Sign Requests tab — show customer name, email, total, collection, signed name, signed at, expiry
- [x] Admin: Sign Requests tab — "Resend" button to re-send signing link email to customer
- [x] Owner notification: fire notifyOwner when a customer signs a contract (via signAndPay mutation)
- [x] Reminder email: scheduled job (daily check) sends GHL follow-up email 3 days after sign request created if still pending
- [x] Sign Requests tab: "Download Contract PDF" button for signed requests — generates PDF from contract text + signature
- [x] Admin settings: "Reminder after X days" setting (default 3) and "Max reminders per request" setting (default 2)
- [x] Sign reminder job: respect reminder_after_days and max_reminders settings from DB; track reminder_count on sign_requests
- [x] GHL: on contract signing, move opportunity to "Contract Signed" pipeline stage (update opportunity status via GHL API)
- [x] After signing: automatically email the signed contract PDF to the customer via GHL\n
- [x] Fix duplicate React key warnings on home page (colors, labor, delivery, edge options lists)

- [x] Checkout: adjustable deposit amount (% or flat $) on Order Material page; default 50%
- [x] Contract: add language "No work will begin until the full deposit is received"
- [x] Admin: make full contract text editable in admin Verbiage tab (already partially done -- verify deposit clause is included)
- [x] Email estimate: block sending if same-day discount is currently applied (show error/warning)
- [x] Custom project details: DB table for detail options (label, active); multi-select dropdown on calculator
- [x] Admin: CRUD panel for custom project detail options (add/edit/delete/reorder)
- [x] GHL: update API key to new key with Conversations scope
- [x] GHL: fix duplicate opportunity — check for existing opportunity on contact and update it instead of creating a new onee\n
- [x] Estimate email: add "Review & Sign" button that links to a pre-filled signing page from the customer's inbox
- [x] Public sign-from-email page: token-authenticated page that pre-fills contract/deposit from sign request data

- [x] Admin Sign Requests tab: show clickable "Open" signing link button on each row (pending and signed)\n
- [x] Fix: scope of work / itemization in estimate email has duplicate line items — each item must appear exactly once
- [x] Fix: hardware accessories (Grooved Clips, Joist Tape, etc.) appear twice in estimate email scope — remove from scope list, keep in pricing breakdown only

- [x] Email estimate form: add City field (required)
- [x] Email estimate: pass city through to GHL contact and email body
- [x] DB: sent_emails table — store every sent estimate email with customer info, snapshot, sign URL, timestamps
- [x] Admin: Sent Emails tab — list all sent emails with resend and open signing portal buttons
- [x] Estimate email: include signing portal link as plain text below the button
- [x] Admin: Contracts tab — manage contract verbiage per service type with add/edit/delete/preview


- [x] Calculator buttons: apply active/selected highlight to all option buttons (collection, color, edge, accessories, labor, delivery, demo, framing, facade, rain escape, soffit, railing, stairs, etc.)
- [x] Estimate email: show all selected add-ons (demo, framing, facade, rain escape, soffit, railing, stairs, accessories) without itemized prices per line
- [x] Estimate email: Sign & Approve button must always appear when a sign request token exists (not conditional on showPricing)

- [x] Fix: hardware/accessory items still appearing twice in estimate email scope of work (removed duplicate DB rows; added showInScope flag to accessories — toggle in Admin > Accessories)
- [x] Fix: Sign & Approve button in email is now always a live hyperlink when signUrl exists; falls back to call-us message when no URL

- [x] Sign/payment page: remove "Back" button that navigates to the full cost calculator
- [x] Sign/payment page: read-only estimate summary (scope of work + pricing breakdown) already present on ContractSign page; OrderSuccess now shows contact info only with no calculator link

- [x] Auto-add permit assistance to estimate whenever structural framing is enabled

- [x] PIN gate: store calculator PIN in admin settings (default 1476)
- [x] PIN gate: build PinGate component with 4-digit keypad UI
- [x] PIN gate: wrap the estimator (Home) page so it requires PIN before showing the calculator
- [x] PIN gate: PIN unlocks for the browser session (sessionStorage) so user doesn't re-enter on refresh within same tab

- [x] Admin Contracts tab: seed stone deck contract verbiage as the default template
- [x] DB: add photo_urls column to sign_requests table (JSON array of S3 URLs)
- [x] Backend: add uploadContractPhoto tRPC procedure (upload to S3, return URL)
- [x] Backend: after signing, attach photos to GHL contact as a note with all photo URLs
- [x] ContractSign page: add required photo upload step (1–6 photos) before signing is allowed

- [x] DB: calculator_users table (id, name, email, phone, pin 4-digit, isActive, createdAt)
- [x] Backend: CRUD procedures for calculator_users (list, create, update, delete, toggleActive)
- [x] Backend: validatePin procedure — checks entered PIN against active calculator_users, returns user name on match
- [x] Admin: Calculator Users tab — list all users with name/email/phone/PIN/status; add/edit/deactivate/delete
- [x] PinGate: validate PIN against user list via validatePin procedure; greet user by name on success
- [x] Legacy single calculator_pin still works as fallback when no users exist

- [ ] DB: add role (super_admin|manager|rep), managerId (self-ref FK), permissions (JSON), title, companyPhone to calculator_users
- [ ] DB: add assignedUserId FK to sign_requests and sent_emails tables
- [ ] Backend: update calculatorUsers CRUD to handle role, managerId, permissions
- [ ] Backend: validatePin returns full user profile (role, permissions, contact info)
- [ ] Backend: scoped queries — reps see only their own estimates/contracts; managers see their reps + own; super admins see all
- [ ] Backend: permission check middleware for admin procedures (respect per-user permission toggles)
- [ ] PinGate: store full user profile in sessionStorage after PIN unlock (name, email, phone, title, role, permissions)
- [ ] Estimate form: auto-fill rep name, email, phone from sessionStorage when a calculator user is logged in
- [ ] Estimate email: include rep name/contact in the email so customer knows who sent it
- [ ] sendEmail procedure: attach assignedUserId from the logged-in calculator user to sent_emails record
- [ ] signAndPay procedure: attach assignedUserId to sign_requests record
- [ ] Admin panel: rebuild Calculator Users tab — show role badge, manager assignment dropdown, permission toggles per user
- [ ] Admin panel: super admins see all tabs; managers see their team's estimates/contracts; reps see only their own
- [ ] Admin panel: per-user permission toggles (view estimates, view contracts, view sign requests, resend emails, manage accessories, manage pricing, manage settings) — toggled by manager/super admin
- [ ] Admin panel: "My Team" view for managers — list of assigned reps with their activity
- [x] Role-based user permissions: super_admin, manager, rep roles with hierarchy
- [x] Calculator Users panel: role selector, manager assignment, per-user permission toggles
- [x] Permissions can be toggled on/off by manager or super admin for users below them
- [x] Super admins have full access to all admin panel tabs
- [x] Managers see their team's estimates and contracts; reps see only their own
- [x] Contracts (Sign Requests) tab: role-scoped view with Assigned To column
- [x] Sent Emails tab: role-scoped view with Assigned To column
- [x] Admin panel header shows logged-in user name and role
- [x] Admin panel tabs filtered by permissions (pricing tabs hidden from reps/managers without editPricing)
- [x] Calculator Users panel: Calculator Users tab only visible to super_admin and managers with manageUsers permission
- [x] Auto-fill: logged-in rep's contact info shown as "Sending as" banner in estimate email dialog
- [x] Estimate assignment: assignedUserId stored on sentEmails and signRequests when estimate is sent
- [x] Rep info (name, email, phone, title) passed with every estimate send for tracking
- [x] Comparison section: default all comparison items to OFF; admin panel controls which are enabled
- [x] Auto-sync price for a lumber item immediately when its Home Depot SKU is manually entered or changed in the admin panel
- [ ] Sync All button in Lumber Items panel header to re-fetch all SKU prices at once
- [ ] Stale SKU warning badge for items not synced in 7+ days
- [ ] Price change history log showing old→new price per sync event
- [ ] (Note: Sync All, stale badge, price history deferred — dashboard reorganization took priority)
- [x] Project Management tab: schema fields (project status, notes, photos, line items)
- [x] Project Management tab: server procedures (getProjects, updateProject, uploadPhoto)
- [x] Project Management tab: UI with project cards showing all job details and line-item cost breakdown
- [x] Admin panel: Option 3 dashboard home with quick-access category cards and section sub-tabs
- [x] Enhancify: add script to app and calculate monthly payment from total
- [x] Enhancify: show "or payments starting at $xxx/month" under total cost in CostSummary
- [x] Enhancify: clicking the monthly payment amount opens the Enhancify popup widget
- [x] Enhancify: pre-fill loan amount in widget with project total
- [x] Enhancify: add financing badge to estimate email with toggle in send dialog
- [x] Enhancify: add Apply Now button to email financing badge linking to co-branded page with amount pre-fill
- [x] Enhancify: replace old payment calculator widget with new real widget (realwidget script) in the popup modal
- [x] Fix: Admin.tsx JSX error causing admin login page to fail
- [x] Fix: Enhancify real widget not loading application form in popup modal
- [x] Enhancify: replace real widget popup with fullpagewidget on monthly payment click
- [x] Verify: Numbers on order/admin page match calculator page (costs, materials, labor, taxes, totals)
- [x] Audit: Verify all numbers match across calculator, order page, and email estimate page
- [x] Fix: Discount not pulling over correctly to email estimate and checkout page
- [x] Fix: Grand total on email and checkout page doesn't match calculator page total
- [x] Fix: Stripe deposit charge should use discounted finalTotal, not grandTotal
- [x] Fix: Admin panel order display should show discounted finalTotal and deposit amount
- [x] Frost footing: add footing_sizes and footing_formulas DB tables with frost footing lookup data
- [x] Frost footing: add Footings admin tab with size pricing editor and formula editor
- [x] Frost footing: auto-calculate footing count and size from lumber package joist span + post spacing
- [x] Frost footing: display footing line item in CostSummary and pass through to email/order/admin
- [ ] A Steel Jacket: browse Google Photos albums and select best waterproofing images
- [ ] A Steel Jacket: upload selected images to CDN
- [ ] A Steel Jacket: add waterproofing_options DB table with A Steel Jacket entry and pricing
- [ ] A Steel Jacket: add Waterproofing pricing panel to admin panel
- [ ] A Steel Jacket: add photo gallery selector in calculator under Appalachian deck system waterproofing
- [ ] A Steel Jacket: include waterproofing cost in estimate total, email, and order modal
- [x] A Steel Jacket: new waterproofing option for Appalachian deck system (steel_jacket_options DB table)
- [x] A Steel Jacket: photo gallery selector with 9 curated CDN photos
- [x] A Steel Jacket: calculator integration (steelJacket cost in breakdown, subtotal, grand total)
- [x] A Steel Jacket: cost summary display with line items in scope and pricing panels
- [x] A Steel Jacket: admin panel tab (Scope → Steel Jacket) with CRUD pricing controls
- [x] A Steel Jacket: estimate snapshot and email/PDF line items
- [x] A Steel Jacket: admin project view shows steelJacket subtotal in cost breakdown
- [x] Labor tiers: add $4/sqft to all Appalachian labor tier prices (pricePerSqft) across all levels
- [x] Labor tiers: reset Appalachian "Materials Only" back to $0/sqft (no labor charge)
- [x] A Steel Jacket: set pricing to $28.00/sqft cost, $50.00/sqft customer price (44% margin)
- [x] Builder Pricing: toggle in calculator that applies 15% off materials and 10% off labor
- [x] Builder Pricing: show discounted line items clearly in cost summary and estimate
- [x] Builder Pricing: discount lines included in PDF contract and email line items

## Mood Board + Availability Calendar
- [x] DB: add project_notes column (text) to sign_requests and sent_emails tables
- [x] DB: add install_slots table (id, startDate, endDate, label, isAvailable, createdAt)
- [x] Calculator state: add moodboardNotes field to CalculatorState
- [x] MoodBoard component: visual preview panel showing selected stone color swatch, railing style, soffit material
- [x] MoodBoard component: customer notes textarea (stored in calculator state)
- [x] MoodBoard: added as Step 13 in calculator (shown after all selections are made)
- [x] Estimate snapshot: include moodboardNotes in snapshot JSON
- [x] Estimate email: include project notes section in email body and Zapier payload
- [x] Contract PDF: include project notes in the contract/estimate PDF
- [x] Admin order card: show project notes on the order detail view
- [x] Admin sent emails: show project notes on the sent email detail view
- [x] Availability Calendar: install_slots DB table with CRUD admin panel
- [x] Availability Calendar: admin UI to add/edit/delete install slots (date range, label, available toggle)
- [x] Availability Calendar: show available slots in calculator as urgency banner (Step 14)
- [x] Availability Calendar: slots shown with date ranges and urgency footer

## UI & Feature Changes (Apr 2026)
- [ ] Builder Pricing: hide quantities/line items in a collapsible dropdown (collapsed by default, expandable)
- [ ] Steel Jacket: move to Step 11 as "Under-Deck Waterproof System" within the Appalachian waterproof section
- [ ] Steel Jacket: add CMG Metals color picker (42 colors with hex swatches) to the steel jacket selection
- [ ] Steel Jacket: store selected CMG color on estimate snapshot, email, and admin card
- [ ] Post/Beam Wrap: add new section with 4 options (Painted Cement Board, Stain & Seal Existing Wood, Chamclad Wraps, None)
- [ ] Post/Beam Wrap: DB table (post_wrap_options) with pricing per LF
- [ ] Post/Beam Wrap: admin panel CRUD tab for post wrap pricing
- [ ] Post/Beam Wrap: calculator state, cost summary, estimate email/PDF line items
- [ ] Railing: add color selection (White, Black, Stainless Steel) to railing section
- [ ] Railing: store selected color on estimate snapshot, email, and admin card
- [x] Builder pricing quantities hidden in collapsible dropdown (total savings shown, details expand on click)
- [x] Steel Jacket merged into Step 11 as "Under-Deck Waterproof System" sub-section
- [x] CMG Metals color picker added to Steel Jacket section (26 colors with hex swatches)
- [x] Post & Beam Wrap: 4 options added (paint cement board, stain/seal existing, Chamclad wrap, no wrap)
- [x] Railing color selections: white/black/stainless color picker added as Step 1 before style selection

## Fixes & Features (Apr 4 Batch 2)
- [ ] Home Depot pricing: schedule auto-update every 2 weeks via cron job
- [ ] Railing color selection: fix bug where color cannot be selected
- [ ] Railing color: add "Other" option with write-in text field; same pricing as other colors
- [ ] Steel Jacket gallery: add photos from second Google Photos album
- [ ] Steel Jacket: remove cost breakdown line item from cost summary display
- [ ] Post Wrap: add post count input and beam LF input; auto-fill from lumber package
- [x] Design Package section: calculator step with project type selector, sqft input, rendering counts, and per-item toggles
- [x] Design Package pricing engine: sqft-based (arch/structural engineering), flat-fee (Manual J, REScheck, schematics), rendering-priced (3D renderings)
- [x] Design Package: 50% markup on all items (adjustable per item in admin)
- [x] Admin: Design Packages tab with full CRUD for all line items (name, pricing type, cost, markup, project types, rendering type, active/inactive)
- [x] Design Package: cost summary line items shown in CostSummary panel and grand total
- [x] Design Package: seeded with 13 default items (arch engineering, structural engineering, renderings, Manual J, REScheck, gas/electrical/plumbing schematics, material selections, cabinet drawings)
- [x] Remove Design Package Step 14 from the decking calculator
- [x] Create standalone DesignPackageCalculator page (mirrors decking style, focused on additions/remodels)
- [x] Logo click toggles between Decking Calculator and Design Package Calculator
- [x] Design Package calculator has its own hero, project type, sqft/rendering inputs, cost summary

## Design Package Calculator — Commission & Estimate Display (Apr 2026)
- [x] Design Package: hide itemized costs and markup from customer-facing estimate; show only bulk total
- [x] Design Package: remove per-item cost/markup labels from DesignPackageCalculator UI (customer view)
- [x] Admin Design Packages: add Sales Rep Commission section with configurable rates per project type
- [x] Commission defaults: bathroom/small kitchen = $750, full remodel = $1,000, addition = $2,000
- [x] Commission: bake into bulk total as hidden cost (not shown as a line item to customer)
- [x] Commission: store in DB (design_package_commission table or settings rows)
- [x] Commission: include in pricing engine total calculation

## Design Package Calculator — UI & Pricing Overhaul (Apr 2026)
- [x] Design Package: add 2 admin-configurable discount buttons (early bird + same day) matching decking estimator pattern
- [x] Design Package: project-type service exclusions — full remodels hide Manual J, REScheck, structural engineering
- [x] Design Package: Step 4 included services → push buttons (not toggles) styled like Step 1 collection picker
- [x] Design Package: hero CTAs — "Get a Brochure", "Book an Appointment", "Order a Design Package" before Step 1
- [x] Design Package: rename "gross margin" to "gross profit %" in admin panel and pricing engine (keep 50%)
- [x] Design Package: bottom bar — financing (Enhancify), email estimate, order design package button, early bird/same day discounts, reset calculator
- [x] Design Package: remove "Back to Decking Calculator" button from bottom of Design Package Calculator
- [x] Admin Design Packages: add Discounts section with 2 rows (name, %, active toggle, early-bird vs same-day type)

## Design Package Checkout Flow (Apr 2026)
- [x] Design Package: "Order Design Package" button opens same checkout flow as decking (contract, signature, photos, Stripe deposit)
- [x] Design Package: contract template selectable from Admin → Contracts (design-package type)
- [x] Design Package: sign request stored in sign_requests table with product_type = 'design_package'
- [x] Design Package: Stripe checkout session created with design package total as deposit amount
- [x] Design Package: signed contracts appear in Admin → Sign Requests tab alongside deck orders
- [x] Design Package: GHL opportunity updated on signing (same as deck flow)
- [x] Design Package: owner notification fired on signing

## Design Package Admin Portal (Apr 2026)
- [x] Create DesignPackageAdmin.tsx with same sidebar layout as Admin.tsx
- [x] Design Package admin tabs: Overview, Design Package Items, Commission, Discounts, Contracts, Sign Requests, Sent Emails
- [x] Admin portal toggle in header: switch between "Decking Admin" and "Design Package Admin"
- [x] Wire /admin-dp route in App.tsx for Design Package admin portal
- [x] Toggle persists across page loads (localStorage)

## Design Package — Major Feature Batch (Apr 2026)
- [x] Fix: Design Package admin item pricing input (cost/markup fields broken after portal split)
- [x] DB: add dp_free_features table (id, name, photoUrl, listPrice, isActive, sortOrder, createdAt)
- [x] DB: add dp_questionnaire_questions table (id, questionText, questionType, options JSON, photoUrl, sortOrder, isActive, createdAt)
- [x] Admin DP Free Features tab: CRUD with name, photo URL, list price, active toggle, photo preview
- [x] Admin DP Questionnaire tab: question builder with image upload, finish levels, bathroom/area questions
- [x] Calculator: Rough Pricing Questionnaire step — finish level picker (with photos), bathroom count, affected areas
- [x] Calculator: Free Features selection — push buttons, photo preview modal, strikethrough list price + FREE label
- [x] Calculator: Feasibility Study step (additions only) — $1000 price, rep toggle to hide/show
- [x] Pricing engine: free features show list price with strikethrough + FREE label, $0 added to total
- [x] Pricing engine: feasibility study $1000 added to Design Package total when enabled
- [ ] Feasibility Study: show monthly payment estimate + 0% for 18 months at checkout
- [ ] Feasibility Study: $250 rep commission + $500 drafter cost baked into $1000 price (not shown to customer)
- [ ] Admin DP: commission panel includes feasibility study commission ($250) as separate configurable row

## Parade Stoppers & Feasibility Study Updates (Apr 2026)
- [x] Rename "Free Features" → "Parade Stoppers" throughout calculator and admin panel
- [x] Parade Stoppers: single-select only (radio behavior — selecting one deselects the previous)
- [x] Parade Stoppers: verbiage "Free for same-day decision makers" in step header and description
- [x] Admin DP: rename Free Features tab → Parade Stoppers
- [x] Feasibility Study: when selected, only charge feasibility study at checkout (not design package)
- [x] Feasibility Study: show design package total as a "Rough Estimate" reference section (not a checkout line)
- [x] Rough Pricing Questionnaire: show customer answers in the estimate summary panel
- [x] Rough Pricing Questionnaire: include answers in email estimate body
- [ ] Rough Pricing Questionnaire: show answers in admin panel sent emails and sign requests detail view

## Checkout, Contract & Section Config (Apr 2026)
- [x] Checkout: remove Materials and Labor line items; show only full project price billed at signing
- [x] Checkout: Design Package and Feasibility Study both billed in full at signing (no partial deposit split)
- [x] Admin: custom contract editor — rich text, editable per project type, shown at checkout
- [x] Calculator: Project Type is Step 1; other steps populate based on selection
- [x] DB: dp_project_type_sections table — per project type, section key, label, isEnabled, sortOrder
- [x] Admin DP: "Calculator Sections" panel — per project type, toggle sections on/off, rename labels
- [x] Calculator: fetch section config and show/hide steps dynamically per project type

## Feasibility Commission Row & Questionnaire in Admin (Apr 2026)
- [x] Admin DP Commission panel: add configurable Feasibility Study commission row ($250 default)
- [x] Admin DP Sign Requests detail view: show questionnaire answers section
- [x] Admin DP Sent Estimates detail view: show questionnaire answers section

## Drag-to-Reorder in DP Admin (Apr 2026)
- [x] Admin DP: drag-to-reorder for Included Services items
- [x] Admin DP: drag-to-reorder for Add-Ons items
- [x] Admin DP: drag-to-reorder for Parade Stoppers items
- [x] Admin DP: drag-to-reorder for Questionnaire questions
- [x] Admin DP: drag-to-reorder for Calculator Sections (per project type)

## Parade Stopper Image Upload (Apr 2026)
- [x] Server: tRPC mutation to accept base64/multipart image upload, store in S3, return URL
- [x] Admin DP Parade Stoppers: image upload button per item (file picker + preview thumbnail)
- [x] Admin DP Parade Stoppers: show current image thumbnail with remove/replace option
- [x] Calculator Parade Stoppers step: display uploaded image on each card
- [x] Calculator Parade Stoppers: photo preview modal shows uploaded S3 image

## Bug Fixes (Apr 2026)
- [x] Fix: DP admin discount toggle — isActive 0/1 integer was treated as falsy boolean, toggle now saves immediately with a pill-style switch

## File Upload Replacement (Apr 2026)
- [ ] Create shared FileUploadZone component (image + PDF, S3 upload, thumbnail/PDF preview)
- [ ] Server: generic admin file upload tRPC procedure (base64 → S3 → return URL)
- [ ] Admin DP Parade Stoppers: replace photo URL text input with FileUploadZone
- [ ] Admin DP Questionnaire: replace option photo URL text input with FileUploadZone
- [ ] Admin DP Questionnaire: replace question-level photo URL text input with FileUploadZone

## File Upload Replacement (Apr 2026)
- [x] Create shared FileUploadZone component (image + PDF, S3 upload, thumbnail preview, remove button)
- [x] Server: tRPC uploadAdminFile procedure (generic, accepts any image or PDF, stores to S3)
- [x] Admin DP Parade Stoppers: replace photo URL text input with FileUploadZone (supports images + PDFs)
- [x] Admin DP Questionnaire: replace photo URL text input per option with FileUploadZone (supports images + PDFs)

## Batch 8: Two-Calculator Split (Bathroom/Kitchen Remodel vs. Addition)

- [x] Add calculator mode toggle at the top of DesignPackageCalculator (Bathroom/Kitchen Remodel | Addition)
- [x] Store calculatorMode state ('remodel' | 'addition') in DesignPackageCalculator
- [x] Remodel mode: project type selector shows only Bathroom and Kitchen options
- [x] Addition mode: project type selector shows only Addition option (sqft-based)
- [x] Feasibility Study step: only visible in Addition mode
- [x] Section config (isSectionEnabled) respects the active mode's project types
- [x] Summary panel and checkout modal reflect correct mode label
- [x] Pricing engine applies mode-specific logic (feasibility only in addition mode)
- [x] Write/update vitest tests for mode-split logic

## Batch 9: Monthly Home Depot Pricing Sync

- [x] Change Home Depot price sync interval from 4 days to 30 days (once a month)
- [x] Update check-poll interval from 6h to 12h (sufficient for monthly cadence)
- [x] Update log messages to reflect monthly schedule

## Batch 9: Monthly Home Depot Pricing Sync

- [x] Change Home Depot price sync interval from 4 days to 30 days (once a month)
- [x] Update check-poll interval from 6h to 12h (sufficient for monthly cadence)
- [x] Update log messages to reflect monthly schedule

## Batch 10: Jobtread Integration
- [x] Build Jobtread API helper (server/jobtread.ts) with createJob, upsertCustomer, createLocation, addBudgetLineItem, createProposal
- [x] Add JOBTREAD_GRANT_KEY and JOBTREAD_ORG_ID to env.ts
- [x] Add estimate.createJobtreadProject tRPC procedure in routers.ts
- [x] Wire "Next" button in DesignPackageCalculator email success state to create Jobtread project
- [x] 100% payment schedule (onSigning) included in proposal
- [x] Jobtread credential vitest tests added (server/jobtread.test.ts)

## Batch 11: Subtitle, Feasibility Config, Rendering Rename
- [x] Rename "Large Bathroom/Area" rendering to "Large Bathroom/Living Room"
- [x] Add subtitle column to design_package_items (DB + schema + router + admin + calculator)
- [x] Add Feasibility Study config panel to admin (price, rep commission, drafter cost, description, tags)
- [x] Calculator reads feasibility config from DB (price, description, tags all dynamic)
- [x] Per-project-type parade stopper enable/disable (projectTypes field + admin UI)
- [x] isDefaultEnabled field for design package items (admin toggle + calculator respects it)

## Batch 12: Send Questionnaire Feature
- [x] Rename "Order Design Package" button to "Send Questionnaire"
- [x] Add questionnaire DB schema (submissions, rooms, trades, inspiration_photos)
- [x] Build questionnaire tRPC router (send, getByToken, submit, getByPhone, admin CRUD)
- [x] Build customer-facing questionnaire page (/questionnaire/:token)
- [x] Add admin Questionnaire Submissions panel (submissions list, answer viewer)
- [x] Add admin Inspiration Photos panel (per-trade photo upload)
- [x] Wire Send Questionnaire button in design package calculator
- [x] Add phone-number lookup in rough pricing questionnaire step

## Batch 13: Mobile Compatibility Pass — DesignPackageAdmin.tsx
- [x] Submission list row: status/mode moved to second line on mobile (flex-wrap)
- [x] Commission row: stacked label and input on small screens (flex-col sm:flex-row)
- [x] Parade stopper view row: stacked photo and info vertically on mobile
- [x] Contracts create form: changed to single column on mobile (grid-cols-1 sm:grid-cols-2)
- [x] Contracts edit form: changed to single column on mobile (grid-cols-1 sm:grid-cols-2)
- [x] InspirationPhotos upload form: changed to grid-cols-1 sm:grid-cols-2
- [x] Audit all remaining panels for mobile issues (sign requests, sent emails, section config, questionnaire, feasibility, dashboard, nav)
- [x] All panels confirmed mobile-safe: flex-wrap, min-w-0, truncate, responsive grids throughout

## Batch 14: Mobile Compatibility Pass — DesignPackageCalculator.tsx
- [x] Hero top bar: logo button shrink-0, company name container min-w-0 + truncate
- [x] SectionSlab title: text-lg sm:text-xl + min-w-0 + break-words (prevents long admin labels from overflowing)
- [x] Feasibility Study card: price moved to flex-wrap row (no longer pushed off-screen by ml-auto)
- [x] Summary content "Calculator Mode" row: shrink-0 on label, min-w-0 + break-words on value
- [x] Summary content "Project Type" row: shrink-0 on label, min-w-0 + break-words on value
- [x] Summary content questionnaire answer rows: min-w-0 + break-words on both label and value
- [x] Summary content discount rows: min-w-0 + break-words on label, shrink-0 on amount
- [x] Summary content "Design Package Total" row: min-w-0 on label, shrink-0 on amount
- [x] Mobile summary header: min-w-0 + truncate on label, shrink-0 on price+chevron group
- [x] Financing button (mobile + desktop): flex-wrap + shrink-0 icon + span wrapper to prevent awkward line breaks
- [x] Desktop summary header: min-w-0 + truncate on title

## Batch 15: Hero CTA Button Rename
- [x] Rename "Order a Design Package" hero button to "Send Selections" in DesignPackageCalculator.tsx

## Batch 16: Summary Panel Button Rename
- [x] Rename "Order Design Package" mobile summary button to "Send Selections"
- [x] Rename "Send Questionnaire" desktop summary panel button to "Send Selections"

## Batch 17: Jobtread Integration — Order Design Package
- [x] Fix HTTP 400 "email field does not exist at account" — search contacts by email instead of accounts
- [x] Remove email from createAccount payload; create contact with email+phone after account creation
- [x] Add budgetLineItemName field to createJobtreadProject (server/jobtread.ts + routers.ts)
- [x] Wire Jobtread project creation into OrderMaterialModal via jobtreadParams prop (fires after signing)
- [x] Pass jobtreadParams from DesignPackageCalculator with "Dreams to Reality Design Package" line item name
- [x] Scope of work includes all included services as bullet list
- [x] 5 new unit tests for Jobtread upsertCustomer fix and budgetLineItemName behavior

## Batch 18: Jobtread Rich Scope-of-Work
- [x] Jobtread scope now includes: project overview (mode, type, sq ft), rendering counts, included services with pricing, parade stoppers/add-ons, discounts applied, questionnaire responses, and full pricing summary

## Batch 19: Jobtread HTTP 400 Complete Fix
- [x] Identify root cause: JOBTREAD_ORG_ID was "DesignYourPrice" (app title), not real org ID
- [x] Retrieve correct org ID (22Na3vQB6sqD) from live Jobtread API using grant key
- [x] Update JOBTREAD_ORG_ID secret to correct value
- [x] Validate all Pave API field names against live API via curl testing
- [x] Fix createJob: remove organizationId (inferred from grant key, causes 400 if passed)
- [x] Fix createBudgetItem: replace with createCostGroup + createCostItem (createBudgetItem does not exist)
- [x] Fix createCostItem: add required costCodeId and costTypeId fields
- [x] Fix createDocument: add required fromName, taxRate, jobLocationAddress, jobLocationName, dueDate fields
- [x] Fix createDocument name: must be "Design Package" (org template name)
- [x] Fix upsertCustomer: search by account name (email search not supported by API)
- [x] Remove email from createContact (email field does not exist on contact node)
- [x] Update unit tests to match new validated implementation
- [x] Restart dev server to pick up new JOBTREAD_ORG_ID env variable

## Batch 20: Jobtread Itemized Budget Services
- [x] Update addBudgetLineItem to accept services array and create one costItem per service
- [x] Add services field to JobtreadProjectInput interface in jobtread.ts
- [x] Add services z.array schema to createJobtreadProject tRPC procedure
- [x] Pass individual lineItems as services array from DesignPackageCalculator jobtreadParams
- [x] Add services field to jobtreadParams type in OrderMaterialModal.tsx
- [x] Pass services through createJobtreadProject.mutate call

## Batch 21: Jobtread Budget Cost Item Enhancements
- [ ] Add scope of work text to cost item description field in jobtread.ts
- [ ] Set unitPrice = calculator price, unitCost = 65% of unitPrice in createCostItem
- [ ] Pass scopeOfWork through services array in DesignPackageCalculator jobtreadParams
- [ ] Update jobtread-api skill reference file with new pricing model

## Batch 21: Jobtread Budget Item Pricing & Scope
- [x] Add unitPrice (calculator sell price) and unitCost (65% of unitPrice) to each Jobtread cost item
- [x] Add scope of work text to each cost item description field
- [x] Fix job name truncation to use budgetLineItemName prefix (≤30 chars)
- [x] Add scopeOfWork field to BudgetServiceItem interface in jobtread.ts
- [x] Add scopeOfWork to OrderMaterialModal services type
- [x] Pass per-service scopeOfWork from DesignPackageCalculator to jobtreadParams
- [x] Update jobtread-api skill pave-field-guide.md with unitPrice/description/pricing model

## Batch 22: Jobtread Scope Placement Fix
- [x] Remove scopeOfWork from createDocument description field
- [x] Confirm scopeOfWork stays on createCostItem description field only

## Batch 23: Jobtread Budget Restructure
- [x] Name cost group after project type (e.g. "Addition", "Bathroom Remodel") — added `costGroupName` field to `JobtreadProjectInput` interface and `createJobtreadProject` in `server/jobtread.ts`
- [x] Pass `costGroupName` through `server/routers.ts` tRPC procedure input schema
- [x] Add `costGroupName?: string` to `jobtreadParams` type in `OrderMaterialModal.tsx` and pass it in mutate call
- [x] Pass project type label as `costGroupName` in `DesignPackageCalculator.tsx` jobtreadParams block
- [x] Each service as a cost item under that group: price = calculator amount, cost = 65% (already done in Batch 21)
- [x] TypeScript: 0 errors. Tests: 140/141 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 24: Jobtread Scope-of-Work Placement Fix
- [x] Remove `scopeOfWork` from `createJob` description (was appearing on Jobtread job dashboard — wrong place)
- [x] Add `description: scopeOfWork` to `createDocument` payload so full scope appears in the proposal/contract body
- [x] Confirm per-service `scopeOfWork` already correctly flows into each `createCostItem` description field (Batch 21)
- [x] Add new unit test: "scope of work goes into createDocument description, NOT createJob description"
- [x] TypeScript: 0 errors. Tests: 141/142 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 25: Scope-of-Work Audit Fix — Zod Schema Gap
- [x] Audited full scope-of-work data flow: Calculator → OrderMaterialModal → tRPC Zod schema → jobtread.ts → Pave API
- [x] Found gap: `services[].scopeOfWork` was missing from the Zod schema in `server/routers.ts` — Zod was silently stripping it before it reached `jobtread.ts`, so per-service descriptions never reached `createCostItem`
- [x] Fixed: added `scopeOfWork: z.string().optional()` to the `services` array schema in `routers.ts`
- [x] Added new unit test: "per-service scopeOfWork reaches createCostItem description in the budget tab" — verifies description, unitPrice, and unitCost (65%) for each service
- [x] TypeScript: 0 errors. Tests: 142/143 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 26: Jobtread Proposal Flow — Budget Items Linked + Auto-Send
- [x] Probed live Jobtread Pave API: discovered `documentId` on `createCostItem` links items to proposals
- [x] Discovered `updateDocument` with `status: "pending"` sends the proposal to the client
- [x] Confirmed `documentId` can ONLY be set at creation time (updateCostItem rejects it)
- [x] Restructured `createJobtreadProject` workflow: document created BEFORE cost items
- [x] Added `documentId` param to `addBudgetLineItem` and passed to each `createCostItem`
- [x] Added `sendDocument` function: calls `updateDocument` with `status: "pending"` after items are linked
- [x] New workflow order: Job → Document (draft) → CostGroup → CostItems (with documentId) → Send (pending)
- [x] Rewrote `jobtread.test.ts` with correct mock order and 3 new tests:
  - "cost items are linked to the proposal via documentId"
  - "proposal is sent to client via updateDocument status → pending"
  - "document is created BEFORE cost items (correct order for documentId linking)"
- [x] TypeScript: 0 errors. Tests: 145/146 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 27: Live Test Verification — costGroupId vs documentId fix
- [x] Live test 1 (with costGroupId): items NOT linked to document — confirmed API constraint
- [x] Probed API: costGroupId and documentId are MUTUALLY EXCLUSIVE on createCostItem
- [x] When both provided, documentId is silently ignored (items don't appear in proposal)
- [x] Fix: removed costGroupId from createCostItem — items now linked to proposal document
- [x] Live test 2 (without costGroupId): ALL 6 checks pass:
  - Cost items linked to proposal: ✅
  - All items have descriptions (scope of work): ✅
  - Pricing correct (cost = 65% of price): ✅
  - Document sent (status=pending): ✅
  - Scope in document body: ✅
  - Job dashboard clean (no description): ✅
- [x] Updated unit tests to remove createCostGroup mock and add documentId/costGroupId assertions
- [x] Tests: 145/146 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 28: Per-Project-Type Design Package Contracts
- [x] Added `projectType` column to `contract_templates` DB table (via direct SQL migration)
- [x] Added composite unique index on `(serviceType, projectType)` — replaces old single-column unique
- [x] Seeded 4 contract templates: bathroom, kitchen, full_home_remodel, addition (all with uploaded contract text)
- [x] Updated `getByServiceType` tRPC procedure to accept optional `projectType` and fall back to `default`
- [x] Updated `create` and `update` contract template procedures to accept `projectType`
- [x] Updated `DesignPackageCalculator` to pass current `projectType` when fetching contract template
- [x] Updated `jobtread.ts` `createProposal` to accept and append `contractText` as footer in `description`
- [x] Updated `createJobtreadProject` to pass `contractText` to `createProposal`
- [x] Added `DPProjectTypeContractsSection` component to admin Contracts tab — 4 editable cards (Bathroom, Kitchen, Full Home Remodel, Addition) with Configured/Not set badges
- [x] Added `projectType` to `create` and `update` Zod schemas in `routers.ts`
- [x] Tests: 145/146 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 29: Jobtread Proposal — Prepared By/For + Payment Schedule
- [x] Probed Jobtread Pave API: confirmed `fromName`, `fromEmailAddress`, `fromAddress`, `toName`, `toEmailAddress`, `toAddress` exist; `fromPhone`/`toPhone` do NOT exist
- [x] Add "Prepared By" to proposal: `fromName` = rep name + phone (embedded), `fromEmailAddress` = rep email, `fromAddress` = 751 E Technology Way Suite F11-03, Orem UT 84097
- [x] Add "Prepared For" to proposal: `toName` = homeowner name + phone (embedded), `toEmailAddress` = homeowner email, `toAddress` = project address
- [x] Add payment schedule to proposal description: "Full payment of $X.XX is due upon approval of this Design Package proposal"
- [x] Added `salesRepEmail`, `salesRepPhone`, `companyAddress` to `JobtreadProjectInput` interface
- [x] Updated `createProposal` to accept opts for rep/company info and compose fromName/toName with phone numbers
- [x] Updated `createJobtreadProject` to pass new opts to `createProposal`
- [x] Added `salesRepName`, `salesRepEmail`, `salesRepPhone`, `companyAddress` to tRPC Zod schema in `routers.ts`
- [x] Added same fields to `jobtreadParams` type in `OrderMaterialModal.tsx` and passed in mutate call
- [x] Added same fields to `jobtreadParams` in `DesignPackageCalculator.tsx` using `calUser` (logged-in rep) data
- [x] Tests: 145/146 passing (1 pre-existing SerpAPI billing quota failure)

## Batch 30: Admin Panel Improvements
- [x] Feasibility study configuration CRUD in admin panel (add/edit different feasibility study configs)
- [ ] Keep calculator accordion expanded by default when design package admin opens
- [ ] Add back button from dashboard cards to admin dashboard
- [ ] Delete sent estimates OR link to Jobtread proposal from admin orders/estimates panel
- [ ] Keep admin accordion (top-right calculator/design-package toggle) expanded by default
- [ ] Add back button from dashboard section cards to admin dashboard home
- [x] 3D rendered space items: add designHours column to design_package_items for Section 3 items
- [ ] Admin chart: show volume discount curve (10% stacked reduction per additional space, hours rounded up)
- [x] Calculator: Section 3 selected items appear in included services; unselected items removed from services
- [x] Multiple feasibility study configurations with differing scopes for additions
- [ ] Sent estimates: add delete button
- [ ] Sent estimates: add Jobtread link (store jobtreadJobId in sent_emails and orders tables)
- [x] Fix: Design Package admin header back button shows only arrow icon without "Calculator" text label
- [x] Add source:calculator tag/custom field to Jobtread proposals created through our app
- [x] Document Jobtread Workflow setup for auto-invoicing after Design Package proposal is signed
- [x] Jobtread: Add homeowner as recipient on Design Package proposal so it gets emailed to them
- [x] Design Package: include total design hours (with volume discount) in the scope of work sent to Jobtread proposal

## Questionnaire Builder (Pre-Visit)

- [x] DB: questionnaire_questions table (id, text, type: single|multi, sortOrder, imageUrl, isActive, parentQuestionId, parentOptionId)
- [x] DB: questionnaire_options table (id, questionId, text, imageUrl, sortOrder, priceAdjustment, priceAdjustmentType: flat|percent|range_min|range_max)
- [x] DB: questionnaire_sessions table (id, sessionToken, customerName, customerPhone, customerEmail, createdAt, completedAt)
- [x] DB: questionnaire_answers table (id, sessionId, questionId, selectedOptionIds JSON)
- [x] DB: questionnaire_price_rules table (id, name, baseMin, baseMax, conditions JSON)
- [x] Admin: Questionnaire Builder tab — create/edit/delete questions with type, image, sort order
- [x] Admin: per-question option editor — add/edit/delete options with text, image, price adjustment
- [x] Admin: branching logic editor — set "show this question only if answer to Q is X"
- [x] Admin: price rule editor — define base price range + adjustments per answer combination
- [x] Admin: drag-and-drop question reordering (up/down arrows)
- [ ] Admin: preview questionnaire flow from admin panel (future)
- [x] Admin: send questionnaire link to customer (generates unique shareable URL)
- [x] Admin: sent questionnaires panel — searchable by phone number, shows responses and rough estimate
- [x] Customer: public questionnaire page (/q/:token) — no PIN required
- [x] Customer: branching logic — show/hide questions based on prior answers
- [x] Customer: single-select and multi-select answer options with optional images
- [x] Customer: rough estimate output page — show price range based on answers and price rules
- [x] Customer: redirect to www.designyourprice.com after viewing estimate
- [x] Customer: collect name, phone, email before showing estimate

## Questionnaire Enhancement: Specific Questions + New Types

- [x] Schema: add `quantity_select` and `voice_photo` to questionnaire_questions type enum
- [x] Schema: add `quantities` (JSON map of optionId→qty) to questionnaire_answers
- [x] Schema: add `voiceTranscription` (text) and `photoUrls` (JSON array) to questionnaire_answers
- [x] Backend: update `submitAnswers` to accept quantities, voiceTranscription, photoUrls per answer
- [x] Backend: add `uploadQuestionnairePhoto` procedure (base64 → S3 → return URL)
- [x] Backend: add `transcribeQuestionnaireVoice` procedure (audioUrl → Whisper → return text)
- [x] Backend: update `getSessionById` to return quantities, voiceTranscription, photoUrls
- [x] Customer UI: `quantity_select` question type — option cards with +/- quantity stepper
- [x] Customer UI: `voice_photo` question type — microphone record button + transcription display + photo upload
- [x] Customer UI: branching — room-specific follow-up questions when specific rooms are selected in Q1
- [x] Customer UI: pricing engine accounts for quantities (qty × option price adjustment)
- [x] Admin builder: add `quantity_select` and `voice_photo` as question type options
- [x] Admin sessions: show voice transcription and uploaded photos in session detail view
- [x] Seed Q1: "What type of addition are you considering?" (quantity_select, 12 room options)
- [x] Seed Q2: "Are you looking for an addition in your yard or above your existing home?" (single_select, pricing impact)
- [x] Seed Q3: "Are you wanting to remodel or adjust part of the existing portion of your house?" (voice_photo)
- [x] Seed per-room follow-up questions about finish level for: Kitchen, Master Suite, Home Theater Room, Bedroom, Bathroom, Family/Game Room, Gym, Office, ADU, Garage, Kitchenette, Wet Bar

## Questionnaire Summary Screen

- [x] Customer UI: summary/review screen after all questions answered, before final submission
- [x] Summary: show selected rooms with quantities (Q1)
- [x] Summary: show yard vs. above-home selection (Q2)
- [x] Summary: show voice transcription text (Q3)
- [x] Summary: show uploaded inspiration photo thumbnails (Q3)
- [x] Summary: show per-room follow-up answers (finish level, existing condition)
- [x] Summary: "Edit" button per section to jump back to that question
- [x] Summary: "Submit" button to finalize and trigger estimate calculation

## Questionnaire Scope Fix

- [x] Remove Questionnaire Builder card/tab from the Decking admin panel (belongs to Design Package only)

## Design Package Questionnaire - Advanced Pricing Logic (from reference app)

- [x] Schema: add `inputType` enum (yes_no, number, dropdown, checkboxes, text) to questionnaire_questions
- [x] Schema: add `calculationRules` JSON column to questionnaire_questions (array of rules with conditions)
- [x] Schema: add `tradeCategory` text column for CSI division grouping
- [x] Schema: add `displayOrder` decimal column for precise ordering
- [x] Backend: update createQuestion/updateQuestion to accept inputType, calculationRules, tradeCategory, displayOrder
- [x] Backend: add formula evaluation engine (answer, sqft, room_sqft variables)
- [x] Backend: calculation rules with conditions (always_apply, equals, greater_than, less_than, between, contains)
- [x] Admin UI: add Input Configuration section to question form (input type selector)
- [x] Admin UI: add Calculation Rules section to question form (rule builder with conditions)
- [x] Admin UI: show formula variables reference (answer, sqft, room_sqft)
- [x] Admin UI: trade category grouping/accordion for question organization
- [x] Customer UI: render yes/no as toggle buttons
- [x] Customer UI: render number input with stepper
- [x] Customer UI: render dropdown as select
- [x] Customer UI: render checkboxes as multi-select cards
- [x] Customer UI: render text as textarea
- [x] Customer UI: apply calculation rules to pricing based on answers

## Connect Calculation Rules to Estimate Output

- [x] Backend: create procedure to evaluate all calculation rules from a questionnaire session's answers
- [x] Backend: integrate questionnaire-derived pricing into Design Package estimate generation
- [x] Frontend: display questionnaire pricing adjustments as line items in the estimate output
- [x] Frontend: show total questionnaire-based price alongside the Design Package estimate
- [x] Test: verify calculation rules flow end-to-end from questionnaire answers to estimate price

## Auto-Link Questionnaire Sessions to Estimates

- [x] Schema: add `questionnaireSessionId` column to the DP estimates table
- [x] Backend: update estimate creation procedure to accept and store questionnaireSessionId
- [x] Backend: update estimate retrieval to include linked questionnaire session data
- [x] Frontend: pass dynSessionId when creating/sending a DP estimate
- [x] Admin: show linked questionnaire session in estimate detail view (with link to open session)

## Questionnaire Restructuring — 10 Sections with Visual-Choice Pricing Tiers

### Schema Changes
- [x] Schema: add `section` varchar column to questionnaire_questions (10 section keys)
- [x] Schema: add `pricingTier` int column to questionnaire_options (1-5 for visual-choice tiers)
- [x] Schema: add `photoCategory` varchar column to questionnaire_answers (for structured photo uploads)
- [x] Schema: update questionnaire_questions type enum to include `photo_upload` type

### Seed Script — Full 10-Section Structure
- [x] Replace old 3-question seed with new 10-section seed script
- [x] Section 1: Project Basics (project type, sqft, room types, timeline, budget range)
- [x] Section 2: Existing Home Conditions (home age, foundation type, ceiling height, existing issues)
- [x] Section 3: Site & Access (yard access, setbacks, slope, utility lines)
- [x] Section 4: Structure / Foundation / Roof (roof type, foundation, load-bearing walls)
- [x] Section 5: Mechanical, Electrical & Plumbing (panel size, HVAC type, plumbing access)
- [x] Section 6: Exterior Finishes (siding type, roofing material, windows/doors)
- [x] Section 7: Interior Finishes (flooring, bathroom, kitchen — visual-choice tiers L1-L5)
- [x] Section 8: Trade-Specific Feature Upgrades (smart home, custom built-ins, specialty items)
- [x] Section 9: Overall Finish Level (visual-choice tier cards for each trade category)
- [x] Section 10: Photos / Inspiration Images (8 structured photo upload prompts)

### Visual-Choice Tier Images
- [x] Generate/source tier reference images for Flooring (L1-L5)
- [x] Generate/source tier reference images for Bathroom (L1-L5)
- [x] Generate/source tier reference images for Kitchen (L1-L5)
- [x] Generate/source tier reference images for Exterior Finishes (L1-L5)
- [x] Upload all tier images to S3 and store CDN URLs in seed script

### Customer UI Updates (DynamicQuestionnaire.tsx)
- [x] Add section-based navigation: section header with name and icon displayed above questions
- [x] Add section progress indicator (e.g., "Section 3 of 10 — Site & Access")
- [x] Add `image_choice` visual rendering: large image cards (2-col grid) with tier label overlay
- [x] Add `photo_upload` question type: structured upload with labeled category (e.g., "Electrical Panel")
- [x] Update SummaryReviewScreen to group answers by section
- [x] Show selected tier images in summary (thumbnail of chosen option)

### Admin UI Updates (QuestionnaireBuilderPanel.tsx)
- [x] Add section selector dropdown to question form (10 section options)
- [x] Add pricingTier field (1-5) to option editor in QuestionnaireBuilderPanel
- [x] Show section grouping in question list (group questions by section)

### Admin Session Detail View
- [x] Group questionnaire answers by section in admin session detail view
- [x] Show uploaded photos in their labeled categories (not just a flat list)
- [x] Show selected tier images with tier level badge in session detail

### Tests & Validation
- [x] Write tests for section-based question retrieval
- [x] Write tests for photo_upload question type submission
- [x] Write tests for pricingTier stored on options
- [x] Run full test suite and verify 215 tests pass (20 test files)

## Questionnaire Pricing Engine — Rough Price Range for Design Package

### Schema / Data Model
- [x] Add `questionnaire_pricing_tier_multipliers` table (sectionKey, tier, multiplier, weight)
- [x] Add `questionnaire_pricing_addons` table (questionId, optionId, label, amount, isActive)
- [x] Run pnpm db:push to migrate new tables

### Pricing Engine (server-side)
- [x] Write `server/questionnaire-pricing-engine.ts`: pure function that takes answers + rules and returns { midpoint, low, high, breakdown }
- [x] Layer 1: Match base price rule by project type (conditions on question answers)
- [x] Layer 2: Apply tier multipliers per section (weighted average of answered sections)
- [x] Layer 3: Apply flat add-on amounts for specific option selections
- [x] Layer 4: Apply option priceAdjustment (flat/percent) from questionnaire_options
- [x] Layer 5: Apply calculation rules (formula/fixed) from questionnaire_questions
- [x] Layer 6: Apply ±10% range to midpoint, round to nearest $100
- [x] Return breakdown array with labeled line items for each adjustment
- [x] Update submitAnswers to call engine and return midpoint, breakdown, baseRuleName
- [x] Add getRoughPricing tRPC procedure (fetch by session token)

### Admin UI — Pricing Rules Configuration
- [x] Add Tier Multipliers tab to QuestionnaireBuilderPanel
- [x] Add Add-ons tab to QuestionnaireBuilderPanel
- [x] Tier Multipliers tab: grouped by section, shows tier label, multiplier value, weight
- [x] Tier Multiplier form: section selector, tier selector (L1-L5), multiplier input, weight input
- [x] Add-ons tab: list with question/option trigger, label, dollar amount, active toggle
- [x] Add-on form: question selector, option selector, label, amount fields

### Customer UI — Rough Price Range Display
- [x] Show ±10% rough price range on DynamicQuestionnaire done screen
- [x] Show midpoint with "±10% range shown above" label
- [x] Add collapsible breakdown accordion (show/hide estimate breakdown)
- [x] Breakdown shows base price, tier adjustments, add-ons, option adjustments
- [x] Color-coded: base=charcoal, positive=green, negative=red

### Tests
- [x] Write vitest tests for pricing engine (21 tests across 5 describe blocks)
- [x] Run full test suite — 236 tests pass (21 test files)

## Bulk/Global Margin Change in Cost Catalog

- [x] Add `bulkUpdateMargin` tRPC adminProcedure: accepts `marginPct` (0-99.99) and optional `tradeSheet` filter; updates `estimatedPrice = (laborCost + materialCost) / (1 - marginPct/100)` for all matching active items; returns count of updated rows
- [x] Add bulk margin toolbar to CatalogTab: margin % input, optional trade sheet filter dropdown, "Apply to All Sheets" and "Apply to This Sheet" buttons, confirmation dialog showing item count
- [x] Show success toast with count of updated items after bulk margin apply
- [x] Refresh catalog list automatically after bulk margin apply
- [x] Write vitest test for bulkUpdateMargin procedure

## Cabinetry Cost Pricing (Cabinet MSRP LF Pricing)

- [x] Create dp_cabinet_pricing table: id, vendor, collection, style, color, code, optionLabel, lineItemType (base/upper/pantry), unit (LF/EA), msrpUnitPrice, discountedUnitPrice, marginPct, estimatedPrice, notes, isActive, sortOrder
- [x] Import all 87 rows from spreadsheet (Woodoo 10 options + USCD 19 options × 3 line items each)
- [x] Add CRUD tRPC procedures: listCabinetPricing, createCabinetOption, updateCabinetOption, deleteCabinetOption, bulkUpdateCabinetMargin, syncCabinetsToCatalog
- [x] Add Cabinet Pricing tab to QuestionnaireBuilderPanel: grouped by vendor, shows style/color/code, three line item prices per option, inline edit
- [x] Sync cabinet options into dp_catalog_items as tradeSheet="Cabinetry" so they appear in the main Cost Catalog and pricing rules
- [x] Write vitest tests for cabinet pricing procedures

## Project Knowledge Level — Branching Section (Section 0)

- [x] Seed Section 0 (project_knowledge): branching question with 3 options: "Help me figure out what I want", "I know what I want", "I have plans already"
- [x] Path A (help_me_figure_out): guided_selection follow-up questions (budget range, inspiration style, must-haves, flexibility); ±10% range
- [x] Path B (i_know_what_i_want): guided_selection follow-up questions (rooms/areas, preferred materials, timeline, priorities); ±7% range
- [x] Path C (i_have_plans): plan_based follow-up questions (upload plans photo_upload, sqft from plans, plan stage, existing bids, scope exclusions, reference photos); ±5% range
- [x] Add `knowledgePath` column to questionnaire_sessions table
- [x] Update submitAnswers to detect and store knowledgePath from Section 0 answer
- [x] Update pricing engine: help_me_figure_out = ±10%, i_know_what_i_want = ±7%, i_have_plans = ±5% range
- [x] Update DynamicQuestionnaire: add project_knowledge, guided_selection, plan_based to SECTION_META and SECTION_ORDER
- [x] Add range breakdown item to engine output (type="range", label includes rangeLabel)
- [x] Admin session detail: show knowledge path badge at top of session card
- [x] Write tests for branching logic and path-specific range computation (6 tests)
- [x] Run full test suite — 283 tests pass (25 test files)

## File Upload Feature (Session Files)
- [x] Add questionnaire_session_files table to schema.ts
- [x] Create table in database via SQL
- [x] Add tRPC getSessionFiles procedure (admin protected)
- [x] Add tRPC deleteSessionFile procedure (admin protected)
- [x] Wire file upload UI in DynamicQuestionnaire for plan_based section
- [x] Wire file upload UI for photo_upload question type (all sections)
- [x] Add Express multipart upload route (/api/upload/session-file)
- [x] Add uploaded files panel to admin session detail view (grouped by category, thumbnails, delete)
- [x] Write vitest tests for file upload procedures

## Design Package Collapsible Questionnaire (May 2026)
- [x] Step 1 "Rough Pricing Questionnaire" is now a collapsible section (click header to expand/collapse)
- [x] Header shows a "X / Y answered" badge when collapsed so progress is visible at a glance
- [x] Section opens by default for in-person walkthroughs; can be collapsed once complete

## Basement Design Package Mode
- [x] Add Basement toggle button next to Addition in the mode selector
- [x] Add BASEMENT_PROJECT_TYPES and basement to ALL_PROJECT_TYPES
- [x] Add basement to SQFT_BASED_TYPES (sqft-based like addition)
- [x] Feasibility study available in basement mode
- [x] Basement-specific rendering labels (Small/Large Area, Kitchen/Bar)
- [x] Update all modeLabel references to include basement
- [x] Seed basement sections in DEFAULT_SECTIONS (db.ts)
- [x] Add basement to commission enum in routers.ts and seedDefaults
- [x] Add basement to admin panel: commission labels, section config, contract types
- [x] Seed basement sections and commission into live database

## Bathroom/Kitchen Separate Modes (May 2026)
- [x] Split "Bathroom & Kitchen Remodel" toggle into two separate buttons: Bathroom and Kitchen
- [x] CalcMode type updated to "bathroom" | "kitchen" | "addition" | "basement"
- [x] Remove Project Type sub-step (no longer needed)
- [x] Bathroom mode shows only Small/Large Bathroom rendering inputs
- [x] Kitchen mode shows only Kitchen rendering input
- [x] All modeLabel references updated throughout (email, Jobtread, summary, mobile bar)
- [x] Admin panel PROJECT_TYPES, PARADE_PROJECT_TYPES, and PARADE_TYPE_LABELS updated

## Per-Question Project Type Filtering
- [x] Add applicableProjectTypes JSON column to questionnaire_questions table
- [x] Add projectType VARCHAR column to questionnaire_sessions table
- [x] Update createQuestion / updateQuestion procedures to accept applicableProjectTypes
- [x] Update createSession procedure to accept projectType
- [x] Add project-type checkboxes to QuestionEditorDialog (Basic Info tab)
- [x] Add project-type badge to question cards in builder list
- [x] Add project-type picker (4 buttons) to SendQuestionnaireDialog
- [x] Filter questions in DynamicQuestionnaire by session.projectType

## Basement Questionnaire Questions
- [x] Seed Project Basics section (5 questions: finish status, sqft, areas, layout, walls)
- [x] Seed Existing Conditions section (5 questions: floor, moisture, cracks, ceiling type, ceiling height)
- [x] Seed Code/Egress section in structure_foundation_roof (5 questions: bedrooms, egress windows, exterior entrance, ADU)
- [x] Seed Framing/Layout section in site_access (5 questions: mechanical exposure, soffits, closets, special rooms, posts/beams)
- [x] Seed Plumbing questions in mechanical_electrical_plumbing (5 questions: bathroom, rough plumbing, kitchenette, laundry, concrete cut)
- [x] Seed Electrical/Lighting questions in mechanical_electrical_plumbing (5 questions: circuits, recessed lighting, dedicated circuits, low-voltage, panel capacity)
- [x] Seed HVAC questions in mechanical_electrical_plumbing (5 questions: heat runs, ductwork, difficult rooms, mechanical room, ventilation)
- [x] Seed Finishes section in interior_finishes (4 questions: flooring, wall finish, ceiling finish, trim level)
- [x] All 40 questions tagged to basement project type only

## Notes Questions per Section
- [x] Seed free-text Notes question at end of each questionnaire section (12 sections, skipping photos_inspiration)
- [x] Notes questions shown for all project types (applicableProjectTypes = null)
- [x] Basement design package: add engineer's letter as a selectable add-on option
- [x] Basement design package: floor plan cost = $0.50/sqft cost at 50% GP margin ($1.00/sqft to customer)

## Bathroom Remodel Mode (Design Package — Option 1)

### Objectives
- [x] BATH-01: Add "Bathroom" mode button alongside Basement/Addition in the Design Package calculator
- [x] BATH-02: Create database tables for bathroom pricing config (size tiers, plumbing, electrical, HVAC, finishes, add-ons, commission, markup)
- [x] BATH-03: Seed default pricing values for all bathroom line items
- [x] BATH-04: Build tRPC procedures: getBathroomConfig, updateBathroomConfig
- [x] BATH-05: Step 1 UI — Bathroom size selector (Half Bath / Full Bath / Master Bath / Custom sqft)
- [x] BATH-06: Step 2 UI — Plumbing scope (per-fixture toggles: toilet move, shower move, tub move/remove, vanity move, add fixture; each with configurable flat cost)
- [x] BATH-07: Step 3 UI — Electrical scope (menu: no changes / new circuits only / panel upgrade + new circuits; configurable costs)
- [x] BATH-08: Step 4 UI — HVAC scope (menu: exhaust fan replacement / new exhaust fan + duct run / full vent reroute; configurable costs)
- [x] BATH-09: Step 5 UI — Finish level selector (Builder Grade / Mid-Range / High-End; per-sqft material allowance, configurable)
- [x] BATH-10: Step 6 UI — Add-ons checklist (heated floor, custom tile niche, frameless glass enclosure, soaking tub, double vanity upgrade, towel warmer; each configurable flat cost)
- [x] BATH-11: Pricing engine — combine all selected items into itemized cost + sell price using configurable markup %
- [x] BATH-12: Summary panel — show bathroom line items in the existing right-side summary panel, consistent with basement/addition layout
- [x] BATH-13: Mobile sticky summary — show bathroom total in the mobile sticky bar
- [x] BATH-14: Design package items — include architectural/structural engineering, 3D renderings, plumbing schematic, electrical schematic as configurable line items in the bathroom design package cost
- [x] BATH-15: Commission — add configurable sales rep commission for bathroom remodels (flat amount, admin-only, not shown on customer estimate)
- [x] BATH-16: Admin panel — add Bathroom section to the Design Package admin portal with all pricing fields editable
- [x] BATH-17: Admin panel — markup % for bathroom (customer price = cost ÷ (1 - markup%), configurable)
- [x] BATH-18: Reset/mode switch — bathroom state resets cleanly when switching modes
- [x] BATH-19: End-to-end test — verify all steps, pricing math, summary display, and admin edits work correctly

## Bathroom Material Selection Expansion

### Shower / Tub Surround (replaces finish tier)
- [ ] MAT-01: Fiberglass surround option (ceramic enamel tub + shower insert) — flat cost, configurable
- [ ] MAT-02: Cultured marble option — per-sqft cost, configurable
- [ ] MAT-03: Tile option — sub-selections for tile size (4x4, 6x6, 12x12, 12x24, 24x24) and layout pattern (straight, offset/brick, herringbone, diagonal, basketweave) — price per sqft varies by size/pattern, all configurable

### Vanity
- [ ] MAT-04: Custom vanity option — per-linear-ft cost, configurable
- [ ] MAT-05: Prebuilt wood vanity option — flat cost by size (24", 30", 36", 48", 60", 72"), configurable
- [ ] MAT-06: Prebuilt painted vanity option — flat cost by size (24", 30", 36", 48", 60", 72"), configurable

### Flooring
- [ ] MAT-07: Click-and-lock LVP option — per-sqft cost, configurable
- [ ] MAT-08: Tile flooring option — sub-selections for tile size (6x6, 12x12, 12x24, 24x24) and layout pattern (straight, offset, herringbone, diagonal) — price per sqft varies by size/pattern, all configurable

### Countertop
- [ ] MAT-09: Remnant piece option — per-sqft cost (smaller slabs, lower cost), configurable
- [ ] MAT-10: Full slab fabrication option — per-sqft cost (full slab, higher cost), configurable
- [ ] MAT-11: Countertop edge profile selection (eased, beveled, bullnose, ogee) — flat add-on cost per option, configurable

### Toilet
- [ ] MAT-12: Standard toilet option — flat cost, configurable
- [ ] MAT-13: Concealed p-trap toilet option — flat cost, configurable
- [ ] MAT-14: Smart toilet option — flat cost, configurable

### Wall Finish
- [ ] MAT-15: Paint option — per-sqft cost, configurable
- [ ] MAT-16: Wallpaper option — per-sqft cost, configurable
- [ ] MAT-17: Wall tile option — sub-selections for tile size and layout pattern (same as floor tile options) — price per sqft varies, configurable

### Database & Backend
- [ ] MAT-18: Create/update database tables for all new material categories (shower_surround, vanity, flooring, countertop, toilet, wall_finish) with all sub-options
- [ ] MAT-19: Seed all default pricing values for every material option
- [ ] MAT-20: Build tRPC procedures for read/write of all new material config tables
- [ ] MAT-21: Remove or repurpose the old finish tier (Builder/Mid/High-End) table and UI step

### UI
- [ ] MAT-22: Replace Step 5 (Finish Level) with 6 new material selection steps, each with clear option cards
- [ ] MAT-23: Tile size + pattern sub-selector shown inline when tile is chosen for shower, floor, or wall
- [ ] MAT-24: Vanity size selector shown inline when prebuilt vanity is chosen
- [ ] MAT-25: Countertop edge profile selector shown after countertop type is chosen

### Pricing Engine & Summary
- [ ] MAT-26: Pricing engine calculates all material costs using sqft from Step 1 (size tier) where applicable
- [ ] MAT-27: Summary panel shows each material category as its own line item
- [ ] MAT-28: Admin panel updated with all new material pricing sections, fully editable


## Suggestions Applied (from bathroom remodel delivery)
- [ ] SUGG-01: Add engineer's letter price field to the admin panel basement config section (editable without code change)
- [ ] SUGG-02: Add floor plan drawing toggle (on/off) to basement mode so designer can exclude it when a floor plan already exists
- [ ] SUGG-03: Add engineer's letter option to Addition mode (same toggle card pattern as basement)

## Bathroom Configurator Expansion (June 2026)

- [x] BEXP-01: Bathroom size — toggle between L×W input and direct sqft entry
- [x] BEXP-02: Plumbing changes — feasibility checklist gate (admin-configurable checklist items)
- [x] BEXP-03: HVAC changes — feasibility checklist gate (admin-configurable checklist items)
- [x] BEXP-04: Tub selector — alcove, drop-in, freestanding with size descriptions and pricing
- [x] BEXP-05: Shower configurator — curb type (curbless/curbed), niches (multiple sizes), bench (per LF), shelves, glass (single door/L/sliding/single wall with LF input)
- [x] BEXP-06: Tile size sub-selector for flooring (when tile is selected) — 6 size categories with floor $/sqft
- [x] BEXP-07: Tile pattern sub-selector for flooring — 19 patterns with upcharge $/sqft
- [x] BEXP-08: Tile size sub-selector for wall finish (when tile is selected) — 6 size categories with wall $/sqft
- [x] BEXP-09: Tile pattern sub-selector for wall finish — 19 patterns with upcharge $/sqft
- [x] BEXP-10: Vanity pricing matrix — material (painted/alder_maple/white_oak/walnut) × width (24–72") grid
- [x] BEXP-11: DB tables: dp_bathroom_plumbing_checklist, dp_bathroom_hvac_checklist, dp_bathroom_tub_config, dp_bathroom_shower_config, dp_bathroom_tile_sizes, dp_bathroom_tile_patterns, dp_bathroom_vanity_pricing
- [x] BEXP-12: Seed all default pricing from brochure into new tables
- [x] BEXP-13: tRPC procedures for all new tables (get + create/update/delete)
- [x] BEXP-14: Admin panel — Plumbing Feasibility Checklist (add/remove items)
- [x] BEXP-15: Admin panel — HVAC Feasibility Checklist (add/remove items)
- [x] BEXP-16: Admin panel — Tub Configuration (edit cost per tub option)
- [x] BEXP-17: Admin panel — Shower Configuration (edit cost per shower option, per-LF items)
- [x] BEXP-18: Admin panel — Tile Sizes (edit floor $/sqft and wall $/sqft per size)
- [x] BEXP-19: Admin panel — Tile Lay Patterns (edit upcharge $/sqft per pattern)
- [x] BEXP-20: Admin panel — Vanity Pricing Matrix (edit cost per material × width combination)

## Bathroom UI Restructure (June 2026 — Round 2)

- [x] BSTR-01: Add `itemKey` column to dp_bathroom_plumbing_checklist and dp_bathroom_hvac_checklist tables so each checklist row is tied to a specific fixture/scope item
- [x] BSTR-02: Seed per-item checklists: each plumbing fixture (move_toilet, move_shower, move_tub, remove_tub, move_vanity, add_fixture) gets its own checklist rows
- [x] BSTR-03: Seed per-item checklists: each HVAC scope (exhaust_fan_replace, new_exhaust_fan, full_vent_reroute) gets its own checklist rows
- [x] BSTR-04: Update tRPC getBathroomPlumbingChecklist to accept optional itemKey filter
- [x] BSTR-05: Update tRPC getBathroomHvacChecklist to accept optional itemKey filter
- [x] BSTR-06: Update tRPC createBathroomPlumbingChecklistItem to accept itemKey
- [x] BSTR-07: Update tRPC createBathroomHvacChecklistItem to accept itemKey
- [x] BSTR-08: Calculator UI — Plumbing: when a fixture is toggled ON, show its per-item checklist as an inline Step 2 confirmation (all must be checked to confirm)
- [x] BSTR-09: Calculator UI — HVAC: when a scope is selected, show its per-item checklist as an inline Step 2 confirmation
- [x] BSTR-10: Calculator UI — Flooring tile: 3-step flow (Step 1: type, Step 2: size, Step 3: pattern) — size/pattern only shown when tile is selected
- [x] BSTR-11: Calculator UI — Wall finish tile: 3-step flow (Step 1: type, Step 2: size, Step 3: pattern) — size/pattern only shown when tile is selected
- [x] BSTR-12: Admin panel — per-item checklist management: group checklist items by itemKey with a dropdown/tab to select which fixture/scope to manage

## Wall Tile Fix + Skill Creation (Jun 30 2026)
- [x] WFIX-01: Wall finish Step 1 should show only a single "Tile" toggle option — Steps 2 and 3 unlock after tile is selected
- [x] WFIX-02: Create bathroom-configurator reusable skill documenting the full build process

## Plumbing Fixture Inventory Flow (Jul 1 2026)
- [x] PFLO-01: Create dp_bathroom_fixture_types table (fixture_key, label, icon, sort_order, is_active)
- [x] PFLO-02: Create dp_bathroom_fixture_actions table (fixture_key, action_type [leave_as_is/relocate/update/add_new], label, cost, cost_note, is_active, sort_order)
- [x] PFLO-03: Seed fixture types: toilet, shower, tub, vanity_sink, double_vanity_sink, utility_sink, bidet
- [x] PFLO-04: Seed fixture actions per type with brochure-based costs
- [x] PFLO-05: Update dp_bathroom_plumbing_checklist itemKey values to match new fixture_key + action_type compound key
- [x] PFLO-06: Add tRPC procedures: getBathroomFixtureTypes, getBathroomFixtureActions, admin CRUD for both
- [x] PFLO-07: Calculator UI — Step 1: multi-select grid of fixture types present in bathroom
- [x] PFLO-08: Calculator UI — Step 2 (per fixture): action selector (Leave As-Is / Relocate / Update / Add New) with inline feasibility checklist for Relocate and Add New
- [x] PFLO-09: Calculator UI — Add New option shows quantity input (e.g. add 1 shower head = +1 fixture)
- [x] PFLO-10: Pricing engine — sum costs for all fixture × action combinations (skip leave_as_is)
- [x] PFLO-11: Admin panel — Fixture Types tab with add/edit/toggle
- [x] PFLO-12: Admin panel — Fixture Actions tab grouped by fixture type with cost editing

## Bathroom Expansion Batch 3 (Jul 1 2026)
- [ ] BAT3-01: Wall finishes — replace current options with Wallpaper, Plaster, Wall Tile (tile keeps 3-step size+pattern flow)
- [ ] BAT3-02: Move wall finishes section to immediately after shower config section (after step 9)
- [ ] BAT3-03: Add "Tile Outside Shower Area" toggle section (separate from wall finish tile, uses same tile size+pattern 3-step)
- [ ] BAT3-04: Shower Step 3 — Shampoo Storage: Shelf, Ledge, Small Niche, Large Niche with niche size sub-selection
- [ ] BAT3-05: Shower shampoo storage — exterior wall check: if niche is on exterior wall, add $400 framing cost
- [ ] BAT3-06: Shower Step 3 — Bench drawer add-on option when bench is selected
- [ ] BAT3-07: Electrical section — replace current scope with: new outlets (count input), light fixture adjust (count), can light move (count), electric radiant heat (sqft input)
- [ ] BAT3-08: Add Painting section with room sqft-based pricing
- [ ] BAT3-09: Seed new wall finish options (wallpaper, plaster) in DB; update tile option label
- [ ] BAT3-10: Seed shampoo storage options in shower_config table
- [ ] BAT3-11: Seed bench drawer option in shower_config table
- [ ] BAT3-12: Seed electrical line items for new outlets, light fixture, can light, radiant heat in DB
- [ ] BAT3-13: Seed painting options in DB (wall paint, ceiling paint, trim paint with sqft-based pricing)
- [ ] BAT3-14: Admin panel — update wall finish options management
- [ ] BAT3-15: Admin panel — update electrical section for new per-unit items
- [ ] BAT3-16: Admin panel — add painting section
- [x] Add Design Package / Price Consult toggle inside the Bathroom tab: Design Package shows sections 1-4 (questionnaire, renderings, included services, parade stoppers), Price Consult shows sections 5+ (bathroom configurator: size, plumbing, electrical, HVAC, tub/shower, wall finish, tile, painting, vanity, flooring, countertop, toilet, add-ons)
- [x] Add floating countertop vanity option with 8" turn-down to Vanity section (schema + UI + pricing + admin)
- [x] Add Accessories section to bathroom Price Consult: medicine cabinet, TP holder, towel bar, hooks, towel folder, floating shelves, interior door change, pocket door (schema + UI + pricing + admin)
- [x] Fixture actions: rename "Relocate" to "Wall Mounted Change"
- [x] Fixture actions: rename "Update in Place" to "Install New Trim Only"
- [x] Fixture actions: remove bidet option
- [x] Electrical scope: totals update dynamically when items are added/changed
- [x] Radiant heat: option for bench-only or heat by sqft
- [x] Radiant heat: complete overlay vs sections only
- [x] Radiant heat: Schluter brand vs Vevor brand selection
- [x] Radiant heat: panel capacity check step (enough room or panel upgrade needed)
- [x] Curbless shower: joist type verification (I-joist, engineered floor truss, dimensional lumber)
- [x] Curbless shower: floor leveling requirements based on joist type
- [x] Niches: allow multiple niches to be selected
- [x] Niches: option to add low-voltage track lighting to niches
- [x] Shower glass: frameless vs framed wrought iron options
- [x] Shower glass: height option (78" or taller)
- [x] Shower glass: door mount type (glass mounted or wall mounted) for L-shape/single wall
- [x] Remove shampoo storage section
- [x] Tile outside shower: allow sqft OR length x width input
- [x] Add stone casing for shower door opening ($400 add-on)
- [x] Painting/drywall: ask bathroom-only or other areas
- [x] Painting/drywall: calculate based on bathroom sqft + ceiling height - tile sqft
- [x] Vanity: custom / stock / install-only options
- [x] Vanity: floating countertop length selector when floating vanity selected
- [x] Vanity: move floating vanity to be a material option in vanity section
- [x] Countertops: reorder to item #10 right after vanities
- [x] Multi-bathroom: ability to add multiple bathrooms to the same estimate
- [x] Multi-bathroom: all selected items included in combined scope of work
- [x] Create sticky sidebar with real-time itemized cost breakdown for each bathroom in Price Consult
- [x] Kitchen Price Consult: schema table dp_kitchen_options with categories
- [x] Kitchen Price Consult: tRPC procedures (get/update)
- [x] Kitchen Price Consult: UI sections and pricing engine
- [x] Kitchen Price Consult: Design Package / Price Consult toggle
- [x] Addition Price Consult: schema table dp_addition_options with categories
- [x] Addition Price Consult: tRPC procedures (get/update)
- [x] Addition Price Consult: UI sections and pricing engine
- [x] Addition Price Consult: Design Package / Price Consult toggle
- [x] Basement Price Consult: schema table dp_basement_options with categories
- [x] Basement Price Consult: tRPC procedures (get/update)
- [x] Basement Price Consult: UI sections and pricing engine
- [x] Basement Price Consult: Design Package / Price Consult toggle
- [x] Generalize sidebar to show price consult line items for all modes
- [x] Admin panel: Kitchen, Addition, Basement price consult option pricing config
- [x] Move all Price Consult config panels (Bathroom, Kitchen, Addition, Basement) into a dedicated top-level "Price Consult" section in the admin panel, separate from Pricing & Services
- [x] Add description text field to each pricing item in admin panel (PriceConsultOptionRow, AccessoryRow, PaintingOptionRow, and all bathroom item rows) with tooltip label
- [x] Render description as hover tooltip (InfoTooltip with ? icon) on all pricing item cards in the front-end calculator
- [x] Add Price Consult toggle and full pricing flow (questions + scope of work) to Kitchen, Addition, and Basement modes
- [x] Cabinet pricing: DB schema for cabinet config (base Shaker price, finish multipliers, add-on prices, assembly/install rates)
- [x] Cabinet pricing: router procedures (getCabinetConfig, updateCabinetConfig) with seeded defaults
- [x] Cabinet pricing: question flow UI in kitchen price consult (collection/finish, room type, LF inputs, base type, wall height, tall cabinets, add-ons, assembly/install)
- [x] Cabinet pricing: admin panel tab under Price Consult → Kitchen for configuring all cabinet pricing
- [x] Cabinet pricing: wire into kitchen price consult summary and total
- [x] Cabinet images: download USCD Shaker (all 12 finishes) + Haven (Dune, Ember) + Woodoo (White, Iron Black, Premium Oak, Walnut) images
- [x] Cabinet images: upload all 17 images to CDN via storage proxy
- [x] Cabinet selection: image thumbnail + hover popup preview on each finish button in calculator
- [x] Cabinet collection: add Woodoo Cabinetry (Shaker door) as third collection option alongside USCD Shaker and Haven
- [ ] Fully Custom cabinets: add Painted, White Oak, Walnut finish sub-selections with separate cost-per-LF per finish
- [ ] Windows & SGD: research Alside Windows West Coast product lineup from alsidewindows.net
- [ ] Windows & SGD: DB schema and router procedures for window/door pricing config
- [ ] Windows & SGD: admin panel config section for window/door pricing (per product, per color option)
- [ ] Windows & SGD: pricing module component (window type, color White-on-White/Black-on-White/Black-on-Black, pane count, qty) wired into all price consult modes
- [ ] Windows & SGD: sliding glass door module (2-pane and 4-pane options, width x height, qty)
- [x] Fully Custom cabinets: add Painted, White Oak, Walnut sub-finish options with per-finish cost-per-LF inputs
- [x] Windows & SGD: DB schema, router procedures, admin panel config (window types, pane counts, color upcharges, SGD)
- [x] Windows & SGD: WindowsPricingSection component with Alside product lineup wired into Kitchen, Addition, Basement price consult modes

- [x] SGD: new vs existing opening toggle in WindowsPricingSection; new opening upcharge field in admin
- [x] Window size categories: Bathroom, Standard Egress, Large Egress, Oversized, Skylight — selector in UI, upcharge per type in admin
- [x] Interior Finish (Category 6): Good/Better/Best tier buttons per item (Drywall, Paint, Flooring, Trim)
- [x] Interior Finish: paint scope selector (Addition Only vs Addition + Other Areas)
- [x] Interior Finish: paint sqft calculator using Excel logic (perimeter × ceiling height + partition walls − openings + ceiling area)
- [x] Interior Finish: ceiling height, room count, include ceilings toggle, other areas sqft inputs
- [x] Admin: dp_addition_options has cost_good/cost_better/cost_best/has_tiers columns; PriceConsultOptionRow shows tiered pricing editor
- [x] Admin: Window/SGD config panel expanded with all vinyl/alum/wood base prices, size upcharges, SGD opening type upcharge

- [x] Price Consult Section Config: DB table dp_price_consult_sections (consultType, sectionKey, label, isVisible, sortOrder)
- [x] Price Consult Section Config: seed all bathroom, addition, basement, kitchen sections with correct category slugs (auto-seed on first load)
- [x] Price Consult Section Config: router CRUD (getSections, updateSection, batchUpdateSections) with isVisible number/boolean support
- [x] Price Consult Section Config: admin panel UI with toggle switches and drag-to-reorder per consult type
- [x] Price Consult Section Config: wire into calculator — hidden sections skipped, dynamic sections sorted by sortOrder
- [x] Order Now button: context-aware label in summary panel (Order Now / Order Design Package / Order Feasibility Study)
- [x] Order Now button: update summary panel header to show "Price Consult Estimate" in price consult mode
- [x] Order Now button: update mobile summary button label to be context-aware
- [x] Order Now button: update hero section button from "Send Selections" to "Order Now"
- [x] Order Now button: update OrderMaterialModal dialogTitle to handle price consult mode
- [x] Order Now button: update estimateDescription for price consult mode
- [x] Order Now button: update jobtreadParams (projectDescription, budgetLineItemName, scopeOfWork, services) for price consult mode

## Initial Consult (Stay vs. Move) — Addition → Price Consult Tab

- [ ] DB schema: initial_consultations table (id, sessionId, consultantUserId, status, inputData JSON, resultData JSON, createdAt, updatedAt)
- [ ] DB schema: mortgage_rate_cache table (id, rate, source, effectiveDate, retrievedAt, isFallback)
- [ ] Server: MortgageRateService — fetch Freddie Mac PMMS, cache in DB, fallback to admin config
- [ ] Server: PropertyDataService — RentCast property lookup by address, pre-fill fields
- [ ] Server: ComparableSalesService — RentCast comparable sales search with similarity scoring
- [ ] Server: FinancialCalculationService — mortgage payment, renovation loan, sell/move costs, affordable home price (iterative solver)
- [ ] Server: ConsultationService — save/load consultation sessions
- [ ] tRPC procedures: lookupProperty, searchComparables, getMortgageRate, saveConsultation, loadConsultation, emailSummary
- [ ] UI: Step 1 — Current Home (address lookup + RentCast pre-fill, mortgage inputs)
- [ ] UI: Step 2 — Addition Details (type, sqft, bedrooms, bathrooms, budget, loan inputs)
- [ ] UI: Step 3 — Comparable Homes (CMA cards with similarity score, remove/replace/add manually)
- [ ] UI: Step 4 — Renovation Funding (loan calculation, total Stay & Build monthly payment)
- [ ] UI: Step 5 — Freddie Mac Rate display with disclaimer
- [ ] UI: Step 6 — Sell & Move Calculation (selling costs, available down payment, affordable replacement home)
- [ ] UI: Step 7 — Stay vs. Move Comparison (two-column comparison cards)
- [ ] UI: Step 8 — Long-Term Appreciation (chart + projection table)
- [ ] UI: Results Summary dashboard with Save, Email, PDF, Restart, Continue to Design Package
- [ ] UI: Sticky Consultation Summary panel (desktop sidebar / mobile collapsible drawer)
- [ ] Replace existing Addition → Price Consult content with the new Initial Consult tool
- [ ] Admin: Freddie Mac fallback rate config, closing cost %, realtor fee %, relocation cost %, appreciation rate defaults
- [ ] Tests: mortgage payment, inverse affordable-home, realtor fee, closing cost, net proceeds, CMA ranking, weighted CMA, appreciation, Freddie Mac fallback, RentCast failure

## Initial Consult (Stay vs. Move Tool)
- [x] DB: initial_consultations and mortgage_rate_cache tables created
- [x] Server: PropertyDataService (RentCast property lookup + comparable sales)
- [x] Server: MortgageRateService (Freddie Mac PMMS with DB caching)
- [x] Server: FinancialCalculationService (mortgage, HELOC, sell/move, appreciation)
- [x] Server: tRPC initialConsult router (lookupProperty, getComparables, getMortgageRate, calculateFinancials, saveConsultation, getConsultations)
- [x] UI: InitialConsultTool component with 8-step guided wizard
- [x] UI: Step 1 - Current Home (address lookup via RentCast, auto-fill property data)
- [x] UI: Step 2 - Addition Details (sqft, bedrooms, bathrooms, projected value)
- [x] UI: Step 3 - Comparable Homes (CMA with scoring, select/deselect comps)
- [x] UI: Step 4 - Renovation Funding (HELOC/cash-out refi/construction loan)
- [x] UI: Step 5 - Current Mortgage Rate (Freddie Mac PMMS)
- [x] UI: Step 6 - Sell & Move Analysis (net proceeds, replacement home payment)
- [x] UI: Step 7 - Stay vs. Move Comparison (side-by-side monthly cost)
- [x] UI: Step 8 - Long-Term Appreciation (10-year chart, stay vs. move)
- [x] UI: Results Summary with Save, Email, and Continue to Design Package actions
- [x] Wire: Addition sub-mode toggle now has "Initial Consult" as third option
- [x] Tests: 17 financial calculation tests all passing
- [x] Rename Price Consult sub-mode to Initial Consult on all 4 project types; replace Price Consult item-by-item content with InitialConsultTool (Stay vs. Move wizard); remove separate Initial Consult button from Addition sub-mode; hide legacy price consult sections with _legacyPC flag

## Stair Enhancement Features (Phase 1)
- [ ] Decimal stair widths (accept 3.5 ft, display as "3.5 ft / 42 in", no rounding)
- [ ] Deck-height-based stair calculator (enter height in ft+in, auto-calc risers/treads, show riser height/tread depth/run, IRC warnings, manual override, preliminary flag)
- [ ] Existing Deck Stair Addition project mode (stairs-only, no sqft minimum, no forced deck-edge railing)
- [ ] Floating Steps stair type with placeholder pricing fields in admin
- [ ] Color To Be Determined option in ColorPicker (flags estimate as preliminary)

## Stair Enhancement Features (Phase 2)
- [x] Improve landing configuration (top/turn/bottom as separate components with own dimensions/material)
- [ ] Stairs-only railing mode (separate toggles for deck-edge, stair, landing railing; per-side controls; LF display)
- [ ] Custom railing matching (match existing, bar styles, post/rail profile, photo capture saved to S3)
- [ ] Estimate alternatives (Option A / Option B side-by-side within single session)
- [ ] Validation/regression tests for stair features
