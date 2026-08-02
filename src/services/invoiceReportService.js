import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
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
  normalizeText,
  resultError,
  resultOk,
  toPlainData,
} from './queryUtils';

const normalizeInvoice = (snapshot) => toPlainData(snapshot);

const validateInvoiceDates = ({ invoiceDate, dateFrom, dateTo }) => {
  if (!invoiceDate) throw new Error('Invoice date is required.');
  if (!dateFrom) throw new Error('From sales date is required.');
  if (!dateTo) throw new Error('To sales date is required.');
  if (dateFrom > dateTo) throw new Error('From sales date must be before or equal to the to date.');
};

const isAllSites = (selectedSite) => !selectedSite || ['all', 'all sites'].includes(normalizeText(selectedSite));
const siteLabel = (selectedSite) => (isAllSites(selectedSite) ? 'All Sites' : selectedSite);

export const invoiceReportService = {
  getInvoicesPage: async ({
    cursor,
    pageSize = 10,
    searchTerm = '',
    dateFrom = '',
    dateTo = '',
    invoiceType = 'all',
    customerId = '',
  }) => {
    try {
      const normalized = normalizeText(searchTerm).replace(/\s+/g, '');
      const constraints = [];
      if (normalized.length >= 2) constraints.push(where('searchPrefixes', 'array-contains', normalized));
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      // Firestore cannot apply two array-contains filters in the same query.
      // When text search is active, invoice type is filtered from the returned page below.
      if (invoiceType !== 'all' && normalized.length < 2) constraints.push(where('invoiceTypes', 'array-contains', invoiceType));
      if (customerId) constraints.push(where('customerId', '==', customerId));
      const page = await fetchCursorPage({
        collectionName: 'legacyInvoices',
        cursor,
        pageSize,
        constraints,
        sortField: 'date',
        sortDirection: 'desc',
      });
      const data = invoiceType !== 'all' && normalized.length >= 2
        ? page.data.filter((invoice) => (invoice.invoiceTypes || []).includes(invoiceType))
        : page.data;
      return resultOk(data, { ...page, data });
    } catch (error) {
      return resultError(error);
    }
  },

  getInvoiceById: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'legacyInvoices', id));
      return resultOk(snapshot.exists() ? normalizeInvoice(snapshot) : null);
    } catch (error) {
      return resultError(error);
    }
  },

  getEligibleSales: async ({ customerId, dateFrom, dateTo, location = 'all' }) => {
    try {
      if (!customerId) throw new Error('Select a customer.');
      const constraints = [where('customerId', '==', customerId)];
      if (dateFrom) constraints.push(where('date', '>=', dateFrom));
      if (dateTo) constraints.push(where('date', '<=', dateTo));
      const snapshot = await getDocs(query(collection(db, 'sales'), ...constraints, orderBy('date', 'asc')));
      const sales = snapshot.docs.map(toPlainData).filter((sale) => (
        isAllSites(location) || normalizeText(sale.location) === normalizeText(location)
      ));
      const totalBricks = sales.reduce((sum, sale) => sum + asNumber(sale.quantity), 0);
      const totalAmount = sales.reduce((sum, sale) => sum + asNumber(sale.totalAmount), 0);
      const weightedRateTotal = sales.reduce((sum, sale) => sum + (asNumber(sale.quantity) * asNumber(sale.rate)), 0);
      return resultOk({
        sales,
        totalBricks,
        totalAmount,
        averageRate: totalBricks > 0 ? weightedRateTotal / totalBricks : 0,
      });
    } catch (error) {
      return resultError(error);
    }
  },

  generateInvoice: async ({
    customer,
    invoiceDate = dateKey(),
    dateFrom,
    dateTo,
    selectedSite = 'all',
    rate,
    gstBricks = 0,
    nonGstBricks = 0,
    notes = '',
  }) => {
    try {
      if (!customer?.id) throw new Error('Select a customer.');
      validateInvoiceDates({ invoiceDate, dateFrom, dateTo });
      const eligibility = await invoiceReportService.getEligibleSales({
        customerId: customer.id,
        dateFrom,
        dateTo,
        location: selectedSite,
      });
      if (!eligibility.success) return eligibility;
      const invoiceRate = asNumber(rate);
      const gstQuantity = Math.max(0, asNumber(gstBricks));
      const nonGstQuantity = Math.max(0, asNumber(nonGstBricks));
      const totalBricks = gstQuantity + nonGstQuantity;
      if (!invoiceRate) throw new Error('Enter a valid brick rate.');
      if (!totalBricks) throw new Error('Enter GST or non-GST brick quantity.');
      if (totalBricks > eligibility.data.totalBricks) {
        throw new Error(`Invoice quantity cannot exceed ${eligibility.data.totalBricks.toLocaleString('en-IN')} eligible bricks.`);
      }

      const selectedSiteLabel = siteLabel(selectedSite);
      const selectedLocation = selectedSiteLabel === 'All Sites'
        ? null
        : customer.locations?.find((location) => normalizeText(location.name) === normalizeText(selectedSiteLabel));
      const settingsRef = doc(db, 'settings', 'invoice');
      const invoiceRef = doc(collection(db, 'legacyInvoices'));
      let saved = null;
      await runTransaction(db, async (transaction) => {
        const settingsSnapshot = await transaction.get(settingsRef);
        const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
        // The value saved in Settings is the NEXT GST invoice number to use,
        // matching the legacy application. Non-GST invoices never consume it.
        const currentNumber = Math.max(1, Math.trunc(asNumber(settings.gstInvoiceCurrentNumber, 1)));
        const autoIncrement = settings.gstInvoiceAutoIncrement !== false;
        const nextNumber = gstQuantity > 0 && autoIncrement ? currentNumber + 1 : currentNumber;
        const gstInvoiceNumber = gstQuantity > 0
          ? `${String(settings.gstInvoicePrefix || 'C').trim().toUpperCase()}-${currentNumber}`
          : null;
        const configuredLocalGstRate = asNumber(settings.cgstRate, 6) + asNumber(settings.sgstRate, 6);
        const gstRate = configuredLocalGstRate > 0 ? configuredLocalGstRate : asNumber(settings.gstRate, 12);
        const gstTaxableAmount = gstQuantity * invoiceRate;
        const gstTaxAmount = gstTaxableAmount * (gstRate / 100);
        const gstAmount = gstTaxableAmount + gstTaxAmount;
        const nonGstAmount = nonGstQuantity * invoiceRate;
        const totalAmount = gstAmount + nonGstAmount;
        const invoice = {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone || '',
          customerGstin: customer.gstin || '',
          date: invoiceDate,
          fromDate: dateFrom || '',
          toDate: dateTo || '',
          selectedSite: selectedSiteLabel,
          gstInvoiceNumber,
          gstBricks: gstQuantity,
          nonGstBricks: nonGstQuantity,
          totalBricks,
          rate: invoiceRate,
          gstRate,
          gstTaxableAmount,
          gstTaxAmount,
          gstAmount,
          nonGstAmount,
          totalAmount,
          invoiceTypes: [gstQuantity > 0 ? 'GST' : null, nonGstQuantity > 0 ? 'NON_GST' : null].filter(Boolean),
          hasGst: gstQuantity > 0,
          hasNonGst: nonGstQuantity > 0,
          notes: String(notes || '').trim(),
          source: 'firestore',
          status: 'completed',
          saleIds: eligibility.data.sales.map((sale) => sale.id),
          searchPrefixes: makeSearchPrefixes(
            gstInvoiceNumber,
            customer.name,
            customer.phone,
            selectedSiteLabel,
          ),
          originalInvoiceData: {
            invoiceDate,
            dateRange: { from: dateFrom || '', to: dateTo || '' },
            selectedSite: selectedSiteLabel,
            actualRate: invoiceRate,
            gstBricks: gstQuantity,
            nonGstBricks: nonGstQuantity,
            totalBricks,
            gstRate,
            gstTaxableAmount,
            gstTaxAmount,
            gstAmount,
            nonGstAmount,
            totalAmount,
            gstInvoiceNumber,
            customerData: {
              name: customer.name,
              phone: customer.phone || '',
              gstin: customer.gstin || '',
              address: selectedLocation?.address || customer.address || selectedSiteLabel,
            },
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        transaction.set(invoiceRef, invoice);
        if (gstQuantity > 0 && autoIncrement) {
          transaction.set(settingsRef, {
            gstInvoiceCurrentNumber: nextNumber,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        saved = { id: invoiceRef.id, ...invoice };
      });
      return resultOk(saved);
    } catch (error) {
      return resultError(error);
    }
  },


  updateInvoice: async (id, input) => {
    try {
      const reference = doc(db, 'legacyInvoices', id);
      const rate = Math.max(0, asNumber(input.rate));
      const gstBricks = Math.max(0, asNumber(input.gstBricks));
      const nonGstBricks = Math.max(0, asNumber(input.nonGstBricks));
      const invoiceDate = input.date || dateKey();
      const fromDate = input.fromDate || '';
      const toDate = input.toDate || '';
      const selectedSite = siteLabel(input.selectedSite);
      validateInvoiceDates({ invoiceDate, dateFrom: fromDate, dateTo: toDate });
      if (!rate) throw new Error('Enter a valid invoice rate.');
      if (!gstBricks && !nonGstBricks) throw new Error('Enter GST or non-GST brick quantity.');

      const existingResult = await invoiceReportService.getInvoiceById(id);
      if (!existingResult.success) return existingResult;
      const existingInvoice = existingResult.data;
      if (!existingInvoice) throw new Error('Generated invoice not found.');
      const customerSnapshot = await getDoc(doc(db, 'customers', existingInvoice.customerId));
      const currentCustomer = customerSnapshot.exists() ? customerSnapshot.data() : null;
      const selectedLocation = currentCustomer?.locations?.find((location) => normalizeText(location.name) === normalizeText(selectedSite));
      const eligibility = await invoiceReportService.getEligibleSales({
        customerId: existingInvoice.customerId,
        dateFrom: fromDate,
        dateTo: toDate,
        location: selectedSite,
      });
      if (!eligibility.success) return eligibility;
      const totalBricks = gstBricks + nonGstBricks;
      if (totalBricks > eligibility.data.totalBricks) {
        throw new Error(`Invoice quantity cannot exceed ${eligibility.data.totalBricks.toLocaleString('en-IN')} eligible bricks.`);
      }

      const settingsRef = doc(db, 'settings', 'invoice');
      let saved = null;
      await runTransaction(db, async (transaction) => {
        const invoiceSnapshot = await transaction.get(reference);
        if (!invoiceSnapshot.exists()) throw new Error('Generated invoice not found.');
        const previous = invoiceSnapshot.data();

        // Preserve the existing GST number while editing. When a previously
        // non-GST report is converted to GST, allocate the next number from
        // Settings exactly once. Removing GST never rolls the counter back.
        let gstInvoiceNumber = gstBricks > 0 ? previous.gstInvoiceNumber || null : null;
        if (gstBricks > 0 && !gstInvoiceNumber) {
          const settingsSnapshot = await transaction.get(settingsRef);
          const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
          const currentNumber = Math.max(1, Math.trunc(asNumber(settings.gstInvoiceCurrentNumber, 1)));
          const autoIncrement = settings.gstInvoiceAutoIncrement !== false;
          gstInvoiceNumber = `${String(settings.gstInvoicePrefix || 'C').trim().toUpperCase()}-${currentNumber}`;
          if (autoIncrement) {
            transaction.set(settingsRef, {
              gstInvoiceCurrentNumber: currentNumber + 1,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        }

        const gstRate = asNumber(input.gstRate, asNumber(previous.gstRate, 12));
        const gstTaxableAmount = gstBricks * rate;
        const gstTaxAmount = gstTaxableAmount * (gstRate / 100);
        const gstAmount = gstTaxableAmount + gstTaxAmount;
        const nonGstAmount = nonGstBricks * rate;
        const totalAmount = gstAmount + nonGstAmount;
        const previousInvoiceData = previous.originalInvoiceData || {};
        const updates = {
          customerName: currentCustomer?.name || previous.customerName || '',
          customerPhone: currentCustomer?.phone || previous.customerPhone || '',
          customerGstin: currentCustomer?.gstin || previous.customerGstin || '',
          date: invoiceDate,
          fromDate,
          toDate,
          selectedSite,
          gstInvoiceNumber,
          gstBricks,
          nonGstBricks,
          totalBricks,
          rate,
          gstRate,
          gstTaxableAmount,
          gstTaxAmount,
          gstAmount,
          nonGstAmount,
          totalAmount,
          hasGst: gstBricks > 0,
          hasNonGst: nonGstBricks > 0,
          invoiceTypes: [gstBricks > 0 ? 'GST' : null, nonGstBricks > 0 ? 'NON_GST' : null].filter(Boolean),
          notes: String(input.notes || '').trim(),
          saleIds: eligibility.data.sales.map((sale) => sale.id),
          originalInvoiceData: {
            ...previousInvoiceData,
            invoiceDate,
            dateRange: { from: fromDate, to: toDate },
            selectedSite,
            actualRate: rate,
            gstBricks,
            nonGstBricks,
            totalBricks,
            gstRate,
            gstTaxableAmount,
            gstTaxAmount,
            gstAmount,
            nonGstAmount,
            totalAmount,
            gstInvoiceNumber,
            customerData: {
              ...(previousInvoiceData.customerData || {}),
              name: currentCustomer?.name || previous.customerName || '',
              phone: currentCustomer?.phone || previous.customerPhone || '',
              gstin: currentCustomer?.gstin || previous.customerGstin || '',
              address: selectedLocation?.address || previousInvoiceData.customerData?.address || selectedSite,
            },
          },
          searchPrefixes: makeSearchPrefixes(
            gstInvoiceNumber,
            previous.customerName,
            previous.customerPhone,
            selectedSite,
          ),
          updatedAt: serverTimestamp(),
        };
        transaction.update(reference, updates);
        saved = { id, ...previous, ...updates };
      });
      return resultOk(saved);
    } catch (error) {
      return resultError(error);
    }
  },

  deleteInvoice: async (id) => {
    try {
      await deleteDoc(doc(db, 'legacyInvoices', id));
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },


  searchInvoices: async (searchTerm, maxResults = 8) => {
    try {
      const normalized = normalizeText(searchTerm).replace(/\s+/g, '');
      if (normalized.length < 2) return resultOk([]);
      const snapshot = await getDocs(query(
        collection(db, 'legacyInvoices'),
        where('searchPrefixes', 'array-contains', normalized),
        orderBy('date', 'desc'),
        limit(maxResults),
      ));
      return resultOk(snapshot.docs.map(normalizeInvoice));
    } catch (error) {
      return resultError(error);
    }
  },
};
