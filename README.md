# Patel Bricks — Firestore edition v2.3.0

A responsive React/MUI management app for brick production, inventory, sales, customers, suppliers, GST reporting and versioned migration from Firebase Realtime Database to Firestore.

## Restored legacy workflows

### Sales

- **Overview, Sales History, Analytics, Customer Report and Invoice Reports** tabs.
- Server-side customer autocomplete starts after two characters and stores the complete selected customer. Pressing Enter on `AL → ALI PATEL` now sets `ALI PATEL`, not the typed prefix.
- Selecting a customer site automatically applies that site’s saved brick rate and address.
- Vehicle dropdown reads the vehicle master from Settings and still allows free typing.
- Create, edit, delete, view, print and PDF sales invoices.
- Invoice-linked and customer-level payment entry. Moving an edited sale to another customer also updates its linked payment snapshots.
- GST uses the configured CGST+SGST rate for local sales and IGST rate for interstate sales.

### Customers

- Multiple delivery locations per customer.
- Separate brick rate, address, contact, pincode, state and state code per location.
- Primary-site selection.
- Optional propagation of name, phone, GSTIN and site changes to historical sales, payments and generated invoices.
- Optional recalculation of matching historical sales and generated invoices when a site rate changes.

### Customer-report GST / non-GST invoices

- Select invoice date, sales date range and one site or all sites.
- Site-specific rates are loaded automatically. All-sites reports use the eligible sales’ weighted average rate.
- Eligible quantities are validated against the selected customer/site/date range.
- Entering GST or non-GST bricks automatically allocates the remaining eligible quantity to the other component.
- GST-only mode disables non-GST allocation.
- Migrated and newly generated reports can be viewed as combined, GST-only or non-GST-only documents and can be edited, deleted, printed or downloaded as PDF.

### GST invoice-number rule

`settings/invoice.gstInvoiceCurrentNumber` is the **next GST number to use**.

- A newly saved invoice with GST bricks receives `{prefix}-{currentNumber}`.
- The counter increments in the same Firestore transaction, preventing duplicate allocation between concurrent users.
- Editing an existing GST invoice preserves its original number.
- Converting a previously non-GST report to GST allocates one number exactly once.
- A non-GST-only invoice has no GST invoice number and does not increment the counter.

### Settings

- Company, invoice/GST, vehicles, bank, alerts, data migration and about sections.
- Add/edit/delete vehicle numbers used in sales.
- Configure GST prefix, next number and auto-increment.
- Invoice print-format switches control company mark, customer details, bank details, terms and signature area.

## Inventory migration correction

Migration v6 calculates legacy stock exactly as the old Inventory screen did:

```text
Total production − Total sales
4,681,262 − 4,129,539 = 551,723 bricks
```

It does not trust the stale RTDB `total_stock` value of `534,223`. The migration also removes known duplicate legacy stock movements and synthetic payments created by earlier migration attempts.

## Installation

```bash
npm install
npm start
```

Production build:

```bash
npm run build
```

## Firebase setup

Enable Email/Password Authentication and create Firestore in the `patel-bricks` project. Deploy rules and indexes before testing filtered lists and reports:

```bash
npx firebase-tools login
npx firebase-tools use patel-bricks
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## Upgrade and remigrate

1. Keep the Realtime Database unchanged as your source backup.
2. Deploy this app and its Firestore rules/indexes.
3. Log in and open **Settings → Data & migration**.
4. Click **Inspect legacy data**.
5. Click **Run migration** and wait for `completed · migration v6`.
6. Click **Verify Firestore data**.
7. Confirm brick stock is **551,723**.
8. Spot-check customer sites/rates, all six vehicles, recent sales, payments, customer ledgers and generated GST/non-GST invoices.
9. Confirm the next GST preview is `C-48` before creating a new GST report, unless that sequence has already advanced in live usage.

The migration is deterministic and idempotent, so rerunning v6 replaces the same migrated records instead of duplicating them.
