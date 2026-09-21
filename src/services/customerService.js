import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchCursorPage } from './firestorePager';
import {
  AUTOCOMPLETE_LIMIT,
  asNumber,
  makeSearchPrefixes,
  monthKey,
  normalizePhone,
  normalizeText,
  resultError,
  resultOk,
  toPlainData,
} from './queryUtils';

const normalizeLocation = (location = {}, index = 0, brickRates = {}) => {
  const id = String(location.id || `location-${Date.now()}-${index}`);
  const rateValue = location.brickRate ?? location.brick_rate ?? brickRates[id] ?? '';
  return {
    id,
    name: String(location.name || '').trim(),
    address: String(location.address || '').trim(),
    contactPerson: String(location.contactPerson || location.contact_person || '').trim(),
    contactPhone: String(location.contactPhone || location.contact_phone || '').trim(),
    pincode: String(location.pincode || '').trim(),
    state: String(location.state || 'GJ').trim(),
    stateCode: String(location.stateCode || location.state_code || '24').trim(),
    isPrimary: Boolean(location.isPrimary ?? location.is_primary ?? index === 0),
    brickRate: rateValue === '' ? '' : asNumber(rateValue),
  };
};

const prepareCustomer = (input) => {
  const name = String(input.name || '').trim();
  const phone = String(input.phone || '').trim();
  const businessName = String(input.businessName || input.business_name || '').trim();
  const incomingRates = input.brickRates || input.brick_rates || {};
  let locations = Array.isArray(input.locations)
    ? input.locations.map((location, index) => normalizeLocation(location, index, incomingRates))
    : [];

  if (locations.length && !locations.some((location) => location.isPrimary)) {
    locations = locations.map((location, index) => ({ ...location, isPrimary: index === 0 }));
  }
  if (locations.filter((location) => location.isPrimary).length > 1) {
    let primarySeen = false;
    locations = locations.map((location) => {
      if (!location.isPrimary) return location;
      if (primarySeen) return { ...location, isPrimary: false };
      primarySeen = true;
      return location;
    });
  }

  const brickRates = locations.reduce((result, location) => {
    if (location.brickRate !== '' && Number.isFinite(Number(location.brickRate))) {
      result[location.id] = asNumber(location.brickRate);
    }
    return result;
  }, {});
  const primaryLocation = locations.find((location) => location.isPrimary) || locations[0];
  const address = String(input.address || primaryLocation?.address || '').trim();

  return {
    name,
    nameLower: normalizeText(name),
    phone,
    phoneNormalized: normalizePhone(phone),
    email: String(input.email || '').trim(),
    businessName,
    businessNameLower: normalizeText(businessName),
    gstin: String(input.gstin || '').trim().toUpperCase(),
    address,
    billedToName: String(input.billedToName || input.billed_to_name || '').trim(),
    billedToAddress: String(input.billedToAddress || input.billed_to_address || '').trim(),
    receiverName: String(input.receiverName || input.receiver_name || '').trim(),
    receiverAddress: String(input.receiverAddress || input.receiver_address || '').trim(),
    locations,
    brickRates,
    notes: String(input.notes || '').trim(),
    status: input.status || 'active',
    searchPrefixes: makeSearchPrefixes(
      name,
      phone,
      businessName,
      input.gstin,
      input.billedToName,
      input.billedToAddress,
      input.receiverName,
      input.receiverAddress,
      ...locations.flatMap((location) => [location.name, location.address]),
    ),
  };
};

const commitOperations = async (operations) => {
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = writeBatch(db);
    operations.slice(offset, offset + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
};

const recalculateSaleForRate = (sale, rate) => {
  const quantity = asNumber(sale.quantity);
  const grossAmount = quantity * asNumber(rate);
  const discountAmount = Math.min(grossAmount, asNumber(sale.discountAmount));
  const taxableAmount = Math.max(0, grossAmount - discountAmount);
  const gstRate = sale.isGst ? asNumber(sale.gstRate, 12) : 0;
  const gstAmount = taxableAmount * (gstRate / 100);
  const totalAmount = taxableAmount + gstAmount;
  const paidAmount = Math.min(asNumber(sale.paidAmount), totalAmount);
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  return {
    rate: asNumber(rate),
    grossAmount,
    taxableAmount,
    gstAmount,
    cgstAmount: sale.isGst && !sale.interstate ? gstAmount / 2 : 0,
    sgstAmount: sale.isGst && !sale.interstate ? gstAmount / 2 : 0,
    igstAmount: sale.isGst && sale.interstate ? gstAmount : 0,
    totalAmount,
    paidAmount,
    balanceDue,
    paymentStatus: balanceDue <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'due',
  };
};

const propagateCustomerHistory = async ({ customerId, previous, next, updateHistoricalRates }) => {
  const [salesSnapshot, paymentsSnapshot, generatedInvoicesSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'sales'), where('customerId', '==', customerId))),
    getDocs(query(collection(db, 'payments'), where('customerId', '==', customerId))),
    getDocs(query(collection(db, 'legacyInvoices'), where('customerId', '==', customerId))),
  ]);

  const operations = [];
  const aggregateDeltas = new Map();
  let customerAmountDelta = 0;
  let customerPaidDelta = 0;
  let customerBalanceDelta = 0;
  const previousLocations = previous.locations || [];
  const nextLocations = next.locations || [];

  const addAggregateDelta = (path, values) => {
    const current = aggregateDeltas.get(path) || {};
    Object.entries(values).forEach(([field, value]) => {
      current[field] = asNumber(current[field]) + asNumber(value);
    });
    aggregateDeltas.set(path, current);
  };

  salesSnapshot.docs.forEach((saleDocument) => {
    const sale = saleDocument.data();
    const oldLocation = previousLocations.find((location) => (
      location.id === sale.locationId || normalizeText(location.name) === normalizeText(sale.location)
    ));
    const newLocation = oldLocation
      ? nextLocations.find((location) => location.id === oldLocation.id)
      : nextLocations.find((location) => normalizeText(location.name) === normalizeText(sale.location));

    const updates = {
      customerName: next.name,
      customerNameLower: next.nameLower,
      customerPhone: next.phone,
      customerGstin: next.gstin,
      customerAddress: newLocation?.address || next.address || sale.customerAddress || '',
      location: newLocation?.name || sale.location || '',
      locationId: newLocation?.id || sale.locationId || null,
      searchPrefixes: makeSearchPrefixes(
        sale.invoiceNumber,
        next.name,
        next.phone,
        sale.vehicleNumber,
        newLocation?.name || sale.location,
      ),
      updatedAt: serverTimestamp(),
      updatedByCustomerChange: true,
    };

    const oldRate = oldLocation ? previous.brickRates?.[oldLocation.id] : null;
    const newRate = newLocation ? next.brickRates?.[newLocation.id] : null;
    if (
      updateHistoricalRates
      && oldLocation
      && newLocation
      && newRate !== undefined
      && newRate !== null
      && asNumber(newRate) !== asNumber(oldRate)
      && asNumber(newRate) > 0
    ) {
      const recalculated = recalculateSaleForRate(sale, newRate);
      updates.oldRate = asNumber(sale.rate);
      updates.rateUpdatedByCustomerChange = true;
      Object.assign(updates, recalculated);

      const totalDelta = recalculated.totalAmount - asNumber(sale.totalAmount);
      const taxableDelta = recalculated.taxableAmount - asNumber(sale.taxableAmount);
      const gstDelta = recalculated.gstAmount - asNumber(sale.gstAmount);
      const paidDelta = recalculated.paidAmount - asNumber(sale.paidAmount);
      const balanceDelta = recalculated.balanceDue - asNumber(sale.balanceDue);
      customerAmountDelta += totalDelta;
      customerPaidDelta += paidDelta;
      customerBalanceDelta += balanceDelta;
      addAggregateDelta(`dailyStats/${sale.date}`, {
        salesAmount: totalDelta,
        taxableSales: taxableDelta,
        gstCollected: gstDelta,
        amountReceived: paidDelta,
        outstandingAmount: balanceDelta,
      });
      addAggregateDelta(`monthlyStats/${monthKey(sale.date)}`, {
        salesAmount: totalDelta,
        taxableSales: taxableDelta,
        gstCollected: gstDelta,
        amountReceived: paidDelta,
        outstandingAmount: balanceDelta,
      });
      addAggregateDelta('metrics/current', {
        salesAmount: totalDelta,
        taxableSales: taxableDelta,
        gstCollected: gstDelta,
        amountReceived: paidDelta,
        outstandingAmount: balanceDelta,
      });
    }

    operations.push((batch) => batch.update(saleDocument.ref, updates));
  });

  paymentsSnapshot.docs.forEach((paymentDocument) => {
    operations.push((batch) => batch.update(paymentDocument.ref, {
      customerName: next.name,
      customerPhone: next.phone,
      updatedAt: serverTimestamp(),
    }));
  });

  generatedInvoicesSnapshot.docs.forEach((invoiceDocument) => {
    const invoice = invoiceDocument.data();
    const oldLocation = previousLocations.find((location) => (
      normalizeText(location.name) === normalizeText(invoice.selectedSite)
    ));
    const newLocation = oldLocation
      ? nextLocations.find((location) => location.id === oldLocation.id)
      : null;
    const selectedSite = newLocation?.name || invoice.selectedSite || '';
    const existingInvoiceData = invoice.originalInvoiceData || {};
    const existingCustomerData = existingInvoiceData.customerData || {};
    const updates = {
      customerName: next.name,
      customerPhone: next.phone,
      customerGstin: next.gstin,
      billedToName: next.billedToName,
      billedToAddress: next.billedToAddress,
      receiverName: next.receiverName,
      receiverAddress: next.receiverAddress,
      selectedSite,
      originalInvoiceData: {
        ...existingInvoiceData,
        selectedSite,
        customerData: {
          ...existingCustomerData,
          name: next.name,
          phone: next.phone,
          gstin: next.gstin,
          address: newLocation?.address || existingCustomerData.address || selectedSite,
          billedToName: next.billedToName,
          billedToAddress: next.billedToAddress,
          receiverName: next.receiverName,
          receiverAddress: next.receiverAddress,
        },
      },
      searchPrefixes: makeSearchPrefixes(
        invoice.gstInvoiceNumber,
        next.name,
        next.phone,
        selectedSite,
      ),
      updatedAt: serverTimestamp(),
      updatedByCustomerChange: true,
    };

    const newRate = newLocation ? next.brickRates?.[newLocation.id] : null;
    const oldRate = oldLocation ? previous.brickRates?.[oldLocation.id] : null;
    if (
      updateHistoricalRates
      && newRate !== undefined
      && newRate !== null
      && asNumber(newRate) > 0
      && asNumber(newRate) !== asNumber(oldRate)
    ) {
      const gstBricks = asNumber(invoice.gstBricks);
      const nonGstBricks = asNumber(invoice.nonGstBricks);
      const rate = asNumber(newRate);
      const gstRate = asNumber(invoice.gstRate, 12);
      const gstTaxableAmount = gstBricks * rate;
      const gstTaxAmount = gstTaxableAmount * (gstRate / 100);
      const gstAmount = gstTaxableAmount + gstTaxAmount;
      const nonGstAmount = nonGstBricks * rate;
      const totalAmount = gstAmount + nonGstAmount;
      Object.assign(updates, {
        rate,
        gstRate,
        gstTaxableAmount,
        gstTaxAmount,
        gstAmount,
        nonGstAmount,
        totalAmount,
        originalInvoiceData: {
          ...updates.originalInvoiceData,
          actualRate: rate,
          gstRate,
          gstTaxableAmount,
          gstTaxAmount,
          gstAmount,
          nonGstAmount,
          totalAmount,
        },
        rateUpdatedByCustomerChange: true,
      });
    }
    operations.push((batch) => batch.update(invoiceDocument.ref, updates));
  });

  aggregateDeltas.forEach((values, path) => {
    const [collectionName, documentId] = path.split('/');
    operations.push((batch) => {
      const payload = { updatedAt: serverTimestamp() };
      Object.entries(values).forEach(([field, value]) => {
        if (value) payload[field] = increment(value);
      });
      batch.set(doc(db, collectionName, documentId), payload, { merge: true });
    });
  });

  if (customerAmountDelta || customerPaidDelta || customerBalanceDelta) {
    operations.push((batch) => batch.set(doc(db, 'customers', customerId), {
      totalAmount: increment(customerAmountDelta),
      totalPaid: increment(customerPaidDelta),
      balanceDue: increment(customerBalanceDelta),
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  }

  await commitOperations(operations);
  return {
    salesUpdated: salesSnapshot.size,
    paymentsUpdated: paymentsSnapshot.size,
    generatedInvoicesUpdated: generatedInvoicesSnapshot.size,
  };
};

export const customerService = {
  createCustomer: async (input) => {
    try {
      const customer = prepareCustomer(input);
      if (customer.name.length < 2) throw new Error('Customer name must contain at least 2 characters.');
      if (customer.phoneNormalized.length < 7) throw new Error('Enter a valid customer phone number.');

      const duplicate = await getDocs(query(
        collection(db, 'customers'),
        where('phoneNormalized', '==', customer.phoneNormalized),
        limit(1),
      ));
      if (!duplicate.empty) throw new Error('A customer with this phone number already exists.');

      const reference = await addDoc(collection(db, 'customers'), {
        ...customer,
        totalPurchases: 0,
        totalAmount: 0,
        totalPaid: 0,
        balanceDue: 0,
        lastPurchaseDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return resultOk({ id: reference.id, ...customer, totalPurchases: 0, totalAmount: 0, totalPaid: 0, balanceDue: 0 });
    } catch (error) {
      return resultError(error);
    }
  },

  updateCustomer: async (id, input, options = {}) => {
    try {
      const reference = doc(db, 'customers', id);
      const existingSnapshot = await getDoc(reference);
      if (!existingSnapshot.exists()) throw new Error('Customer not found.');
      const previous = prepareCustomer(existingSnapshot.data());
      const customer = prepareCustomer(input);
      if (customer.name.length < 2) throw new Error('Customer name must contain at least 2 characters.');
      if (customer.phoneNormalized.length < 7) throw new Error('Enter a valid customer phone number.');

      if (customer.phoneNormalized !== previous.phoneNormalized) {
        const duplicate = await getDocs(query(
          collection(db, 'customers'),
          where('phoneNormalized', '==', customer.phoneNormalized),
          limit(1),
        ));
        if (duplicate.docs.some((document) => document.id !== id)) {
          throw new Error('A customer with this phone number already exists.');
        }
      }

      await updateDoc(reference, { ...customer, updatedAt: serverTimestamp() });
      let propagated = null;
      if (options.propagateHistory !== false) {
        propagated = await propagateCustomerHistory({
          customerId: id,
          previous,
          next: customer,
          updateHistoricalRates: options.updateHistoricalRates !== false,
        });
      }
      return resultOk({ id, ...customer, propagated });
    } catch (error) {
      return resultError(error);
    }
  },


  recordCustomerPayment: async ({ customerId, amount, method = 'cash', date, notes = '' }) => {
    try {
      const paymentAmount = Math.abs(asNumber(amount));
      if (!paymentAmount) throw new Error('Payment amount must be greater than zero.');
      const paymentDate = date || new Date().toISOString().slice(0, 10);
      const customerRef = doc(db, 'customers', customerId);
      const paymentRef = doc(collection(db, 'payments'));
      await runTransaction(db, async (transaction) => {
        const customerSnapshot = await transaction.get(customerRef);
        if (!customerSnapshot.exists()) throw new Error('Customer not found.');
        const customer = customerSnapshot.data();
        const balance = asNumber(customer.balanceDue);
        if (paymentAmount > balance) throw new Error(`Payment cannot exceed the customer balance of ${balance}.`);
        transaction.set(paymentRef, {
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone || '',
          saleId: null,
          invoiceNumber: '',
          date: paymentDate,
          amount: paymentAmount,
          method,
          notes: String(notes || '').trim(),
          customerLevelPayment: true,
          createdAt: serverTimestamp(),
        });
        transaction.update(customerRef, {
          totalPaid: increment(paymentAmount),
          balanceDue: increment(-paymentAmount),
          updatedAt: serverTimestamp(),
        });
        [
          doc(db, 'dailyStats', paymentDate),
          doc(db, 'monthlyStats', monthKey(paymentDate)),
          doc(db, 'metrics', 'current'),
        ].forEach((reference) => transaction.set(reference, {
          amountReceived: increment(paymentAmount),
          outstandingAmount: increment(-paymentAmount),
          updatedAt: serverTimestamp(),
        }, { merge: true }));
      });
      return resultOk({ id: paymentRef.id, amount: paymentAmount });
    } catch (error) {
      return resultError(error);
    }
  },

  getCustomerById: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'customers', id));
      return resultOk(snapshot.exists() ? toPlainData(snapshot) : null);
    } catch (error) {
      return resultError(error);
    }
  },

  getCustomersPage: async ({ cursor, pageSize = 10, searchTerm = '', status = 'all' }) => {
    try {
      const normalized = normalizeText(searchTerm);
      const constraints = [];
      if (normalized.length >= 2) constraints.push(where('searchPrefixes', 'array-contains', normalized.replace(/\s+/g, '')));
      if (status !== 'all') constraints.push(where('status', '==', status));
      const page = await fetchCursorPage({
        collectionName: 'customers',
        cursor,
        pageSize,
        constraints,
        sortField: normalized.length >= 2 ? 'nameLower' : 'createdAt',
        sortDirection: normalized.length >= 2 ? 'asc' : 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },

  searchCustomers: async (searchTerm, maxResults = AUTOCOMPLETE_LIMIT) => {
    try {
      const normalized = normalizeText(searchTerm).replace(/\s+/g, '');
      if (normalized.length < 2) return resultOk([]);
      const snapshot = await getDocs(query(
        collection(db, 'customers'),
        where('searchPrefixes', 'array-contains', normalized),
        orderBy('nameLower', 'asc'),
        limit(maxResults),
      ));
      return resultOk(snapshot.docs.map(toPlainData));
    } catch (error) {
      return resultError(error);
    }
  },

  deleteCustomer: async (id) => {
    try {
      const customerSnapshot = await getDoc(doc(db, 'customers', id));
      if (!customerSnapshot.exists()) throw new Error('Customer not found.');
      if ((customerSnapshot.data().totalPurchases || 0) > 0) {
        await updateDoc(customerSnapshot.ref, { status: 'inactive', updatedAt: serverTimestamp() });
        return resultOk(null, { message: 'Customer has sales history and was marked inactive.' });
      }
      await deleteDoc(customerSnapshot.ref);
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },

  getCustomerSalesPage: async ({ customerId, cursor, pageSize = 10, dateFrom = '', dateTo = '' }) => {
    try {
      const constraints = [where('customerId', '==', customerId)];
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      const page = await fetchCursorPage({
        collectionName: 'sales',
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

  getCustomerPaymentsPage: async ({ customerId, cursor, pageSize = 10 }) => {
    try {
      const page = await fetchCursorPage({
        collectionName: 'payments',
        cursor,
        pageSize,
        constraints: [where('customerId', '==', customerId)],
        sortField: 'date',
        sortDirection: 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },

  getCustomerLegacyInvoicesPage: async ({ customerId, cursor, pageSize = 10 }) => {
    try {
      const page = await fetchCursorPage({
        collectionName: 'legacyInvoices',
        cursor,
        pageSize,
        constraints: [where('customerId', '==', customerId)],
        sortField: 'date',
        sortDirection: 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },


  getCustomerLedger: async ({ customerId, dateFrom = '', dateTo = '' }) => {
    try {
      // Match the legacy ledger: debit entries come ONLY from GST / Non-GST
      // invoices generated in Customer Report, while credits come from payments.
      const [generatedInvoicesSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'legacyInvoices'), where('customerId', '==', customerId), limit(2000))),
        getDocs(query(collection(db, 'payments'), where('customerId', '==', customerId), limit(2000))),
      ]);

      const generatedEntries = [];
      generatedInvoicesSnapshot.docs.map(toPlainData).forEach((invoice) => {
        const invoiceData = invoice.originalInvoiceData || invoice.invoiceData || {};
        const invoiceDate = invoice.date || invoiceData.invoiceDate || invoice.createdDate || '';
        const rate = asNumber(invoice.rate ?? invoiceData.actualRate);
        const gstRate = asNumber(invoice.gstRate ?? invoiceData.gstRate, 12);
        const gstBricks = asNumber(invoice.gstBricks ?? invoiceData.gstBricks);
        const nonGstBricks = asNumber(invoice.nonGstBricks ?? invoiceData.nonGstBricks);
        const gstAmount = asNumber(invoice.gstAmount ?? invoiceData.gstAmount);
        const nonGstAmount = asNumber(invoice.nonGstAmount ?? invoiceData.nonGstAmount);

        if (gstBricks > 0) {
          generatedEntries.push({
            id: `${invoice.id}-gst`,
            sourceId: invoice.id,
            date: invoiceDate,
            type: 'gst_invoice',
            reference: invoice.gstInvoiceNumber || `${invoice.id}-GST`,
            description: `GST Invoice - ${gstBricks.toLocaleString('en-IN')} pieces bricks @ ₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each (with ${gstRate}% GST)`,
            debit: gstAmount,
            credit: 0,
          });
        }

        if (nonGstBricks > 0) {
          generatedEntries.push({
            id: `${invoice.id}-non-gst`,
            sourceId: invoice.id,
            date: invoiceDate,
            type: 'non_gst_invoice',
            reference: `${invoice.id}-NonGST`,
            description: `Non-GST Invoice - ${nonGstBricks.toLocaleString('en-IN')} pieces bricks @ ₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each (without GST)`,
            debit: nonGstAmount,
            credit: 0,
          });
        }
      });

      const paymentEntries = paymentsSnapshot.docs.map(toPlainData)
        .map((payment) => ({
          id: `payment-${payment.id}`,
          sourceId: payment.id,
          date: payment.date || '',
          type: 'payment',
          reference: payment.invoiceNumber || payment.id,
          description: `Payment received via ${payment.method || payment.modeOfPayment || 'cash'}${payment.notes ? ` - ${payment.notes}` : ''}`,
          debit: 0,
          credit: Math.abs(asNumber(payment.amount ?? payment.creditAmount)),
        }))
        .filter((entry) => entry.credit > 0);

      const allEntries = [...generatedEntries, ...paymentEntries]
        .filter((entry) => entry.date)
        .sort((left, right) => (
          left.date.localeCompare(right.date)
          || String(left.id).localeCompare(String(right.id))
        ));

      const entries = allEntries.filter((entry) => (
        (!dateFrom || entry.date >= dateFrom)
        && (!dateTo || entry.date <= dateTo)
      ));

      // The legacy ledger starts the selected period at zero and calculates
      // the running Dr/Cr balance only from rows inside that period.
      const openingBalance = 0;
      let balance = openingBalance;
      const rows = entries.map((entry) => {
        balance += entry.debit - entry.credit;
        return { ...entry, balance };
      });

      const totalInvoices = rows.reduce((sum, entry) => sum + asNumber(entry.debit), 0);
      const totalCredits = rows.reduce((sum, entry) => sum + asNumber(entry.credit), 0);

      return resultOk({
        rows,
        openingBalance,
        closingBalance: balance,
        summary: {
          totalInvoices,
          totalCredits,
          totalTransactions: rows.length,
          outstandingBalance: balance,
        },
      });
    } catch (error) {
      return resultError(error);
    }
  },

  getCustomerSalesForStatement: async ({ customerId, dateFrom = '', dateTo = '', location = '' }) => {
    try {
      const constraints = [where('customerId', '==', customerId)];
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      const snapshot = await getDocs(query(collection(db, 'sales'), ...constraints, orderBy('date', 'asc')));
      const rows = snapshot.docs.map(toPlainData).filter((sale) => (
        !location || location === 'all' || normalizeText(sale.location) === normalizeText(location)
      ));
      return resultOk(rows);
    } catch (error) {
      return resultError(error);
    }
  },

  getAllCustomers: async () => customerService.getCustomersPage({ pageSize: 25 }),

  addCustomerLocation: async (customerId, location) => {
    const result = await customerService.getCustomerById(customerId);
    if (!result.success || !result.data) return result;
    const locations = [...(result.data.locations || []), normalizeLocation({ id: `location-${Date.now()}`, ...location }, result.data.locations?.length || 0, result.data.brickRates)];
    return customerService.updateCustomer(customerId, { ...result.data, locations });
  },
};
