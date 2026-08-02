import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchCursorPage, where } from './firestorePager';
import { asNumber, dateKey, monthKey, resultError, resultOk, toPlainData } from './queryUtils';
import { INVENTORY_DEFAULTS } from './inventoryService';

const prepareProduction = (input) => ({
  date: input.date || dateKey(),
  quantity: Math.abs(asNumber(input.quantity)),
  cementUsed: Math.abs(asNumber(input.cementUsed)),
  shift: input.shift || 'day',
  grade: input.grade || 'A',
  rejectedQuantity: Math.abs(asNumber(input.rejectedQuantity)),
  notes: String(input.notes || '').trim(),
});

export const productionService = {
  addProduction: async (input) => {
    try {
      const production = prepareProduction(input);
      if (!production.quantity) throw new Error('Production quantity must be greater than zero.');
      const productionRef = doc(collection(db, 'production'));
      const inventoryRef = doc(db, 'system', 'inventory');
      const inventoryTransactionRef = doc(collection(db, 'inventoryTransactions'));
      const dailyRef = doc(db, 'dailyStats', production.date);
      const monthlyRef = doc(db, 'monthlyStats', monthKey(production.date));
      const metricsRef = doc(db, 'metrics', 'current');

      await runTransaction(db, async (transaction) => {
        const inventorySnapshot = await transaction.get(inventoryRef);
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        if (asNumber(inventory.cementBags) < production.cementUsed) {
          throw new Error('Cement stock is lower than the entered usage.');
        }

        transaction.set(productionRef, {
          ...production,
          inventoryTransactionId: inventoryTransactionRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(
          inventoryRef,
          {
            bricks: increment(production.quantity),
            cementBags: increment(-production.cementUsed),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(inventoryTransactionRef, {
          stockType: 'bricks',
          transactionType: 'production',
          operation: 'add',
          quantity: production.quantity,
          delta: production.quantity,
          referenceId: productionRef.id,
          notes: `Production · ${production.shift} shift`,
          date: production.date,
          createdAt: serverTimestamp(),
        });
        [dailyRef, monthlyRef, metricsRef].forEach((reference) => {
          transaction.set(
            reference,
            {
              productionQuantity: increment(production.quantity),
              rejectedQuantity: increment(production.rejectedQuantity),
              cementUsed: increment(production.cementUsed),
              productionCount: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        });
      });
      return resultOk({ id: productionRef.id, ...production });
    } catch (error) {
      return resultError(error);
    }
  },

  updateProduction: async (id, input) => {
    try {
      const next = prepareProduction(input);
      const productionRef = doc(db, 'production', id);
      const inventoryRef = doc(db, 'system', 'inventory');

      await runTransaction(db, async (transaction) => {
        const [productionSnapshot, inventorySnapshot] = await Promise.all([
          transaction.get(productionRef),
          transaction.get(inventoryRef),
        ]);
        if (!productionSnapshot.exists()) throw new Error('Production record not found.');
        const previous = productionSnapshot.data();
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        const brickDelta = next.quantity - asNumber(previous.quantity);
        const cementDelta = next.cementUsed - asNumber(previous.cementUsed);
        if (asNumber(inventory.bricks) + brickDelta < 0) throw new Error('This edit would make brick stock negative.');
        if (asNumber(inventory.cementBags) - cementDelta < 0) throw new Error('This edit would make cement stock negative.');

        transaction.update(productionRef, { ...next, updatedAt: serverTimestamp() });
        transaction.set(
          inventoryRef,
          { bricks: increment(brickDelta), cementBags: increment(-cementDelta), updatedAt: serverTimestamp() },
          { merge: true },
        );

        const previousDate = previous.date || next.date;
        const previousMonth = monthKey(previousDate);
        const nextMonth = monthKey(next.date);
        const quantityDelta = next.quantity - asNumber(previous.quantity);
        const rejectedDelta = next.rejectedQuantity - asNumber(previous.rejectedQuantity);
        const usageDelta = next.cementUsed - asNumber(previous.cementUsed);
        const metricsRef = doc(db, 'metrics', 'current');

        transaction.set(metricsRef, {
          productionQuantity: increment(quantityDelta),
          rejectedQuantity: increment(rejectedDelta),
          cementUsed: increment(usageDelta),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        if (previousDate === next.date) {
          transaction.set(doc(db, 'dailyStats', next.date), {
            productionQuantity: increment(quantityDelta),
            rejectedQuantity: increment(rejectedDelta),
            cementUsed: increment(usageDelta),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } else {
          transaction.set(doc(db, 'dailyStats', previousDate), {
            productionQuantity: increment(-asNumber(previous.quantity)),
            rejectedQuantity: increment(-asNumber(previous.rejectedQuantity)),
            cementUsed: increment(-asNumber(previous.cementUsed)),
            productionCount: increment(-1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          transaction.set(doc(db, 'dailyStats', next.date), {
            productionQuantity: increment(next.quantity),
            rejectedQuantity: increment(next.rejectedQuantity),
            cementUsed: increment(next.cementUsed),
            productionCount: increment(1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        if (previousMonth === nextMonth) {
          transaction.set(doc(db, 'monthlyStats', nextMonth), {
            productionQuantity: increment(quantityDelta),
            rejectedQuantity: increment(rejectedDelta),
            cementUsed: increment(usageDelta),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } else {
          transaction.set(doc(db, 'monthlyStats', previousMonth), {
            productionQuantity: increment(-asNumber(previous.quantity)),
            rejectedQuantity: increment(-asNumber(previous.rejectedQuantity)),
            cementUsed: increment(-asNumber(previous.cementUsed)),
            productionCount: increment(-1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          transaction.set(doc(db, 'monthlyStats', nextMonth), {
            productionQuantity: increment(next.quantity),
            rejectedQuantity: increment(next.rejectedQuantity),
            cementUsed: increment(next.cementUsed),
            productionCount: increment(1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      });
      return resultOk({ id, ...next });
    } catch (error) {
      return resultError(error);
    }
  },

  deleteProduction: async (id) => {
    try {
      const productionRef = doc(db, 'production', id);
      const inventoryRef = doc(db, 'system', 'inventory');
      await runTransaction(db, async (transaction) => {
        const [productionSnapshot, inventorySnapshot] = await Promise.all([
          transaction.get(productionRef),
          transaction.get(inventoryRef),
        ]);
        if (!productionSnapshot.exists()) throw new Error('Production record not found.');
        const production = productionSnapshot.data();
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        if (asNumber(inventory.bricks) < asNumber(production.quantity)) {
          throw new Error('Cannot delete this production because some of those bricks have already been sold.');
        }
        transaction.delete(productionRef);
        if (production.inventoryTransactionId) {
          transaction.delete(doc(db, 'inventoryTransactions', production.inventoryTransactionId));
        }
        transaction.set(inventoryRef, {
          bricks: increment(-asNumber(production.quantity)),
          cementBags: increment(asNumber(production.cementUsed)),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        const dailyRef = doc(db, 'dailyStats', production.date);
        const monthlyRef = doc(db, 'monthlyStats', monthKey(production.date));
        const metricsRef = doc(db, 'metrics', 'current');
        [dailyRef, monthlyRef, metricsRef].forEach((reference) => {
          transaction.set(reference, {
            productionQuantity: increment(-asNumber(production.quantity)),
            rejectedQuantity: increment(-asNumber(production.rejectedQuantity)),
            cementUsed: increment(-asNumber(production.cementUsed)),
            productionCount: increment(-1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      });
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },

  getProductionPage: async ({ cursor, pageSize = 10, dateFrom = '', dateTo = '', shift = 'all' }) => {
    try {
      const constraints = [];
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      if (shift !== 'all') constraints.push(where('shift', '==', shift));
      const page = await fetchCursorPage({
        collectionName: 'production',
        cursor,
        pageSize,
        constraints,
        sortField: 'date',
        sortDirection: 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },

  getProductionById: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'production', id));
      return resultOk(snapshot.exists() ? toPlainData(snapshot) : null);
    } catch (error) {
      return resultError(error);
    }
  },
};
