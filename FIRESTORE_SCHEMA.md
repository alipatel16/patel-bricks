# Firestore schema — v2.2.0

## Core collections

- `customers/{id}` — customer profile, normalized search fields, totals, `locations[]`, and `brickRates{locationId: rate}`.
- `sales/{id}` — individual sales invoice with customer snapshot, `locationId`, location address/state, vehicle, quantities, tax, payment and inventory references.
- `payments/{id}` — invoice-linked or customer-level receipts. Imported unallocated receipts carry `legacyUnallocated: true`.
- `legacyInvoices/{id}` — migrated and newly generated consolidated GST/non-GST invoice reports.
- `production/{id}` — production records.
- `purchases/{id}` — cement/material/supplier purchases.
- `inventoryTransactions/{id}` — canonical production, sale, purchase and manual adjustment movements.
- `suppliers/{id}` — supplier master and aggregate totals.

## Aggregate and configuration documents

- `system/inventory` — current stock plus migration calculation evidence.
- `system/migration` — migration v6 status, expected counts, corrected stock evidence and migrated GST sequence values.
- `metrics/current` — all-time dashboard aggregates.
- `dailyStats/{YYYY-MM-DD}` and `monthlyStats/{YYYY-MM}` — report/dashboard aggregates.
- `settings/company`, `settings/invoice`, `settings/bank`, `settings/notifications`. `settings/invoice` contains vehicle master data, GST component rates, print-format switches and the next Customer Report GST invoice number.
- `counters/invoice-{YYYY-MM}` — monthly sales invoice counters.

## Customer locations

Each customer location is stored as:

```js
{
  id,
  name,
  address,
  contactPerson,
  contactPhone,
  pincode,
  state,
  stateCode,
  isPrimary,
  brickRate
}
```

The invoice form selects a location by ID and applies `customer.brickRates[locationId]` automatically.

## Read-control strategy

- Operational lists use cursor pagination with a 10-record page.
- Autocomplete begins after two characters and returns at most eight records.
- Dashboard and analytics use aggregate documents rather than scanning sales.
- Customer-history propagation and statement/invoice generation are explicit on-demand operations scoped to one customer/date range.


## Customer Report GST sequence

`settings/invoice` stores:

```js
{
  gstInvoicePrefix: 'C',
  gstInvoiceCurrentNumber: 48, // next number to use
  gstInvoiceAutoIncrement: true
}
```

A GST generated invoice stores `gstInvoiceNumber`; a non-GST-only invoice stores `null`. Allocation and increment happen in one transaction.

## Generated invoice snapshots

`legacyInvoices/{id}` stores top-level search/report fields and `originalInvoiceData`, including the date range, selected site, rate, tax calculation and nested customer snapshot. Customer-history propagation updates both layers.
