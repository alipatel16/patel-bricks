import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchCursorPage, where } from './firestorePager';
import { asNumber, dateKey, monthKey, resultError, resultOk, toPlainData } from './queryUtils';

export const INVENTORY_DEFAULTS = {
  bricks: 0,
  cementBags: 0,
  cementCostPerBag: 0,
  materials: {
    sand: 0,
    fly_ash: 0,
    dust: 0,
    lime: 0,
    chemical: 0,
  },
  materialUnits: {
    sand: 'tons',
    fly_ash: 'tons',
    dust: 'tons',
    lime: 'tons',
    chemical: 'litres',
  },
  lowStock: { bricks: 1000, cementBags: 10 },
};

const fieldForStockType = (stockType) => {
  if (stockType === 'bricks') return 'bricks';
  if (stockType === 'cement') return 'cementBags';
  return `materials.${stockType}`;
};

const currentStockFor = (inventory, stockType) => {
  if (stockType === 'bricks') return asNumber(inventory.bricks);
  if (stockType === 'cement') return asNumber(inventory.cementBags);
  return asNumber(inventory.materials?.[stockType]);
};

export const inventoryService = {
  getInventory: async () => {
    try {
      const snapshot = await getDoc(doc(db, 'system', 'inventory'));
      return resultOk(snapshot.exists() ? { ...INVENTORY_DEFAULTS, ...snapshot.data() } : INVENTORY_DEFAULTS);
    } catch (error) {
      return resultError(error);
    }
  },

  adjustStock: async ({ stockType, quantity, operation = 'add', notes = '', date = dateKey() }) => {
    try {
      const amount = Math.abs(asNumber(quantity));
      if (!amount) throw new Error('Enter a quantity greater than zero.');
      const delta = operation === 'subtract' ? -amount : amount;
      const inventoryRef = doc(db, 'system', 'inventory');
      const transactionRef = doc(collection(db, 'inventoryTransactions'));
      const field = fieldForStockType(stockType);

      await runTransaction(db, async (transaction) => {
        const inventorySnapshot = await transaction.get(inventoryRef);
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        if (currentStockFor(inventory, stockType) + delta < 0) throw new Error(`Insufficient ${stockType} stock.`);

        transaction.set(inventoryRef, { [field]: increment(delta), updatedAt: serverTimestamp() }, { merge: true });
        transaction.set(transactionRef, {
          stockType,
          transactionType: 'adjustment',
          operation,
          quantity: amount,
          delta,
          notes,
          date,
          createdAt: serverTimestamp(),
        });
      });
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },

  recordPurchase: async ({
    stockType,
    quantity,
    unit = '',
    unitCost = 0,
    supplier = null,
    billNumber = '',
    gstRate = 0,
    date = dateKey(),
    notes = '',
  }) => {
    try {
      const amount = Math.abs(asNumber(quantity));
      const cost = Math.max(0, asNumber(unitCost));
      if (!amount) throw new Error('Enter a purchase quantity greater than zero.');
      const taxableAmount = amount * cost;
      const gstAmount = taxableAmount * (asNumber(gstRate) / 100);
      const totalAmount = taxableAmount + gstAmount;
      const inventoryRef = doc(db, 'system', 'inventory');
      const purchaseRef = doc(collection(db, 'purchases'));
      const transactionRef = doc(collection(db, 'inventoryTransactions'));
      const supplierRef = supplier?.id ? doc(db, 'suppliers', supplier.id) : null;
      const dailyRef = doc(db, 'dailyStats', date);
      const monthlyRef = doc(db, 'monthlyStats', monthKey(date));
      const metricsRef = doc(db, 'metrics', 'current');
      const field = fieldForStockType(stockType);

      await runTransaction(db, async (transaction) => {
        const reads = [transaction.get(inventoryRef)];
        if (supplierRef) reads.push(transaction.get(supplierRef));
        const snapshots = await Promise.all(reads);
        if (supplierRef && !snapshots[1]?.exists()) throw new Error('Selected supplier no longer exists.');

        transaction.set(inventoryRef, {
          [field]: increment(amount),
          ...(stockType === 'cement' ? { cementCostPerBag: cost } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.set(purchaseRef, {
          purchaseNumber: `PUR-${Date.now()}`,
          stockType,
          quantity: amount,
          unit: unit || (stockType === 'cement' ? 'bags' : stockType === 'chemical' ? 'litres' : stockType === 'bricks' ? 'bricks' : 'tons'),
          unitCost: cost,
          taxableAmount,
          gstRate: asNumber(gstRate),
          gstAmount,
          totalAmount,
          supplierId: supplier?.id || null,
          supplierName: supplier?.name || '',
          supplierGstin: supplier?.gstin || '',
          billNumber,
          notes,
          date,
          createdAt: serverTimestamp(),
          inventoryTransactionId: transactionRef.id,
          updatedAt: serverTimestamp(),
        });
        transaction.set(transactionRef, {
          stockType,
          transactionType: 'purchase',
          operation: 'add',
          quantity: amount,
          delta: amount,
          amount: totalAmount,
          referenceId: purchaseRef.id,
          notes: notes || `Purchase ${billNumber || purchaseRef.id}`,
          date,
          createdAt: serverTimestamp(),
        });
        if (supplierRef) {
          transaction.update(supplierRef, {
            totalPurchases: increment(1),
            totalAmount: increment(totalAmount),
            lastPurchaseDate: date,
            updatedAt: serverTimestamp(),
          });
        }
        [dailyRef, monthlyRef, metricsRef].forEach((reference) => {
          transaction.set(reference, {
            purchaseAmount: increment(totalAmount),
            purchaseCount: increment(1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      });

      return resultOk({ id: purchaseRef.id, totalAmount });
    } catch (error) {
      return resultError(error);
    }
  },

  deletePurchase: async (id) => {
    try {
      const purchaseRef = doc(db, 'purchases', id);
      const inventoryRef = doc(db, 'system', 'inventory');
      await runTransaction(db, async (transaction) => {
        const purchaseSnapshot = await transaction.get(purchaseRef);
        if (!purchaseSnapshot.exists()) throw new Error('Purchase record not found.');
        const purchase = purchaseSnapshot.data();
        const inventorySnapshot = await transaction.get(inventoryRef);
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        if (currentStockFor(inventory, purchase.stockType) < asNumber(purchase.quantity)) {
          throw new Error('This purchase cannot be deleted because part of its stock has already been consumed.');
        }
        const field = fieldForStockType(purchase.stockType);
        transaction.delete(purchaseRef);
        if (purchase.inventoryTransactionId) {
          transaction.delete(doc(db, 'inventoryTransactions', purchase.inventoryTransactionId));
        }
        transaction.set(inventoryRef, { [field]: increment(-asNumber(purchase.quantity)), updatedAt: serverTimestamp() }, { merge: true });
        if (purchase.supplierId) {
          transaction.update(doc(db, 'suppliers', purchase.supplierId), {
            totalPurchases: increment(-1),
            totalAmount: increment(-asNumber(purchase.totalAmount)),
            updatedAt: serverTimestamp(),
          });
        }
        const dailyRef = doc(db, 'dailyStats', purchase.date);
        const monthlyRef = doc(db, 'monthlyStats', monthKey(purchase.date));
        const metricsRef = doc(db, 'metrics', 'current');
        [dailyRef, monthlyRef, metricsRef].forEach((reference) => {
          transaction.set(reference, {
            purchaseAmount: increment(-asNumber(purchase.totalAmount)),
            purchaseCount: increment(-1),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      });
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },

  getTransactionsPage: async ({ cursor, pageSize = 10, stockType = 'all', transactionType = 'all' }) => {
    try {
      const constraints = [];
      if (stockType !== 'all') constraints.push(where('stockType', '==', stockType));
      if (transactionType !== 'all') constraints.push(where('transactionType', '==', transactionType));
      const page = await fetchCursorPage({
        collectionName: 'inventoryTransactions',
        cursor,
        pageSize,
        constraints,
        sortField: 'createdAt',
        sortDirection: 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },

  getPurchasesPage: async ({ cursor, pageSize = 10, stockType = 'all', supplierId = '', dateFrom = '', dateTo = '' }) => {
    try {
      const constraints = [];
      if (stockType !== 'all') constraints.push(where('stockType', '==', stockType));
      if (supplierId) constraints.push(where('supplierId', '==', supplierId));
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      const page = await fetchCursorPage({
        collectionName: 'purchases',
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

  getPurchaseById: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'purchases', id));
      return resultOk(snapshot.exists() ? toPlainData(snapshot) : null);
    } catch (error) {
      return resultError(error);
    }
  },
};
