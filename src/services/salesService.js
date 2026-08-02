import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchCursorPage } from './firestorePager';
import {
  asNumber,
  dateKey,
  makeSearchPrefixes,
  monthKey,
  normalizeText,
  resultError,
  resultOk,
  toPlainData,
} from './queryUtils';
import { INVENTORY_DEFAULTS } from './inventoryService';

const calculateAmounts = ({
  quantity,
  rate,
  discount = 0,
  isGst = false,
  interstate = false,
  gstRate: configuredGstRate = 12,
  cgstRate: configuredCgstRate = 6,
  sgstRate: configuredSgstRate = 6,
  igstRate: configuredIgstRate = 12,
}) => {
  const qty = Math.abs(asNumber(quantity));
  const unitRate = Math.max(0, asNumber(rate));
  const grossAmount = qty * unitRate;
  const discountAmount = Math.min(grossAmount, Math.max(0, asNumber(discount)));
  const taxableAmount = grossAmount - discountAmount;
  const fallbackGstRate = Math.max(0, asNumber(configuredGstRate, 12));
  const cgstRate = isGst && !interstate ? Math.max(0, asNumber(configuredCgstRate, fallbackGstRate / 2)) : 0;
  const sgstRate = isGst && !interstate ? Math.max(0, asNumber(configuredSgstRate, fallbackGstRate / 2)) : 0;
  const igstRate = isGst && interstate ? Math.max(0, asNumber(configuredIgstRate, fallbackGstRate)) : 0;
  const gstRate = isGst ? (interstate ? igstRate : cgstRate + sgstRate) : 0;
  const cgstAmount = taxableAmount * (cgstRate / 100);
  const sgstAmount = taxableAmount * (sgstRate / 100);
  const igstAmount = taxableAmount * (igstRate / 100);
  const gstAmount = cgstAmount + sgstAmount + igstAmount;
  return {
    quantity: qty,
    rate: unitRate,
    grossAmount,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    totalAmount: taxableAmount + gstAmount,
  };
};

const paymentStatusFor = (paid, total) => {
  if (paid <= 0) return 'due';
  if (paid >= total) return 'paid';
  return 'partial';
};

const counterId = (date) => `invoice-${monthKey(date)}`;

const addAggregateDelta = (map, reference, values) => {
  const key = reference.path;
  const current = map.get(key) || { reference, values: {} };
  Object.entries(values).forEach(([field, value]) => {
    current.values[field] = asNumber(current.values[field]) + asNumber(value);
  });
  map.set(key, current);
};

const applyAggregateDeltas = (transaction, map) => {
  map.forEach(({ reference, values }) => {
    const payload = { updatedAt: serverTimestamp() };
    Object.entries(values).forEach(([field, value]) => {
      if (value !== 0) payload[field] = increment(value);
    });
    transaction.set(reference, payload, { merge: true });
  });
};

export const salesService = {
  recordSale: async (input) => {
    try {
      if (!input.customer?.id) throw new Error('Select a customer from the search results.');
      const date = input.date || dateKey();
      const amounts = calculateAmounts(input);
      if (!amounts.quantity) throw new Error('Sale quantity must be greater than zero.');
      if (!amounts.rate) throw new Error('Enter a valid brick rate.');
      const paidAmount = Math.min(amounts.totalAmount, Math.max(0, asNumber(input.paidAmount)));
      const balanceDue = amounts.totalAmount - paidAmount;
      const saleRef = doc(collection(db, 'sales'));
      const paymentRef = paidAmount > 0 ? doc(collection(db, 'payments')) : null;
      const inventoryTransactionRef = doc(collection(db, 'inventoryTransactions'));
      const inventoryRef = doc(db, 'system', 'inventory');
      const customerRef = doc(db, 'customers', input.customer.id);
      const counterRef = doc(db, 'counters', counterId(date));
      const dailyRef = doc(db, 'dailyStats', date);
      const monthlyRef = doc(db, 'monthlyStats', monthKey(date));
      const metricsRef = doc(db, 'metrics', 'current');

      let savedSale = null;
      await runTransaction(db, async (transaction) => {
        const [inventorySnapshot, customerSnapshot, counterSnapshot] = await Promise.all([
          transaction.get(inventoryRef),
          transaction.get(customerRef),
          transaction.get(counterRef),
        ]);
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        if (!customerSnapshot.exists()) throw new Error('Selected customer no longer exists.');
        if (asNumber(inventory.bricks) < amounts.quantity) throw new Error('Not enough brick stock for this invoice.');

        const nextCounter = asNumber(counterSnapshot.data()?.count) + 1;
        const [year, month] = date.split('-');
        const invoicePrefix = String(input.invoicePrefix || 'B18').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'B18';
        const invoiceNumber = `${invoicePrefix}-${year.slice(-2)}${month}-${String(nextCounter).padStart(3, '0')}`;
        const customer = customerSnapshot.data();
        const sale = {
          invoiceNumber,
          invoiceNumberLower: normalizeText(invoiceNumber),
          date,
          customerId: customerRef.id,
          customerName: customer.name,
          customerNameLower: normalizeText(customer.name),
          customerPhone: customer.phone || '',
          customerGstin: customer.gstin || '',
          customerState: input.location?.state || customer.state || 'GJ',
          customerStateCode: input.location?.stateCode || customer.stateCode || '24',
          customerAddress: input.location?.address || customer.address || '',
          location: String(input.location?.name || input.location || '').trim(),
          locationId: input.location?.id || input.locationId || null,
          vehicleNumber: String(input.vehicleNumber || '').trim().toUpperCase(),
          challanNumber: String(input.challanNumber || '').trim(),
          productName: input.productName || 'Fly Ash Bricks',
          hsnCode: input.hsnCode || '6815',
          ...amounts,
          isGst: Boolean(input.isGst),
          interstate: Boolean(input.interstate),
          paidAmount,
          balanceDue,
          paymentMethod: input.paymentMethod || (paidAmount ? 'cash' : 'credit'),
          paymentStatus: paymentStatusFor(paidAmount, amounts.totalAmount),
          notes: String(input.notes || '').trim(),
          searchPrefixes: makeSearchPrefixes(invoiceNumber, customer.name, customer.phone, input.vehicleNumber, input.location?.name || input.location),
          paymentId: paymentRef?.id || null,
          inventoryTransactionId: inventoryTransactionRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        transaction.set(counterRef, { count: nextCounter, updatedAt: serverTimestamp() }, { merge: true });
        transaction.set(saleRef, sale);
        transaction.set(inventoryRef, { bricks: increment(-amounts.quantity), updatedAt: serverTimestamp() }, { merge: true });
        transaction.set(inventoryTransactionRef, {
          stockType: 'bricks',
          transactionType: 'sale',
          operation: 'subtract',
          quantity: amounts.quantity,
          delta: -amounts.quantity,
          amount: amounts.totalAmount,
          referenceId: saleRef.id,
          notes: `Invoice ${invoiceNumber}`,
          date,
          createdAt: serverTimestamp(),
        });
        transaction.update(customerRef, {
          totalPurchases: increment(1),
          totalAmount: increment(amounts.totalAmount),
          totalPaid: increment(paidAmount),
          balanceDue: increment(balanceDue),
          lastPurchaseDate: date,
          updatedAt: serverTimestamp(),
        });
        if (paymentRef) {
          transaction.set(paymentRef, {
            customerId: customerRef.id,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            saleId: saleRef.id,
            invoiceNumber,
            date,
            amount: paidAmount,
            method: input.paymentMethod || 'cash',
            notes: 'Payment recorded with invoice',
            createdAt: serverTimestamp(),
          });
        }
        [dailyRef, monthlyRef, metricsRef].forEach((reference) => {
          transaction.set(reference, {
            salesAmount: increment(amounts.totalAmount),
            taxableSales: increment(amounts.taxableAmount),
            gstCollected: increment(amounts.gstAmount),
            salesQuantity: increment(amounts.quantity),
            salesCount: increment(1),
            amountReceived: increment(paidAmount),
            outstandingAmount: increment(balanceDue),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        savedSale = { id: saleRef.id, ...sale };
      });

      return resultOk(savedSale);
    } catch (error) {
      return resultError(error);
    }
  },

  updateSale: async (saleId, input) => {
    try {
      if (!input.customer?.id) throw new Error('Select a customer from the search results.');
      const saleRef = doc(db, 'sales', saleId);
      const inventoryRef = doc(db, 'system', 'inventory');
      const newCustomerRef = doc(db, 'customers', input.customer.id);
      // Keep every payment snapshot attached to this invoice in sync when the
      // invoice is moved to another customer or the customer details change.
      const linkedPayments = await getDocs(query(
        collection(db, 'payments'),
        where('saleId', '==', saleId),
        limit(100),
      ));
      let savedSale = null;

      await runTransaction(db, async (transaction) => {
        const saleSnapshot = await transaction.get(saleRef);
        if (!saleSnapshot.exists()) throw new Error('Invoice not found.');
        const previous = saleSnapshot.data();
        const oldCustomerRef = doc(db, 'customers', previous.customerId);
        const refs = [inventoryRef, newCustomerRef];
        if (oldCustomerRef.path !== newCustomerRef.path) refs.push(oldCustomerRef);
        const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
        const inventorySnapshot = snapshots[0];
        const newCustomerSnapshot = snapshots[1];
        const oldCustomerSnapshot = oldCustomerRef.path === newCustomerRef.path ? newCustomerSnapshot : snapshots[2];
        if (!newCustomerSnapshot.exists()) throw new Error('Selected customer no longer exists.');
        if (!oldCustomerSnapshot.exists()) throw new Error('Original customer no longer exists.');

        const date = input.date || previous.date || dateKey();
        const amounts = calculateAmounts(input);
        if (!amounts.quantity) throw new Error('Sale quantity must be greater than zero.');
        if (!amounts.rate) throw new Error('Enter a valid brick rate.');
        const existingPaidAmount = asNumber(previous.paidAmount);
        if (amounts.totalAmount < existingPaidAmount) {
          throw new Error(`Invoice total cannot be lower than the already received amount (${existingPaidAmount}).`);
        }
        const balanceDue = amounts.totalAmount - existingPaidAmount;
        const quantityDelta = amounts.quantity - asNumber(previous.quantity);
        const inventory = inventorySnapshot.exists() ? inventorySnapshot.data() : INVENTORY_DEFAULTS;
        if (quantityDelta > 0 && asNumber(inventory.bricks) < quantityDelta) {
          throw new Error(`Not enough brick stock. Additional ${quantityDelta} bricks are required.`);
        }

        const customer = newCustomerSnapshot.data();
        const nextSale = {
          ...previous,
          date,
          customerId: newCustomerRef.id,
          customerName: customer.name,
          customerNameLower: normalizeText(customer.name),
          customerPhone: customer.phone || '',
          customerGstin: customer.gstin || '',
          customerState: input.location?.state || customer.state || previous.customerState || 'GJ',
          customerStateCode: input.location?.stateCode || customer.stateCode || previous.customerStateCode || '24',
          customerAddress: input.location?.address || customer.address || '',
          location: String(input.location?.name || input.location || '').trim(),
          locationId: input.location?.id || input.locationId || null,
          vehicleNumber: String(input.vehicleNumber || '').trim().toUpperCase(),
          challanNumber: String(input.challanNumber || '').trim(),
          productName: input.productName || previous.productName || 'Fly Ash Bricks',
          hsnCode: input.hsnCode || previous.hsnCode || '6815',
          ...amounts,
          isGst: Boolean(input.isGst),
          interstate: Boolean(input.interstate),
          paidAmount: existingPaidAmount,
          balanceDue,
          paymentMethod: input.paymentMethod || previous.paymentMethod || 'cash',
          paymentStatus: paymentStatusFor(existingPaidAmount, amounts.totalAmount),
          notes: String(input.notes || '').trim(),
          searchPrefixes: makeSearchPrefixes(
            previous.invoiceNumber,
            customer.name,
            customer.phone,
            input.vehicleNumber,
            input.location?.name || input.location,
          ),
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        transaction.set(saleRef, nextSale, { merge: false });
        linkedPayments.docs.forEach((paymentDocument) => {
          transaction.set(paymentDocument.ref, {
            customerId: newCustomerRef.id,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            invoiceNumber: previous.invoiceNumber,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        if (quantityDelta !== 0) {
          transaction.set(inventoryRef, {
            bricks: increment(-quantityDelta),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        if (previous.inventoryTransactionId) {
          transaction.set(doc(db, 'inventoryTransactions', previous.inventoryTransactionId), {
            stockType: 'bricks',
            transactionType: 'sale',
            operation: 'subtract',
            quantity: amounts.quantity,
            delta: -amounts.quantity,
            amount: amounts.totalAmount,
            referenceId: saleId,
            notes: `Invoice ${previous.invoiceNumber}`,
            date,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        if (oldCustomerRef.path === newCustomerRef.path) {
          transaction.update(newCustomerRef, {
            totalAmount: increment(amounts.totalAmount - asNumber(previous.totalAmount)),
            balanceDue: increment(balanceDue - asNumber(previous.balanceDue)),
            lastPurchaseDate: date,
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.update(oldCustomerRef, {
            totalPurchases: increment(-1),
            totalAmount: increment(-asNumber(previous.totalAmount)),
            totalPaid: increment(-existingPaidAmount),
            balanceDue: increment(-asNumber(previous.balanceDue)),
            updatedAt: serverTimestamp(),
          });
          transaction.update(newCustomerRef, {
            totalPurchases: increment(1),
            totalAmount: increment(amounts.totalAmount),
            totalPaid: increment(existingPaidAmount),
            balanceDue: increment(balanceDue),
            lastPurchaseDate: date,
            updatedAt: serverTimestamp(),
          });
        }

        const aggregateDeltas = new Map();
        const previousValues = {
          salesAmount: -asNumber(previous.totalAmount),
          taxableSales: -asNumber(previous.taxableAmount),
          gstCollected: -asNumber(previous.gstAmount),
          salesQuantity: -asNumber(previous.quantity),
          salesCount: -1,
          outstandingAmount: -asNumber(previous.balanceDue),
        };
        const nextValues = {
          salesAmount: amounts.totalAmount,
          taxableSales: amounts.taxableAmount,
          gstCollected: amounts.gstAmount,
          salesQuantity: amounts.quantity,
          salesCount: 1,
          outstandingAmount: balanceDue,
        };
        addAggregateDelta(aggregateDeltas, doc(db, 'dailyStats', previous.date), previousValues);
        addAggregateDelta(aggregateDeltas, doc(db, 'monthlyStats', monthKey(previous.date)), previousValues);
        addAggregateDelta(aggregateDeltas, doc(db, 'dailyStats', date), nextValues);
        addAggregateDelta(aggregateDeltas, doc(db, 'monthlyStats', monthKey(date)), nextValues);
        addAggregateDelta(aggregateDeltas, doc(db, 'metrics', 'current'), {
          salesAmount: amounts.totalAmount - asNumber(previous.totalAmount),
          taxableSales: amounts.taxableAmount - asNumber(previous.taxableAmount),
          gstCollected: amounts.gstAmount - asNumber(previous.gstAmount),
          salesQuantity: amounts.quantity - asNumber(previous.quantity),
          outstandingAmount: balanceDue - asNumber(previous.balanceDue),
        });
        applyAggregateDeltas(transaction, aggregateDeltas);
        savedSale = { id: saleId, ...nextSale };
      });

      return resultOk(savedSale);
    } catch (error) {
      return resultError(error);
    }
  },

  recordPayment: async ({ saleId, amount, method = 'cash', date = dateKey(), notes = '' }) => {
    try {
      const paymentAmount = Math.abs(asNumber(amount));
      if (!paymentAmount) throw new Error('Payment amount must be greater than zero.');
      const saleRef = doc(db, 'sales', saleId);
      const paymentRef = doc(collection(db, 'payments'));
      const paymentDailyRef = doc(db, 'dailyStats', date);
      const paymentMonthlyRef = doc(db, 'monthlyStats', monthKey(date));
      const metricsRef = doc(db, 'metrics', 'current');

      await runTransaction(db, async (transaction) => {
        const saleSnapshot = await transaction.get(saleRef);
        if (!saleSnapshot.exists()) throw new Error('Invoice not found.');
        const sale = saleSnapshot.data();
        if (paymentAmount > asNumber(sale.balanceDue)) throw new Error('Payment cannot exceed the pending balance.');
        const nextPaid = asNumber(sale.paidAmount) + paymentAmount;
        const nextBalance = asNumber(sale.balanceDue) - paymentAmount;
        const customerRef = doc(db, 'customers', sale.customerId);
        const customerSnapshot = await transaction.get(customerRef);
        if (!customerSnapshot.exists()) throw new Error('Customer record not found.');

        transaction.update(saleRef, {
          paidAmount: nextPaid,
          balanceDue: nextBalance,
          paymentStatus: paymentStatusFor(nextPaid, asNumber(sale.totalAmount)),
          updatedAt: serverTimestamp(),
        });
        transaction.update(customerRef, {
          totalPaid: increment(paymentAmount),
          balanceDue: increment(-paymentAmount),
          updatedAt: serverTimestamp(),
        });
        transaction.set(paymentRef, {
          customerId: sale.customerId,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone || '',
          saleId,
          invoiceNumber: sale.invoiceNumber,
          date,
          amount: paymentAmount,
          method,
          notes,
          createdAt: serverTimestamp(),
        });

        const aggregateDeltas = new Map();
        addAggregateDelta(aggregateDeltas, paymentDailyRef, { amountReceived: paymentAmount });
        addAggregateDelta(aggregateDeltas, paymentMonthlyRef, { amountReceived: paymentAmount });
        addAggregateDelta(aggregateDeltas, doc(db, 'dailyStats', sale.date), { outstandingAmount: -paymentAmount });
        addAggregateDelta(aggregateDeltas, doc(db, 'monthlyStats', monthKey(sale.date)), { outstandingAmount: -paymentAmount });
        addAggregateDelta(aggregateDeltas, metricsRef, {
          amountReceived: paymentAmount,
          outstandingAmount: -paymentAmount,
        });
        applyAggregateDeltas(transaction, aggregateDeltas);
      });
      return resultOk({ id: paymentRef.id });
    } catch (error) {
      return resultError(error);
    }
  },

  deleteSale: async (saleId) => {
    try {
      const saleRef = doc(db, 'sales', saleId);
      const inventoryRef = doc(db, 'system', 'inventory');
      const paymentsSnapshot = await getDocs(query(
        collection(db, 'payments'),
        where('saleId', '==', saleId),
        limit(100),
      ));

      await runTransaction(db, async (transaction) => {
        const saleSnapshot = await transaction.get(saleRef);
        if (!saleSnapshot.exists()) throw new Error('Invoice not found.');
        const sale = saleSnapshot.data();
        const customerRef = doc(db, 'customers', sale.customerId);
        const [inventorySnapshot, customerSnapshot] = await Promise.all([
          transaction.get(inventoryRef),
          transaction.get(customerRef),
        ]);
        if (!customerSnapshot.exists()) throw new Error('Customer record not found.');

        transaction.delete(saleRef);
        if (sale.inventoryTransactionId) {
          transaction.delete(doc(db, 'inventoryTransactions', sale.inventoryTransactionId));
        }
        paymentsSnapshot.docs.forEach((paymentDocument) => transaction.delete(paymentDocument.ref));
        transaction.set(inventoryRef, {
          bricks: increment(asNumber(sale.quantity)),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        transaction.update(customerRef, {
          totalPurchases: increment(-1),
          totalAmount: increment(-asNumber(sale.totalAmount)),
          totalPaid: increment(-asNumber(sale.paidAmount)),
          balanceDue: increment(-asNumber(sale.balanceDue)),
          updatedAt: serverTimestamp(),
        });

        const aggregateDeltas = new Map();
        const saleValues = {
          salesAmount: -asNumber(sale.totalAmount),
          taxableSales: -asNumber(sale.taxableAmount),
          gstCollected: -asNumber(sale.gstAmount),
          salesQuantity: -asNumber(sale.quantity),
          salesCount: -1,
          outstandingAmount: -asNumber(sale.balanceDue),
        };
        addAggregateDelta(aggregateDeltas, doc(db, 'dailyStats', sale.date), saleValues);
        addAggregateDelta(aggregateDeltas, doc(db, 'monthlyStats', monthKey(sale.date)), saleValues);
        addAggregateDelta(aggregateDeltas, doc(db, 'metrics', 'current'), {
          ...saleValues,
          amountReceived: -asNumber(sale.paidAmount),
        });

        paymentsSnapshot.docs.forEach((paymentDocument) => {
          const payment = paymentDocument.data();
          const paymentDate = payment.date || sale.date;
          const paymentAmount = asNumber(payment.amount);
          addAggregateDelta(aggregateDeltas, doc(db, 'dailyStats', paymentDate), {
            amountReceived: -paymentAmount,
          });
          addAggregateDelta(aggregateDeltas, doc(db, 'monthlyStats', monthKey(paymentDate)), {
            amountReceived: -paymentAmount,
          });
        });
        applyAggregateDeltas(transaction, aggregateDeltas);
      });
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },

  getSalesPage: async ({
    cursor,
    pageSize = 10,
    searchTerm = '',
    dateFrom = '',
    dateTo = '',
    paymentStatus = 'all',
    gstOnly = false,
  }) => {
    try {
      const normalized = normalizeText(searchTerm).replace(/\s+/g, '');
      const constraints = [];
      if (normalized.length >= 2) constraints.push(where('searchPrefixes', 'array-contains', normalized));
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      if (paymentStatus !== 'all') constraints.push(where('paymentStatus', '==', paymentStatus));
      if (gstOnly) constraints.push(where('isGst', '==', true));
      const page = await fetchCursorPage({
        collectionName: 'sales',
        cursor,
        pageSize,
        constraints,
        sortField: dateFrom || dateTo ? 'date' : 'createdAt',
        sortDirection: 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },

  getSaleById: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'sales', id));
      return resultOk(snapshot.exists() ? toPlainData(snapshot) : null);
    } catch (error) {
      return resultError(error);
    }
  },

  getSaleByInvoice: async (invoiceNumber) => {
    try {
      const snapshot = await getDocs(query(collection(db, 'sales'), where('invoiceNumber', '==', invoiceNumber), limit(1)));
      return resultOk(snapshot.empty ? null : toPlainData(snapshot.docs[0]));
    } catch (error) {
      return resultError(error);
    }
  },

  getDailySales: async (date = dateKey()) => {
    try {
      const snapshot = await getDoc(doc(db, 'dailyStats', date));
      return resultOk(snapshot.exists() ? snapshot.data() : {});
    } catch (error) {
      return resultError(error);
    }
  },

  getSalesStats: async (period = 'month') => {
    try {
      const reference = period === 'today'
        ? doc(db, 'dailyStats', dateKey())
        : period === 'all'
          ? doc(db, 'metrics', 'current')
          : doc(db, 'monthlyStats', monthKey());
      const snapshot = await getDoc(reference);
      return resultOk(snapshot.exists() ? snapshot.data() : {});
    } catch (error) {
      return resultError(error);
    }
  },

  getSalesHistory: async (_limit, filters = {}) => salesService.getSalesPage({ pageSize: _limit || 25, ...filters }),
  getAllSales: async () => salesService.getSalesPage({ pageSize: 25 }),
};
