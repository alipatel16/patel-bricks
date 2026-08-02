import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  asNumber,
  resultError,
  resultOk,
  toPlainData,
} from './queryUtils';

const MAX_REPORT_DAYS = 366;

const differenceInDays = (fromDate, toDate) => {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
};

const validateRange = (fromDate, toDate) => {
  if (!fromDate || !toDate) throw new Error('Select both from and to dates.');
  if (fromDate > toDate) throw new Error('From date must be before or equal to the to date.');
  if (differenceInDays(fromDate, toDate) > MAX_REPORT_DAYS) {
    throw new Error(`GST reports are limited to ${MAX_REPORT_DAYS} days per request.`);
  }
};

const splitLocalTax = (gstAmount, cgstRate = 6, sgstRate = 6) => {
  const totalRate = Math.max(0, asNumber(cgstRate) + asNumber(sgstRate));
  if (!totalRate) return { cgstAmount: gstAmount / 2, sgstAmount: gstAmount / 2 };
  return {
    cgstAmount: gstAmount * (asNumber(cgstRate) / totalRate),
    sgstAmount: gstAmount * (asNumber(sgstRate) / totalRate),
  };
};

const normalizeOutward = (invoice, settings) => {
  const original = invoice.originalInvoiceData || {};
  const customer = original.customerData || {};
  const rate = asNumber(invoice.rate, asNumber(original.actualRate));
  const bricks = asNumber(invoice.gstBricks, asNumber(original.gstBricks));
  const taxableValue = asNumber(
    invoice.gstTaxableAmount,
    asNumber(original.gstTaxableAmount, bricks * rate),
  );
  const grossGstInvoiceValue = asNumber(invoice.gstAmount, asNumber(original.gstAmount));
  const configuredRate = asNumber(invoice.gstRate, asNumber(original.gstRate, settings.gstRate || 12));
  const gstAmount = asNumber(
    invoice.gstTaxAmount,
    asNumber(original.gstTaxAmount, Math.max(0, grossGstInvoiceValue - taxableValue)),
  );
  const interstate = Boolean(invoice.interstate || original.interstate);
  const localSplit = splitLocalTax(gstAmount, settings.cgstRate, settings.sgstRate);

  return {
    id: invoice.id,
    date: invoice.date || original.invoiceDate || '',
    invoiceNumber: invoice.gstInvoiceNumber || original.gstInvoiceNumber || `GST-${String(invoice.id || '').slice(-8)}`,
    customerName: invoice.customerName || customer.name || 'Unknown customer',
    customerGstin: invoice.customerGstin || customer.gstin || 'UNREGISTERED',
    placeOfSupply: customer.stateCode || customer.state_code || settings.companyStateCode || '24',
    selectedSite: invoice.selectedSite || original.selectedSite || 'All Sites',
    bricks,
    rate,
    taxableValue,
    cgstRate: interstate ? 0 : asNumber(settings.cgstRate, 6),
    sgstRate: interstate ? 0 : asNumber(settings.sgstRate, 6),
    igstRate: interstate ? configuredRate : 0,
    cgstAmount: interstate ? 0 : asNumber(invoice.cgstAmount, localSplit.cgstAmount),
    sgstAmount: interstate ? 0 : asNumber(invoice.sgstAmount, localSplit.sgstAmount),
    igstAmount: interstate ? asNumber(invoice.igstAmount, gstAmount) : 0,
    gstAmount,
    totalValue: taxableValue + gstAmount,
    supplyType: 'taxable',
  };
};

const normalizeInward = (purchase, settings) => {
  const taxableValue = asNumber(
    purchase.taxableAmount,
    asNumber(purchase.quantity) * asNumber(purchase.unitCost),
  );
  const gstAmount = asNumber(purchase.gstAmount);
  const totalValue = asNumber(purchase.totalAmount, taxableValue + gstAmount);
  const interstate = Boolean(purchase.interstate || purchase.igstAmount);
  const localSplit = splitLocalTax(gstAmount, settings.cgstRate, settings.sgstRate);

  return {
    id: purchase.id,
    date: purchase.date || '',
    billNumber: purchase.billNumber || purchase.purchaseNumber || '—',
    supplierName: purchase.supplierName || 'Direct purchase',
    supplierGstin: purchase.supplierGstin || 'UNREGISTERED',
    material: purchase.stockType || purchase.description || 'Purchase',
    quantity: asNumber(purchase.quantity),
    unit: purchase.unit || '',
    taxableValue,
    cgstAmount: interstate ? 0 : asNumber(purchase.cgstAmount, localSplit.cgstAmount),
    sgstAmount: interstate ? 0 : asNumber(purchase.sgstAmount, localSplit.sgstAmount),
    igstAmount: interstate ? asNumber(purchase.igstAmount, gstAmount) : 0,
    gstAmount,
    totalValue,
    supplyType: gstAmount > 0 ? 'taxable' : 'non-taxable',
  };
};

const summarize = (outward, inward) => {
  const outwardSummary = outward.reduce((total, item) => ({
    taxable: total.taxable + item.taxableValue,
    cgst: total.cgst + item.cgstAmount,
    sgst: total.sgst + item.sgstAmount,
    igst: total.igst + item.igstAmount,
    gst: total.gst + item.gstAmount,
    total: total.total + item.totalValue,
    bricks: total.bricks + item.bricks,
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0, bricks: 0 });

  const inwardSummary = inward.reduce((total, item) => ({
    taxable: total.taxable + item.taxableValue,
    cgst: total.cgst + item.cgstAmount,
    sgst: total.sgst + item.sgstAmount,
    igst: total.igst + item.igstAmount,
    gst: total.gst + item.gstAmount,
    total: total.total + item.totalValue,
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0 });

  return {
    outward: outwardSummary,
    inward: inwardSummary,
    netGstLiability: outwardSummary.gst - inwardSummary.gst,
  };
};

export const gstReportService = {
  getReport: async ({ fromDate, toDate, settings = {} }) => {
    try {
      validateRange(fromDate, toDate);
      const [invoiceSnapshot, purchaseSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'legacyInvoices'),
          where('date', '>=', fromDate),
          where('date', '<=', toDate),
          orderBy('date', 'asc'),
        )),
        getDocs(query(
          collection(db, 'purchases'),
          where('date', '>=', fromDate),
          where('date', '<=', toDate),
          orderBy('date', 'asc'),
        )),
      ]);

      const taxSettings = {
        cgstRate: asNumber(settings.cgstRate, 6),
        sgstRate: asNumber(settings.sgstRate, 6),
        gstRate: asNumber(settings.gstRate, 12),
        companyStateCode: settings.companyStateCode || '24',
      };
      const outward = invoiceSnapshot.docs
        .map(toPlainData)
        .filter((invoice) => asNumber(invoice.gstBricks) > 0 || invoice.hasGst)
        .map((invoice) => normalizeOutward(invoice, taxSettings));
      const inward = purchaseSnapshot.docs
        .map(toPlainData)
        .map((purchase) => normalizeInward(purchase, taxSettings));

      return resultOk({
        outward,
        inward,
        summary: summarize(outward, inward),
        reads: invoiceSnapshot.size + purchaseSnapshot.size,
      });
    } catch (error) {
      return resultError(error);
    }
  },
};
