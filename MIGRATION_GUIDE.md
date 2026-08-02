# Realtime Database → Firestore migration v6

## Why v6 is required

Earlier migration attempts could stop on missing optional fields, trust the stale RTDB stock total, duplicate some stock-history movements or create synthetic payments. Migration v6 sanitizes every Firestore payload, restores the legacy sales/customer/settings workflows and rebuilds brick stock using the old application’s actual calculation.

It also migrates and verifies the Customer Report GST sequence:

```text
prefix: C
next number: 48
auto increment: true
```

The number is consumed only by a saved invoice containing GST bricks.

## Safe upgrade steps

1. Keep the current Realtime Database unchanged.
2. Deploy Firestore rules and indexes:
   ```bash
   npx firebase-tools use patel-bricks
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```
3. Install and start v2.3.0.
4. Sign in and open **Settings → Data & migration**.
5. Click **Inspect legacy data**.
6. Check that calculated stock is **551,723**.
7. Click **Run migration** and wait for `completed · migration v6`.
8. Click **Verify Firestore data**.
9. Spot-check customers, 141 customer sites/rates, six vehicles, sales, payments, generated invoices, purchases and ledgers.

## Stock calculation

```text
4,681,262 produced − 4,129,539 sold = 551,723 bricks
```

The old RTDB stored total is `534,223`, which is `17,500` lower. Migration v6 writes the calculated value and stores the production, sales, old stored value and variance in `system/inventory`.

## GST numbering behavior

- Settings contains the next GST number, not the last used number.
- New GST report creation reads and increments that value inside one Firestore transaction.
- Non-GST-only reports do not receive or consume a number.
- Existing GST numbers are preserved during edits.
- Deleting a GST report does not roll the sequence backwards.
- Verification checks the migrated prefix and auto-increment flag. The live current number may be greater than the migrated value after valid new GST invoices are created.

## Idempotency

Migrated documents use deterministic IDs. Rerunning v6 overwrites the same migration-owned records and removes known obsolete duplicate documents. New records created in the Firestore app are not assigned legacy IDs and are not duplicated by the migration.

## Payment correction

A legacy sale’s payment method does not by itself prove payment. The migration imports actual payment entries. Receipts that cannot be safely linked to one sale remain customer-level records with `legacyUnallocated: true`.
