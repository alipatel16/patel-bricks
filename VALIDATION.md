# Validation report — v2.3.0

## Static code checks

- All JavaScript and JSX source files were parsed/transpiled with the installed TypeScript compiler: **50 files, 0 syntax errors**.
- Relative imports were checked: **0 missing local imports**.
- `package.json`, `package-lock.json`, `firebase.json`, `firestore.indexes.json` and `public/manifest.json` parse as valid JSON.
- The release archive was tested with `unzip -t` after packaging.

## v2.3.0 interface and reporting checks

- Sales summary cards use equal-height containers and consistent inner spacing.
- Sales filters and all Record Sale inputs use responsive MUI grids with full-width controls and stable helper-text spacing.
- Customer Report and Invoice Reports filters follow the same aligned responsive layout.
- Inventory exposes **bricks, cement, sand, fly ash, dust, lime and chemical** as independent stock types.
- Raw-material tiles read their quantity and unit from `system/inventory.materials` and `materialUnits`.
- GST Reports reads GST-bearing generated invoices for outward supplies and purchase records for inward supplies.
- GSTR-1, GSTR-2 and GSTR-3B views provide summaries, transaction tables and Excel export for an explicit date range.
- Both normal sales invoices and generated Customer Report invoices use the same professional A4 design primitives.
- Print CSS isolates invoice content and uses A4 page dimensions for consistent browser printing.

## Supplied legacy export audit

- Production records: **257**
- Total production: **4,681,262 bricks**
- Sales records: **1,333**
- Total sales quantity: **4,129,539 bricks**
- Correct calculated stock: **551,723 bricks**
- Stale stored RTDB stock: **534,223 bricks**
- Corrected variance: **17,500 bricks**
- Customer sites: **141**
- Site rates: **141**
- Vehicles: **6**
- Generated legacy invoices: **135**
- GST sequence: prefix **C**, next number **48**, auto-increment **enabled**

## Existing workflow checks retained

- Customer autocomplete explicitly commits the highlighted full option on Enter.
- Site selection applies `customer.brickRates[locationId]`.
- Customer updates can propagate snapshots to sales, payments and generated invoices; rate propagation is separately controlled.
- Sale edits update linked payment customer snapshots when the customer changes.
- Local GST is calculated from configured CGST+SGST; interstate GST uses IGST.
- Customer Report validates invoice/from/to dates, site, rate and eligible quantity.
- GST/non-GST quantities auto-balance against eligible sales, with GST-only mode available.
- GST-number allocation and increment are atomic and GST-only.
- Invoice-format switches affect regular and generated invoice documents.
- Migration sanitizes nested `undefined` values before Firestore writes.

## Build limitation in this environment

A complete CRA dependency install/build could not be run because the execution environment’s internal npm mirror returned a package 404 (`yocto-queue@0.1.0`). The source-level validation above passed. Run `npm install` and `npm run build` on your machine or deployment environment before release.
