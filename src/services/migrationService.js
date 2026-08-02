import { get, ref } from 'firebase/database';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, realtimeDb } from './firebase';
import {
  asNumber,
  dateKey,
  makeSearchPrefixes,
  monthKey,
  normalizePhone,
  normalizeText,
  resultError,
  resultOk,
} from './queryUtils';
import { DEFAULT_SETTINGS } from './settingsService';
import { INVENTORY_DEFAULTS } from './inventoryService';

const MIGRATION_VERSION = 6;
const BATCH_LIMIT = 400;
const MATERIAL_TYPES = ['sand', 'fly_ash', 'dust', 'lime', 'chemical'];

const safeId = (value, fallback = `legacy-${Date.now()}`) => {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/\//g, '_')
    .replace(/[.#$\[\]]/g, '_');
  return cleaned || fallback;
};

const objectEntries = (value) => (value && typeof value === 'object' ? Object.entries(value) : []);
const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const sanitizeFirestoreValue = (value) => {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Timestamp || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeFirestoreValue(item));
  const constructorName = value.constructor?.name;
  if (constructorName && constructorName !== 'Object') return value;
  return Object.entries(value).reduce((result, [key, item]) => {
    if (item !== undefined) result[key] = sanitizeFirestoreValue(item);
    return result;
  }, {});
};

const toTimestamp = (value, fallbackDate) => {
  if (value instanceof Timestamp) return value;
  if (typeof value === 'number') {
    const millis = value < 100000000000 ? value * 1000 : value;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  if (typeof value === 'string' && value) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 1000000000) return toTimestamp(numeric);
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  if (fallbackDate) {
    const date = new Date(`${fallbackDate}T12:00:00`);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return Timestamp.now();
};

const emptyStats = () => ({
  productionQuantity: 0,
  rejectedQuantity: 0,
  cementUsed: 0,
  productionCount: 0,
  salesAmount: 0,
  taxableSales: 0,
  gstCollected: 0,
  salesQuantity: 0,
  salesCount: 0,
  amountReceived: 0,
  outstandingAmount: 0,
  purchaseAmount: 0,
  purchaseCount: 0,
});

const addStats = (target, delta) => {
  Object.entries(delta).forEach(([key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) target[key] = asNumber(target[key]) + value;
  });
};

const pushWrite = (writes, reference, data, options = { merge: true }) => {
  if (!writes.__index) Object.defineProperty(writes, '__index', { value: new Map(), enumerable: false });
  const existingIndex = writes.__index.get(reference.path);
  if (existingIndex !== undefined) {
    writes[existingIndex] = {
      reference,
      data: sanitizeFirestoreValue({ ...writes[existingIndex].data, ...data }),
      options: { merge: true },
    };
    return;
  }
  writes.__index.set(reference.path, writes.length);
  writes.push({ reference, data: sanitizeFirestoreValue(data), options });
};

const pushDelete = (writes, reference) => {
  if (!writes.__index) Object.defineProperty(writes, '__index', { value: new Map(), enumerable: false });
  const existingIndex = writes.__index.get(reference.path);
  const operation = { reference, action: 'delete' };
  if (existingIndex !== undefined) {
    writes[existingIndex] = operation;
    return;
  }
  writes.__index.set(reference.path, writes.length);
  writes.push(operation);
};

const flushWrites = async (writes, onProgress) => {
  let completed = 0;
  for (let offset = 0; offset < writes.length; offset += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const slice = writes.slice(offset, offset + BATCH_LIMIT);
    slice.forEach(({ reference, data, options, action }) => {
      if (action === 'delete') batch.delete(reference);
      else batch.set(reference, data, options);
    });
    await batch.commit();
    completed += slice.length;
    onProgress?.({ completed, total: writes.length });
  }
};

const prepareCustomer = (legacyId, input = {}) => {
  const name = String(firstValue(input.name, input.customer_name, 'Unnamed customer')).trim();
  const phone = String(firstValue(input.phone, input.customer_phone, legacyId, '')).trim();
  const businessName = String(firstValue(input.business_name, input.businessName, '')).trim();
  const totalAmount = asNumber(firstValue(input.total_amount, input.totalAmount));
  const totalPaid = asNumber(firstValue(input.total_paid, input.totalPaid));
  const incomingRates = input.brick_rates || input.brickRates || {};
  let locations = (Array.isArray(input.locations) ? input.locations : objectEntries(input.locations).map(([, item]) => item))
    .map((location = {}, index) => {
      const id = String(firstValue(location.id, `legacy-location-${safeId(legacyId)}-${index}`));
      const rate = firstValue(location.brick_rate, location.brickRate, incomingRates[id], '');
      return {
        id,
        name: String(firstValue(location.name, `Site ${index + 1}`)).trim(),
        address: String(firstValue(location.address, '')).trim(),
        contactPerson: String(firstValue(location.contact_person, location.contactPerson, '')).trim(),
        contactPhone: String(firstValue(location.contact_phone, location.contactPhone, '')).trim(),
        pincode: String(firstValue(location.pincode, '')).trim(),
        state: String(firstValue(location.state, 'GJ')).trim(),
        stateCode: String(firstValue(location.state_code, location.stateCode, '24')).trim(),
        isPrimary: Boolean(firstValue(location.is_primary, location.isPrimary, index === 0)),
        brickRate: rate === '' ? '' : asNumber(rate),
        createdAt: firstValue(location.createdAt, location.created_date, null),
        updatedAt: firstValue(location.updatedAt, location.updated_date, null),
      };
    });
  if (locations.length && !locations.some((location) => location.isPrimary)) {
    locations = locations.map((location, index) => ({ ...location, isPrimary: index === 0 }));
  }
  let primarySeen = false;
  locations = locations.map((location) => {
    if (!location.isPrimary) return location;
    if (primarySeen) return { ...location, isPrimary: false };
    primarySeen = true;
    return location;
  });
  const brickRates = locations.reduce((result, location) => {
    const value = firstValue(incomingRates[location.id], location.brickRate, '');
    if (value !== '') result[location.id] = asNumber(value);
    return result;
  }, {});
  const primaryLocation = locations.find((location) => location.isPrimary) || locations[0];
  const address = String(firstValue(input.address, primaryLocation?.address, '')).trim();
  return {
    legacyId: String(legacyId),
    name,
    nameLower: normalizeText(name),
    phone,
    phoneNormalized: normalizePhone(phone),
    email: String(input.email || '').trim(),
    businessName,
    businessNameLower: normalizeText(businessName),
    gstin: String(input.gstin || '').trim().toUpperCase(),
    address,
    locations,
    brickRates,
    notes: String(input.notes || '').trim(),
    status: input.status || 'active',
    totalPurchases: asNumber(firstValue(input.total_purchases, input.totalPurchases)),
    totalAmount,
    totalPaid,
    balanceDue: Math.max(0, asNumber(firstValue(input.balance_due, input.balanceDue, totalAmount - totalPaid))),
    lastPurchaseDate: firstValue(input.last_purchase, input.lastPurchaseDate, null),
    searchPrefixes: makeSearchPrefixes(
      name,
      phone,
      businessName,
      input.gstin,
      ...locations.flatMap((location) => [location.name, location.address]),
    ),
    createdAt: toTimestamp(firstValue(input.created_timestamp, input.createdAt), input.created_date),
    updatedAt: toTimestamp(firstValue(input.updated_timestamp, input.updatedAt), input.updated_date),
  };
};

const prepareSupplier = (legacyId, input = {}) => {
  const name = String(firstValue(input.name, 'Unnamed supplier')).trim();
  const phone = String(firstValue(input.phone, input.contact?.phone, '')).trim();
  const gstin = String(input.gstin || '').trim().toUpperCase();
  return {
    legacyId: String(legacyId),
    name,
    nameLower: normalizeText(name),
    gstin,
    type: firstValue(input.type, 'Raw Material'),
    phone,
    phoneNormalized: normalizePhone(phone),
    email: String(firstValue(input.email, input.contact?.email, '')).trim(),
    address: String(firstValue(input.address?.line1, input.address, '')).trim(),
    notes: String(input.notes || '').trim(),
    status: input.status || 'active',
    totalPurchases: asNumber(firstValue(input.total_purchases, input.totalPurchases)),
    totalAmount: asNumber(firstValue(input.total_amount, input.totalAmount)),
    lastPurchaseDate: firstValue(input.last_purchase, input.lastPurchaseDate, null),
    searchPrefixes: makeSearchPrefixes(name, gstin, phone, input.type),
    createdAt: toTimestamp(firstValue(input.created_timestamp, input.createdAt), input.created_date),
    updatedAt: toTimestamp(firstValue(input.updated_timestamp, input.updatedAt), input.updated_date),
  };
};

const createMigrationPlan = (root = {}) => {
  const writes = [];
  const dailyStats = {};
  const monthlyStats = {};
  const metrics = emptyStats();
  const counts = {
    customers: 0,
    suppliers: 0,
    production: 0,
    sales: 0,
    payments: 0,
    generatedInvoices: 0,
    purchases: 0,
    inventoryTransactions: 0,
    settings: 0,
    counters: 0,
  };

  const addToStats = (date, delta) => {
    const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : dateKey();
    dailyStats[safeDate] ||= emptyStats();
    monthlyStats[monthKey(safeDate)] ||= emptyStats();
    addStats(dailyStats[safeDate], delta);
    addStats(monthlyStats[monthKey(safeDate)], delta);
    addStats(metrics, delta);
  };

  const customerIdByPhone = new Map();
  const customerAggregates = new Map();
  const supplierIdByName = new Map();
  const supplierAggregates = new Map();
  objectEntries(root.customers).forEach(([legacyId, item]) => {
    const id = safeId(legacyId);
    const customer = prepareCustomer(legacyId, item);
    customerIdByPhone.set(normalizePhone(customer.phone), id);
    pushWrite(writes, doc(db, 'customers', id), customer);
    counts.customers += 1;
  });

  objectEntries(root.suppliers).forEach(([legacyId, item]) => {
    const id = safeId(legacyId);
    const supplier = prepareSupplier(legacyId, item);
    supplierIdByName.set(normalizeText(supplier.name), id);
    pushWrite(writes, doc(db, 'suppliers', id), supplier);
    counts.suppliers += 1;
  });

  objectEntries(root.bricks?.production?.daily).forEach(([legacyId, item = {}]) => {
    const date = firstValue(item.date, legacyId, dateKey());
    const quantity = asNumber(item.quantity);
    const cementUsed = asNumber(firstValue(item.cement_used, item.cementUsed));
    const rejectedQuantity = asNumber(firstValue(item.rejected_quantity, item.rejectedQuantity));
    const productionDocumentId = `legacy-${safeId(legacyId)}`;
    const productionInventoryTransactionId = `legacy-production-${safeId(legacyId)}`;
    pushWrite(writes, doc(db, 'production', productionDocumentId), {
      legacyId,
      date,
      quantity,
      cementUsed,
      shift: firstValue(item.shift, 'day'),
      grade: firstValue(item.grade, item.quality, 'A'),
      rejectedQuantity,
      efficiency: asNumber(item.efficiency),
      notes: String(item.notes || ''),
      inventoryTransactionId: productionInventoryTransactionId,
      createdAt: toTimestamp(item.timestamp, date),
      updatedAt: toTimestamp(item.timestamp, date),
    });
    pushWrite(writes, doc(db, 'inventoryTransactions', productionInventoryTransactionId), {
      legacyId: `production-${legacyId}`,
      stockType: 'bricks',
      transactionType: 'production',
      operation: 'add',
      quantity,
      delta: quantity,
      amount: 0,
      referenceId: productionDocumentId,
      notes: `Production: ${quantity} bricks on ${date}`,
      date,
      createdAt: toTimestamp(item.timestamp, date),
    });
    counts.inventoryTransactions += 1;
    addToStats(date, { productionQuantity: quantity, cementUsed, rejectedQuantity, productionCount: 1 });
    counts.production += 1;
  });

  objectEntries(root.bricks?.sales?.transactions).forEach(([legacyId, item = {}]) => {
    const date = firstValue(item.date, dateKey());
    const invoiceNumber = String(firstValue(item.invoice_number, legacyId));
    const customerPhone = String(firstValue(item.customer_phone, ''));
    const customerName = String(firstValue(item.customer_name, 'Walk-in customer'));
    const customerId = customerIdByPhone.get(normalizePhone(customerPhone)) || safeId(customerPhone || `walkin-${legacyId}`);
    const quantity = asNumber(item.quantity);
    const rate = asNumber(firstValue(item.price_per_brick, item.rate));
    const grossAmount = asNumber(firstValue(item.subtotal, quantity * rate));
    const discountAmount = asNumber(firstValue(item.discount_amount, 0));
    const taxableAmount = asNumber(firstValue(item.taxable_amount, grossAmount - discountAmount));
    const gstAmount = asNumber(firstValue(item.total_tax, item.gst_amount, 0));
    const totalAmount = asNumber(firstValue(item.total_amount, taxableAmount + gstAmount));
    const isGst = Boolean(firstValue(item.include_gst, item.gst_included, gstAmount > 0));
    const paymentMethod = firstValue(item.payment_method, 'cash');
    // Legacy payment_method described the intended mode, not whether the invoice was paid.
    // Actual receipts live in the legacy payments collections and are migrated separately.
    const paidAmount = 0;
    const balanceDue = totalAmount;

    if (!customerIdByPhone.has(normalizePhone(customerPhone)) && customerPhone) {
      const customer = prepareCustomer(customerPhone, {
        name: customerName,
        phone: customerPhone,
        email: item.customer_email,
        gstin: item.customer_gstin,
        address: item.customer_address,
        locations: item.location_name ? [{ id: item.location_id || `loc-${legacyId}`, name: item.location_name, address: item.customer_address }] : [],
        total_purchases: 1,
        total_amount: totalAmount,
        total_paid: paidAmount,
        balance_due: balanceDue,
        last_purchase: date,
      });
      pushWrite(writes, doc(db, 'customers', customerId), customer);
      customerIdByPhone.set(normalizePhone(customerPhone), customerId);
      counts.customers += 1;
    }

    const customerAggregate = customerAggregates.get(customerId) || { totalPurchases: 0, totalAmount: 0, totalPaid: 0, balanceDue: 0, lastPurchaseDate: null };
    customerAggregate.totalPurchases += 1;
    customerAggregate.totalAmount += totalAmount;
    customerAggregate.totalPaid += paidAmount;
    customerAggregate.balanceDue += balanceDue;
    if (!customerAggregate.lastPurchaseDate || date > customerAggregate.lastPurchaseDate) customerAggregate.lastPurchaseDate = date;
    customerAggregates.set(customerId, customerAggregate);

    const saleDocumentId = `legacy-${safeId(legacyId)}`;
    const salePaymentId = null;
    const saleInventoryTransactionId = `legacy-sale-${safeId(legacyId)}`;
    // Remove the incorrect v4 synthetic payment if migration is being re-run.
    pushDelete(writes, doc(db, 'payments', `legacy-sale-${safeId(legacyId)}`));
    pushWrite(writes, doc(db, 'sales', saleDocumentId), {
      legacyId,
      invoiceNumber,
      invoiceNumberLower: normalizeText(invoiceNumber),
      date,
      customerId,
      customerName,
      customerNameLower: normalizeText(customerName),
      customerPhone,
      customerGstin: String(firstValue(item.customer_gstin, '')),
      customerAddress: String(firstValue(item.customer_address, '')),
      customerState: String(firstValue(item.customer_state, 'GJ')),
      customerStateCode: String(firstValue(item.customer_state_code, '24')),
      location: String(firstValue(item.location_name, '')),
      locationId: firstValue(item.location_id, null),
      vehicleNumber: String(firstValue(item.vehicle_number, '')).toUpperCase(),
      challanNumber: String(firstValue(item.challan_number, '')),
      productName: firstValue(item.product_description, 'Fly Ash Bricks'),
      hsnCode: firstValue(item.hsn_code, '6815'),
      quantity,
      rate,
      grossAmount,
      discountAmount,
      taxableAmount,
      gstRate: isGst ? 12 : 0,
      cgstRate: asNumber(item.cgst_rate),
      sgstRate: asNumber(item.sgst_rate),
      igstRate: asNumber(item.igst_rate),
      cgstAmount: asNumber(item.cgst_amount),
      sgstAmount: asNumber(item.sgst_amount),
      igstAmount: asNumber(item.igst_amount),
      gstAmount,
      totalAmount,
      isGst,
      interstate: Boolean(item.is_inter_state),
      paidAmount,
      balanceDue,
      paymentMethod,
      paymentStatus: balanceDue <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'due',
      paymentId: salePaymentId,
      inventoryTransactionId: saleInventoryTransactionId,
      notes: String(item.notes || ''),
      searchPrefixes: makeSearchPrefixes(invoiceNumber, customerName, customerPhone, item.vehicle_number, item.location_name),
      createdAt: toTimestamp(item.timestamp, date),
      updatedAt: toTimestamp(firstValue(item.last_edited, item.timestamp), date),
    });
    pushWrite(writes, doc(db, 'inventoryTransactions', saleInventoryTransactionId), {
      legacyId: `sale-${legacyId}`,
      stockType: 'bricks',
      transactionType: 'sale',
      operation: 'subtract',
      quantity,
      delta: -quantity,
      amount: totalAmount,
      referenceId: saleDocumentId,
      notes: `Imported invoice ${invoiceNumber}`,
      date,
      createdAt: toTimestamp(item.timestamp, date),
    });
    counts.inventoryTransactions += 1;

    addToStats(date, {
      salesAmount: totalAmount,
      taxableSales: taxableAmount,
      gstCollected: gstAmount,
      salesQuantity: quantity,
      salesCount: 1,
      amountReceived: 0,
      outstandingAmount: balanceDue,
    });
    counts.sales += 1;
  });

  objectEntries(root.bricks?.sales?.invoices).forEach(([legacyId, item = {}]) => {
    const invoiceData = item.invoiceData || {};
    const customerPhone = String(firstValue(item.customerPhone, invoiceData.customerData?.phone, ''));
    const customerName = String(firstValue(item.customerName, invoiceData.customerData?.name, 'Legacy customer'));
    const customerId = customerIdByPhone.get(normalizePhone(customerPhone)) || safeId(customerPhone || `invoice-customer-${legacyId}`);
    const date = firstValue(item.invoiceDate, invoiceData.invoiceDate, item.createdDate, dateKey());

    if (!customerIdByPhone.has(normalizePhone(customerPhone)) && customerPhone) {
      const customer = prepareCustomer(customerPhone, {
        name: customerName,
        phone: customerPhone,
        gstin: firstValue(item.customerGSTIN, invoiceData.customerGSTIN),
        address: firstValue(invoiceData.customerData?.address, item.selectedSite),
      });
      pushWrite(writes, doc(db, 'customers', customerId), customer);
      customerIdByPhone.set(normalizePhone(customerPhone), customerId);
      counts.customers += 1;
    }

    pushWrite(writes, doc(db, 'legacyInvoices', `legacy-${safeId(legacyId)}`), {
      legacyId,
      customerId,
      customerName,
      customerPhone,
      customerGstin: String(firstValue(item.customerGSTIN, invoiceData.customerGSTIN, '')),
      date,
      fromDate: firstValue(item.fromDate, invoiceData.dateRange?.from, ''),
      toDate: firstValue(item.toDate, invoiceData.dateRange?.to, ''),
      selectedSite: String(firstValue(item.selectedSite, invoiceData.selectedSite, '')),
      gstInvoiceNumber: firstValue(item.gstInvoiceNumber, invoiceData.gstInvoiceNumber) ?? null,
      gstBricks: asNumber(firstValue(item.gstBricks, invoiceData.gstBricks)),
      nonGstBricks: asNumber(firstValue(item.nonGstBricks, invoiceData.nonGstBricks)),
      hasGst: asNumber(firstValue(item.gstBricks, invoiceData.gstBricks)) > 0,
      hasNonGst: asNumber(firstValue(item.nonGstBricks, invoiceData.nonGstBricks)) > 0,
      invoiceTypes: [
        asNumber(firstValue(item.gstBricks, invoiceData.gstBricks)) > 0 ? 'GST' : null,
        asNumber(firstValue(item.nonGstBricks, invoiceData.nonGstBricks)) > 0 ? 'NON_GST' : null,
      ].filter(Boolean),
      totalBricks: asNumber(firstValue(invoiceData.totalBricks, asNumber(item.gstBricks) + asNumber(item.nonGstBricks))),
      rate: asNumber(firstValue(invoiceData.actualRate, item.rate)),
      gstAmount: asNumber(firstValue(invoiceData.gstAmount, item.gstAmount)),
      nonGstAmount: asNumber(firstValue(invoiceData.nonGstAmount, item.nonGstAmount)),
      totalAmount: asNumber(firstValue(invoiceData.totalAmount, item.totalAmount)),
      status: firstValue(item.status, 'completed'),
      source: 'legacy',
      searchPrefixes: makeSearchPrefixes(
        firstValue(item.gstInvoiceNumber, invoiceData.gstInvoiceNumber, ''),
        customerName,
        customerPhone,
        firstValue(item.selectedSite, invoiceData.selectedSite, ''),
      ),
      originalInvoiceData: invoiceData,
      createdAt: toTimestamp(item.timestamp, date),
      updatedAt: toTimestamp(firstValue(item.updatedTimestamp, item.timestamp), date),
    });
    counts.generatedInvoices += 1;
  });

  const legacyPayments = new Map(objectEntries(root.bricks?.sales?.payments));
  objectEntries(root.customers).forEach(([legacyCustomerId, customer = {}]) => {
    objectEntries(customer.payments).forEach(([paymentId, payment = {}]) => {
      if (!legacyPayments.has(paymentId)) {
        legacyPayments.set(paymentId, {
          ...payment,
          customerPhone: firstValue(payment.customerPhone, customer.phone, legacyCustomerId),
          customerName: firstValue(payment.customerName, customer.name),
          creditAmount: firstValue(payment.creditAmount, payment.amount),
          modeOfPayment: firstValue(payment.modeOfPayment, payment.method),
        });
      }
    });
  });

  legacyPayments.forEach((item = {}, legacyId) => {
    const customerPhone = String(firstValue(item.customerPhone, item.customer_phone, ''));
    const customerName = String(firstValue(item.customerName, item.customer_name, 'Legacy customer'));
    const customerId = customerIdByPhone.get(normalizePhone(customerPhone)) || safeId(customerPhone || `payment-customer-${legacyId}`);
    const date = firstValue(item.date, item.createdDate, dateKey());
    const amount = Math.abs(asNumber(firstValue(item.creditAmount, item.amount)));
    if (!amount) return;

    if (!customerIdByPhone.has(normalizePhone(customerPhone)) && customerPhone) {
      const customer = prepareCustomer(customerPhone, {
        name: customerName,
        phone: customerPhone,
      });
      pushWrite(writes, doc(db, 'customers', customerId), customer);
      customerIdByPhone.set(normalizePhone(customerPhone), customerId);
      counts.customers += 1;
    }

    const aggregate = customerAggregates.get(customerId) || {
      totalPurchases: 0,
      totalAmount: 0,
      totalPaid: 0,
      balanceDue: 0,
      lastPurchaseDate: null,
    };
    aggregate.totalPaid += amount;
    aggregate.balanceDue -= amount;
    customerAggregates.set(customerId, aggregate);

    pushWrite(writes, doc(db, 'payments', `legacy-${safeId(legacyId)}`), {
      legacyId,
      customerId,
      customerName,
      customerPhone,
      saleId: null,
      invoiceNumber: '',
      date,
      amount,
      method: firstValue(item.modeOfPayment, item.method, 'cash'),
      notes: String(item.notes || ''),
      legacyUnallocated: true,
      createdAt: toTimestamp(item.timestamp, date),
    });
    addToStats(date, { amountReceived: amount });
    addStats(metrics, { outstandingAmount: -amount });
    counts.payments += 1;
  });

  customerAggregates.forEach((aggregate, customerId) => {
    pushWrite(writes, doc(db, 'customers', customerId), {
      ...aggregate,
      balanceDue: Math.max(0, aggregate.balanceDue),
      updatedAt: serverTimestamp(),
    });
  });
  metrics.outstandingAmount = Math.max(0, metrics.outstandingAmount);

  const addPurchase = (legacyId, item = {}, defaults = {}) => {
    const date = firstValue(item.date, defaults.date, dateKey());
    const stockType = firstValue(defaults.stockType, item.stockType, item.material_type, 'other');
    const quantity = asNumber(firstValue(item.quantity, item.bags, 1));
    const unitCost = asNumber(firstValue(item.unitCost, item.cost_per_bag, item.purchase_rate, quantity ? asNumber(item.amount) / quantity : 0));
    const taxableAmount = asNumber(firstValue(item.amount, item.total_cost, quantity * unitCost));
    const gstAmount = asNumber(firstValue(item.total_gst, item.gst_amount, 0));
    const totalAmount = asNumber(firstValue(item.total_amount, item.total_cost, taxableAmount + gstAmount));
    const supplierName = String(firstValue(item.supplier_name, item.supplier, defaults.supplierName, ''));
    const supplierId = firstValue(item.supplier_id, defaults.supplierId, supplierIdByName.get(normalizeText(supplierName)), null);
    if (supplierId) {
      const aggregate = supplierAggregates.get(String(supplierId)) || { totalPurchases: 0, totalAmount: 0, lastPurchaseDate: null };
      aggregate.totalPurchases += 1;
      aggregate.totalAmount += totalAmount;
      if (!aggregate.lastPurchaseDate || date > aggregate.lastPurchaseDate) aggregate.lastPurchaseDate = date;
      supplierAggregates.set(String(supplierId), aggregate);
    }
    pushWrite(writes, doc(db, 'purchases', `legacy-${safeId(defaults.prefix ? `${defaults.prefix}-${legacyId}` : legacyId)}`), {
      legacyId,
      purchaseNumber: String(firstValue(item.id, item.purchase_number, item.bill_number, `LEGACY-${safeId(legacyId)}`)),
      stockType,
      quantity,
      unit: firstValue(item.unit, stockType === 'cement' ? 'bags' : 'units'),
      unitCost,
      taxableAmount,
      gstRate: asNumber(firstValue(item.gstRate, item.cgst, 0)) + asNumber(item.sgst) + asNumber(item.igst),
      gstAmount,
      totalAmount,
      supplierId: supplierId ? String(supplierId) : null,
      supplierName,
      supplierGstin: String(firstValue(item.supplier_gstin, '')),
      billNumber: String(firstValue(item.bill_number, item.billNumber, '')),
      description: String(firstValue(item.description, defaults.description, '')),
      notes: String(item.notes || ''),
      date,
      createdAt: toTimestamp(firstValue(item.created_timestamp, item.timestamp), date),
      updatedAt: toTimestamp(firstValue(item.updated_timestamp, item.timestamp), date),
    });
    addToStats(date, { purchaseAmount: totalAmount, purchaseCount: 1 });
    counts.purchases += 1;
  };

  objectEntries(root.purchases).forEach(([id, item]) => addPurchase(id, item, { prefix: 'supplier' }));
  objectEntries(root.cement?.purchases).forEach(([id, item]) => addPurchase(id, item, { prefix: 'cement', stockType: 'cement', description: 'Cement purchase' }));
  objectEntries(root.materials?.purchases).forEach(([id, item]) => addPurchase(id, item, { prefix: 'material', stockType: item?.material_type || 'other', description: 'Raw material purchase' }));

  supplierAggregates.forEach((aggregate, supplierId) => {
    pushWrite(writes, doc(db, 'suppliers', supplierId), { ...aggregate, updatedAt: serverTimestamp() });
  });

  const addInventoryTransaction = (id, item = {}, defaults = {}) => {
    const quantity = Math.abs(asNumber(firstValue(item.quantity, item.bags, 0)));
    if (!quantity) return;
    const operation = firstValue(item.operation, asNumber(item.quantity) < 0 ? 'subtract' : 'add');
    const delta = operation === 'subtract' ? -quantity : quantity;
    const date = firstValue(item.date, defaults.date, dateKey(toTimestamp(item.timestamp).toDate()));
    const documentId = defaults.documentId || `legacy-${safeId(`${defaults.prefix || 'inventory'}-${id}`)}`;
    pushWrite(writes, doc(db, 'inventoryTransactions', documentId), {
      legacyId: id,
      stockType: firstValue(defaults.stockType, item.stockType, item.material_type, 'bricks'),
      transactionType: firstValue(item.type, item.transactionType, defaults.transactionType, 'legacy'),
      operation,
      quantity,
      delta,
      amount: asNumber(firstValue(item.total_cost, item.amount, 0)),
      referenceId: String(firstValue(item.reference, item.referenceId, '')),
      notes: String(firstValue(item.notes, 'Imported from Realtime Database')),
      date,
      createdAt: toTimestamp(item.timestamp, date),
    });
    counts.inventoryTransactions += 1;
  };

  // v4 imported both history and transactions, even though the RTDB paths contain
  // overlapping copies of the same entries. Remove those old duplicate documents first.
  const brickHistoryEntries = objectEntries(root.bricks?.inventory?.history);
  const brickTransactionEntries = objectEntries(root.bricks?.inventory?.transactions);
  const historyIds = new Set(brickHistoryEntries.map(([id]) => id));

  brickHistoryEntries.forEach(([id, item = {}]) => {
    pushDelete(writes, doc(db, 'inventoryTransactions', `legacy-${safeId(`brick-history-${id}`)}`));
    const type = String(item.type || '').toLowerCase();
    const notes = String(item.notes || '').trim().toLowerCase();

    // Canonical sale and production movements are created from their source records above.
    if (type === 'sale') return;
    if (type === 'adjustment' && notes.startsWith('production:')) return;

    addInventoryTransaction(id, item, {
      documentId: `legacy-adjustment-${safeId(id)}`,
      stockType: 'bricks',
      transactionType: type || 'adjustment',
    });
  });

  brickTransactionEntries.forEach(([id, item = {}]) => {
    pushDelete(writes, doc(db, 'inventoryTransactions', `legacy-${safeId(`brick-transaction-${id}`)}`));
    if (historyIds.has(id)) return;
    addInventoryTransaction(id, item, {
      documentId: `legacy-adjustment-${safeId(id)}`,
      stockType: 'bricks',
      transactionType: firstValue(item.type, 'adjustment'),
    });
  });

  objectEntries(root.cement?.inventory?.transactions).forEach(([id, item]) => {
    addInventoryTransaction(id, item, { prefix: 'cement-transaction', stockType: 'cement' });
  });
  MATERIAL_TYPES.forEach((type) => {
    objectEntries(root.materials?.[type]?.transactions).forEach(([id, item]) => {
      addInventoryTransaction(id, item, { prefix: `${type}-transaction`, stockType: type });
    });
  });

  const totalLegacyProduction = objectEntries(root.bricks?.production?.daily)
    .reduce((sum, [, item = {}]) => sum + asNumber(item.quantity), 0);
  const totalLegacySales = objectEntries(root.bricks?.sales?.transactions)
    .reduce((sum, [, item = {}]) => sum + asNumber(item.quantity), 0);
  const storedLegacyBricks = asNumber(firstValue(
    root.bricks?.inventory?.total_stock,
    root.bricks?.total_stock,
    0,
  ));
  const calculatedLegacyBricks = totalLegacyProduction - totalLegacySales;
  const useCalculatedStock = totalLegacyProduction > 0 || totalLegacySales > 0;
  const correctLegacyBricks = useCalculatedStock ? calculatedLegacyBricks : storedLegacyBricks;

  const inventory = {
    ...INVENTORY_DEFAULTS,
    bricks: correctLegacyBricks,
    cementBags: asNumber(firstValue(root.cement?.inventory?.total_bags, 0)),
    cementCostPerBag: asNumber(firstValue(root.cement?.inventory?.cost_per_bag, 0)),
    materials: MATERIAL_TYPES.reduce((result, type) => {
      result[type] = asNumber(root.materials?.[type]?.inventory?.total_quantity);
      return result;
    }, {}),
    materialUnits: MATERIAL_TYPES.reduce((result, type) => {
      result[type] = firstValue(root.materials?.[type]?.inventory?.unit, type === 'chemical' ? 'litres' : 'tons');
      return result;
    }, {}),
    stockCalculation: useCalculatedStock ? 'production-minus-sales' : 'stored-total',
    totalLegacyProduction,
    totalLegacySales,
    storedLegacyBricks,
    migrationStockVariance: correctLegacyBricks - storedLegacyBricks,
    updatedAt: serverTimestamp(),
  };
  pushWrite(writes, doc(db, 'system', 'inventory'), inventory);

  const legacySettings = root.settings || {};
  const legacyCompany = root.company || legacySettings.company_info || legacySettings.company || {};
  const legacyInvoiceConfig = legacySettings.invoice_config || {};
  const legacyBank = legacySettings.bank_details || legacySettings.bank || legacyInvoiceConfig.bankDetails || {};
  const company = {
    ...DEFAULT_SETTINGS.company,
    name: firstValue(legacyCompany.name, DEFAULT_SETTINGS.company.name),
    address: firstValue(legacyCompany.address, DEFAULT_SETTINGS.company.address),
    phone: Array.isArray(legacyCompany.phone) ? legacyCompany.phone.join(', ') : firstValue(legacyCompany.phone, DEFAULT_SETTINGS.company.phone),
    email: firstValue(legacyCompany.email, DEFAULT_SETTINGS.company.email),
    gstin: firstValue(legacyCompany.gstin, DEFAULT_SETTINGS.company.gstin),
    state: firstValue(legacyCompany.state, DEFAULT_SETTINGS.company.state),
    stateCode: firstValue(legacyCompany.stateCode, legacyCompany.state_code, DEFAULT_SETTINGS.company.stateCode),
    transportationMode: firstValue(legacyCompany.transportationMode, legacyInvoiceConfig.defaultTransportMode, DEFAULT_SETTINGS.company.transportationMode),
    updatedAt: serverTimestamp(),
  };

  const legacyGstRates = legacyInvoiceConfig.gstRates || {};
  const invoice = {
    ...DEFAULT_SETTINGS.invoice,
    prefix: firstValue(
      legacySettings.invoice_prefix,
      legacyInvoiceConfig.salesPrefix,
      DEFAULT_SETTINGS.invoice.prefix,
    ),
    gstInvoicePrefix: firstValue(
      legacyInvoiceConfig.gstInvoiceNumbering?.prefix,
      DEFAULT_SETTINGS.invoice.gstInvoicePrefix,
    ),
    gstInvoiceCurrentNumber: asNumber(firstValue(
      legacyInvoiceConfig.gstInvoiceNumbering?.currentNumber,
      DEFAULT_SETTINGS.invoice.gstInvoiceCurrentNumber,
    )),
    gstInvoiceAutoIncrement: Boolean(firstValue(
      legacyInvoiceConfig.gstInvoiceNumbering?.autoIncrement,
      DEFAULT_SETTINGS.invoice.gstInvoiceAutoIncrement,
    )),
    productName: firstValue(
      legacyCompany.productDescription,
      legacyInvoiceConfig.productDescription,
      DEFAULT_SETTINGS.invoice.productName,
    ),
    defaultRate: asNumber(firstValue(
      legacySettings.default_brick_price,
      legacySettings.brick_price,
      DEFAULT_SETTINGS.invoice.defaultRate,
    )),
    hsnCode: firstValue(
      legacyCompany.hsnCode,
      legacyInvoiceConfig.hsnCodeStatic,
      legacySettings.hsn_code,
      DEFAULT_SETTINGS.invoice.hsnCode,
    ),
    gstRate: asNumber(firstValue(
      legacyGstRates.IGST,
      asNumber(legacyGstRates.CGST) + asNumber(legacyGstRates.SGST),
      DEFAULT_SETTINGS.invoice.gstRate,
    )),
    cgstRate: asNumber(firstValue(legacyGstRates.CGST, DEFAULT_SETTINGS.invoice.cgstRate)),
    sgstRate: asNumber(firstValue(legacyGstRates.SGST, DEFAULT_SETTINGS.invoice.sgstRate)),
    igstRate: asNumber(firstValue(
      legacyGstRates.IGST,
      asNumber(legacyGstRates.CGST) + asNumber(legacyGstRates.SGST),
      DEFAULT_SETTINGS.invoice.igstRate,
    )),
    defaultTransportMode: firstValue(
      legacyInvoiceConfig.defaultTransportMode,
      legacyCompany.transportationMode,
      DEFAULT_SETTINGS.invoice.defaultTransportMode,
    ),
    reverseCharge: Boolean(firstValue(
      legacyInvoiceConfig.reverseCharge,
      DEFAULT_SETTINGS.invoice.reverseCharge,
    )),
    terms: Array.isArray(legacyInvoiceConfig.terms) && legacyInvoiceConfig.terms.length
      ? legacyInvoiceConfig.terms
      : DEFAULT_SETTINGS.invoice.terms,
    vehicles: Array.isArray(legacyInvoiceConfig.vehicles)
      ? legacyInvoiceConfig.vehicles.map((vehicle, index) => ({
        id: firstValue(vehicle.id, `vehicle-${index + 1}`),
        number: String(firstValue(vehicle.number, '')).trim().toUpperCase(),
        driver: String(firstValue(vehicle.driver, '')).trim(),
        capacity: String(firstValue(vehicle.capacity, '')).trim(),
        notes: String(firstValue(vehicle.notes, '')).trim(),
        createdAt: firstValue(vehicle.createdAt, null),
      })).filter((vehicle) => vehicle.number)
      : [],
    invoiceFormat: {
      ...DEFAULT_SETTINGS.invoice.invoiceFormat,
      ...(legacyInvoiceConfig.invoiceFormat || {}),
    },
    updatedAt: serverTimestamp(),
  };
  const bank = {
    ...DEFAULT_SETTINGS.bank,
    bankName: firstValue(legacyBank.bankName, legacyBank.bank_name, DEFAULT_SETTINGS.bank.bankName),
    accountNumber: firstValue(legacyBank.accountNumber, legacyBank.account_number, DEFAULT_SETTINGS.bank.accountNumber),
    ifscCode: firstValue(legacyBank.ifscCode, legacyBank.ifsc_code, DEFAULT_SETTINGS.bank.ifscCode),
    branch: firstValue(legacyBank.branch, DEFAULT_SETTINGS.bank.branch),
    updatedAt: serverTimestamp(),
  };
  const notifications = {
    lowStockAlerts: true,
    productionReminders: true,
    salesNotifications: true,
    dailyReports: false,
    emailNotifications: false,
    smsNotifications: false,
    brickStockAlert: asNumber(firstValue(
      legacySettings.low_stock_alert?.bricks,
      DEFAULT_SETTINGS.notifications.brickStockAlert,
    )),
    cementStockAlert: asNumber(firstValue(
      legacySettings.low_stock_alert?.cement,
      DEFAULT_SETTINGS.notifications.cementStockAlert,
    )),
    updatedAt: serverTimestamp(),
  };

  pushWrite(writes, doc(db, 'settings', 'company'), company);
  pushWrite(writes, doc(db, 'settings', 'invoice'), invoice);
  pushWrite(writes, doc(db, 'settings', 'bank'), bank);
  pushWrite(writes, doc(db, 'settings', 'notifications'), notifications);
  counts.settings = 4;

  objectEntries(root.bricks?.sales?.counters).forEach(([month, counter = {}]) => {
    pushWrite(writes, doc(db, 'counters', `invoice-${month}`), {
      count: asNumber(counter.count),
      legacyMonth: month,
      updatedAt: toTimestamp(counter.last_updated),
    });
    counts.counters += 1;
  });

  objectEntries(dailyStats).forEach(([id, stats]) => pushWrite(writes, doc(db, 'dailyStats', id), { ...stats, updatedAt: serverTimestamp() }));
  objectEntries(monthlyStats).forEach(([id, stats]) => pushWrite(writes, doc(db, 'monthlyStats', id), { ...stats, updatedAt: serverTimestamp() }));
  pushWrite(writes, doc(db, 'metrics', 'current'), { ...metrics, migrated: true, updatedAt: serverTimestamp() });

  return {
    writes,
    counts,
    inventory,
    invoiceSettings: {
      gstInvoicePrefix: invoice.gstInvoicePrefix,
      gstInvoiceCurrentNumber: invoice.gstInvoiceCurrentNumber,
      gstInvoiceAutoIncrement: invoice.gstInvoiceAutoIncrement,
    },
    dailyStatsCount: Object.keys(dailyStats).length,
    monthlyStatsCount: Object.keys(monthlyStats).length,
  };
};

export const migrationService = {
  getStatus: async () => {
    try {
      const snapshot = await getDoc(doc(db, 'system', 'migration'));
      return resultOk(snapshot.exists() ? snapshot.data() : null);
    } catch (error) {
      return resultError(error);
    }
  },

  inspectLegacy: async () => {
    try {
      const snapshot = await get(ref(realtimeDb, '/'));
      const root = snapshot.val() || {};
      const plan = createMigrationPlan(root);
      return resultOk({
        hasData: snapshot.exists() && Object.keys(root).length > 0,
        counts: plan.counts,
        totalWrites: plan.writes.length,
        dailyStats: plan.dailyStatsCount,
        monthlyStats: plan.monthlyStatsCount,
        inventory: plan.inventory,
        invoiceSettings: plan.invoiceSettings,
      });
    } catch (error) {
      return resultError(error);
    }
  },

  migrate: async ({ force = false, onProgress } = {}) => {
    try {
      const markerRef = doc(db, 'system', 'migration');
      const marker = await getDoc(markerRef);
      if (marker.exists() && marker.data().version >= MIGRATION_VERSION && ['completed', 'no-legacy-data'].includes(marker.data().status) && !force) {
        return resultOk(marker.data(), { skipped: true });
      }

      const snapshot = await get(ref(realtimeDb, '/'));
      const root = snapshot.val() || {};
      if (!snapshot.exists() || Object.keys(root).length === 0) {
        const emptyMarker = {
          version: MIGRATION_VERSION,
          source: 'realtime-database',
          status: 'no-legacy-data',
          completedAt: serverTimestamp(),
        };
        const batch = writeBatch(db);
        batch.set(markerRef, emptyMarker, { merge: true });
        await batch.commit();
        return resultOk(emptyMarker);
      }

      const plan = createMigrationPlan(root);
      await flushWrites(plan.writes, onProgress);
      const summary = {
        version: MIGRATION_VERSION,
        source: 'realtime-database',
        status: 'completed',
        counts: plan.counts,
        totalWrites: plan.writes.length,
        dailyStatsCount: plan.dailyStatsCount,
        monthlyStatsCount: plan.monthlyStatsCount,
        inventoryBricks: plan.inventory.bricks,
        storedLegacyBricks: plan.inventory.storedLegacyBricks,
        migrationStockVariance: plan.inventory.migrationStockVariance,
        gstInvoicePrefix: plan.invoiceSettings.gstInvoicePrefix,
        gstInvoiceCurrentNumber: plan.invoiceSettings.gstInvoiceCurrentNumber,
        gstInvoiceAutoIncrement: plan.invoiceSettings.gstInvoiceAutoIncrement,
        completedAt: serverTimestamp(),
      };
      const batch = writeBatch(db);
      batch.set(markerRef, summary, { merge: true });
      await batch.commit();
      return resultOk(summary);
    } catch (error) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'system', 'migration'), {
          version: MIGRATION_VERSION,
          source: 'realtime-database',
          status: 'failed',
          error: error?.message || String(error),
          failedAt: serverTimestamp(),
        }, { merge: true });
        await batch.commit();
      } catch (_) {
        // Preserve the original migration error if the status marker cannot be written.
      }
      return resultError(error);
    }
  },

  verify: async () => {
    try {
      const markerSnapshot = await getDoc(doc(db, 'system', 'migration'));
      const marker = markerSnapshot.exists() ? markerSnapshot.data() : null;
      if (!marker || marker.status !== 'completed') {
        return resultOk({
          allPassed: false,
          status: marker?.status || 'not-completed',
          marker,
          checks: [],
        });
      }

      const countChecks = [
        ['customers', 'customers'],
        ['suppliers', 'suppliers'],
        ['production', 'production'],
        ['sales', 'sales'],
        ['payments', 'payments'],
        ['generatedInvoices', 'legacyInvoices'],
        ['purchases', 'purchases'],
        ['inventoryTransactions', 'inventoryTransactions'],
        ['settings', 'settings'],
        ['counters', 'counters'],
      ];

      const checks = await Promise.all(countChecks.map(async ([key, collectionName]) => {
        const snapshot = await getCountFromServer(collection(db, collectionName));
        const actual = snapshot.data().count;
        const expected = asNumber(marker.counts?.[key]);
        return { key, collection: collectionName, expected, actual, passed: actual >= expected };
      }));

      const [dailyCount, monthlyCount, inventorySnapshot, metricsSnapshot, invoiceSettingsSnapshot] = await Promise.all([
        getCountFromServer(collection(db, 'dailyStats')),
        getCountFromServer(collection(db, 'monthlyStats')),
        getDoc(doc(db, 'system', 'inventory')),
        getDoc(doc(db, 'metrics', 'current')),
        getDoc(doc(db, 'settings', 'invoice')),
      ]);

      checks.push(
        { key: 'dailyStats', collection: 'dailyStats', expected: asNumber(marker.dailyStatsCount), actual: dailyCount.data().count, passed: dailyCount.data().count >= asNumber(marker.dailyStatsCount) },
        { key: 'monthlyStats', collection: 'monthlyStats', expected: asNumber(marker.monthlyStatsCount), actual: monthlyCount.data().count, passed: monthlyCount.data().count >= asNumber(marker.monthlyStatsCount) },
        { key: 'inventoryDocument', collection: 'system/inventory', expected: 1, actual: inventorySnapshot.exists() ? 1 : 0, passed: inventorySnapshot.exists() },
        {
          key: 'brickStock',
          collection: 'system/inventory',
          expected: asNumber(marker.inventoryBricks),
          actual: inventorySnapshot.exists() ? asNumber(inventorySnapshot.data().bricks) : 0,
          passed: inventorySnapshot.exists() && asNumber(inventorySnapshot.data().bricks) === asNumber(marker.inventoryBricks),
        },
        { key: 'metricsDocument', collection: 'metrics/current', expected: 1, actual: metricsSnapshot.exists() ? 1 : 0, passed: metricsSnapshot.exists() },
        {
          key: 'gstInvoicePrefix',
          collection: 'settings/invoice',
          expected: String(marker.gstInvoicePrefix || ''),
          actual: invoiceSettingsSnapshot.exists() ? String(invoiceSettingsSnapshot.data().gstInvoicePrefix || '') : '',
          passed: invoiceSettingsSnapshot.exists() && String(invoiceSettingsSnapshot.data().gstInvoicePrefix || '') === String(marker.gstInvoicePrefix || ''),
        },
        {
          key: 'gstInvoiceCurrentNumber',
          collection: 'settings/invoice',
          expected: asNumber(marker.gstInvoiceCurrentNumber),
          actual: invoiceSettingsSnapshot.exists() ? asNumber(invoiceSettingsSnapshot.data().gstInvoiceCurrentNumber) : 0,
          passed: invoiceSettingsSnapshot.exists() && asNumber(invoiceSettingsSnapshot.data().gstInvoiceCurrentNumber) >= asNumber(marker.gstInvoiceCurrentNumber),
        },
        {
          key: 'gstInvoiceAutoIncrement',
          collection: 'settings/invoice',
          expected: marker.gstInvoiceAutoIncrement !== false,
          actual: invoiceSettingsSnapshot.exists() ? invoiceSettingsSnapshot.data().gstInvoiceAutoIncrement !== false : false,
          passed: invoiceSettingsSnapshot.exists() && (invoiceSettingsSnapshot.data().gstInvoiceAutoIncrement !== false) === (marker.gstInvoiceAutoIncrement !== false),
        },
      );

      return resultOk({
        allPassed: checks.every((check) => check.passed),
        status: marker.status,
        marker,
        checks,
      });
    } catch (error) {
      return resultError(error);
    }
  },
};

export const ensureLegacyMigration = () => migrationService.migrate();
