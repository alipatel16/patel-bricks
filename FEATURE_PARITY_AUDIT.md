# Legacy feature parity audit — v2.2.0

| Legacy area | v2.2.0 status |
|---|---|
| Sales Overview | Restored with today/month/outstanding summary cards and cursor-paginated recent sales |
| Sales History | Restored with server search, date/payment/GST filters, view, edit, delete and payment entry |
| Sales Analytics | Restored from daily/monthly aggregate documents rather than full sales scans |
| Customer Report | Restored with customer pagination, account history, statements, printable running ledger and payment entry |
| Customer-report invoice generator | Restored with sales date range, site selection, eligible-sale validation, automatic GST/non-GST quantity balancing and GST-only mode |
| GST invoice numbering | Settings stores the next number; assignment and increment happen atomically only when GST bricks are saved |
| Non-GST invoice numbering | Non-GST-only invoices have no GST invoice number and never consume the GST counter |
| Invoice Reports | Restored for migrated and newly generated reports with combined/GST/non-GST view, edit, delete, print and PDF |
| Multiple customer locations | Restored with address, contact, state and primary-site data |
| Brick rate per customer location | Restored and auto-applied in regular sales and customer-report invoices |
| Complete customer autocomplete selection | Restored; Enter/click replaces the typed prefix with the full selected customer |
| Historical customer propagation | Restored as an explicit option for sales, payments and generated invoices |
| Historical rate propagation | Optional recalculation of matching historical sales and generated invoices restored |
| Vehicle master in Settings | Restored with add/edit/delete and selectable/free-typed sales vehicle field |
| Invoice print-format switches | Restored for company mark, customer details, bank details, terms and signatures |
| Legacy sales invoice counters | Migrated and used for `B18-YYMM-###` operational sale references |
| Customer-report GST sequence | Migrated from legacy prefix/current number/auto-increment settings |
| Correct legacy brick stock | Restored using production minus sales: `4,681,262 − 4,129,539 = 551,723` |
| Duplicate v4 inventory history | Removed by versioned migration cleanup |
| Actual legacy customer payments | Migrated once; synthetic v4 payments are removed |
| Cursor pagination / 2-character search | Preserved across operational lists and autocomplete |

## Intentionally not copied as-is

The old client-side whole-database backup, whole-database restore and destructive reset controls are not included. Those operations require broad collection scans/writes and are unsafe for a Spark-plan client app. The safer cutover path is the retained Realtime Database, versioned idempotent migration, explicit inspection and Firestore verification.
