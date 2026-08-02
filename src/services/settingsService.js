import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { resultError, resultOk } from './queryUtils';

export const DEFAULT_SETTINGS = {
  company: {
    name: 'PATEL BRICKS',
    address: 'Behind Patel Petroleum, Mandal Road, Bhojva, Viramgam - 382150',
    phone: '9898032192, 8000001819',
    email: 'patelbricks1819@gmail.com',
    gstin: '24BLLPP8863R1ZX',
    state: 'Gujarat',
    stateCode: '24',
    transportationMode: 'BY ROAD',
  },
  invoice: {
    prefix: 'B18',
    gstInvoicePrefix: 'C',
    gstInvoiceCurrentNumber: 48,
    gstInvoiceAutoIncrement: true,
    productName: 'FLY ASH BRICKS',
    hsnCode: '6815',
    defaultRate: 2.5,
    gstRate: 12,
    cgstRate: 6,
    sgstRate: 6,
    igstRate: 12,
    defaultTransportMode: 'BY ROAD',
    reverseCharge: false,
    vehicles: [],
    invoiceFormat: {
      showBankDetails: true,
      showCompanyLogo: true,
      showCustomerDetails: true,
      showSignature: true,
      showTerms: true,
    },
    terms: [
      'Goods once sold can not be taken back or exchange',
      'Payment will be made after one month of delivery',
      'All Taxes and Commission will be charged extra',
    ],
  },
  bank: {
    bankName: 'Kotak Mahindra Bank',
    accountNumber: '3647213697',
    ifscCode: 'KKBK0000160',
    branch: 'Viramgam Branch',
  },
  notifications: {
    lowStockAlerts: true,
    productionReminders: true,
    salesNotifications: true,
    dailyReports: false,
    emailNotifications: false,
    smsNotifications: false,
    brickStockAlert: 1000,
    cementStockAlert: 10,
  },
};

const SECTIONS = ['company', 'invoice', 'bank', 'notifications'];

export const settingsService = {
  getAll: async () => {
    try {
      const snapshots = await Promise.all(
        SECTIONS.map((id) => getDoc(doc(db, 'settings', id))),
      );
      return resultOk(SECTIONS.reduce((result, section, index) => {
        if (!snapshots[index].exists()) {
          result[section] = DEFAULT_SETTINGS[section];
          return result;
        }
        const saved = snapshots[index].data();
        result[section] = section === 'invoice'
          ? {
            ...DEFAULT_SETTINGS.invoice,
            ...saved,
            invoiceFormat: {
              ...DEFAULT_SETTINGS.invoice.invoiceFormat,
              ...(saved.invoiceFormat || {}),
            },
          }
          : { ...DEFAULT_SETTINGS[section], ...saved };
        return result;
      }, {}));
    } catch (error) {
      return resultError(error);
    }
  },

  saveSection: async (section, values) => {
    try {
      if (!SECTIONS.includes(section)) throw new Error('Unknown settings section.');
      let normalizedValues = { ...values };
      if (section === 'invoice') {
        const gstInvoicePrefix = String(values.gstInvoicePrefix || '').trim().toUpperCase();
        const gstInvoiceCurrentNumber = Math.max(1, Math.trunc(Number(values.gstInvoiceCurrentNumber) || 1));
        if (!gstInvoicePrefix) throw new Error('GST invoice prefix is required.');
        const cgstRate = Math.max(0, Number(values.cgstRate) || 0);
        const sgstRate = Math.max(0, Number(values.sgstRate) || 0);
        const igstRate = Math.max(0, Number(values.igstRate) || (cgstRate + sgstRate));
        normalizedValues = {
          ...values,
          prefix: String(values.prefix || 'B18').trim().toUpperCase() || 'B18',
          gstInvoicePrefix,
          gstInvoiceCurrentNumber,
          gstInvoiceAutoIncrement: values.gstInvoiceAutoIncrement !== false,
          cgstRate,
          sgstRate,
          igstRate,
          // Kept for older records/components. For local GST this is always
          // the sum of the configured CGST and SGST components.
          gstRate: cgstRate + sgstRate,
          invoiceFormat: {
            ...DEFAULT_SETTINGS.invoice.invoiceFormat,
            ...(values.invoiceFormat || {}),
          },
        };
      }
      await setDoc(doc(db, 'settings', section), { ...normalizedValues, updatedAt: serverTimestamp() }, { merge: true });
      return resultOk(normalizedValues);
    } catch (error) {
      return resultError(error);
    }
  },

  addVehicle: async (vehicle) => {
    try {
      const result = await settingsService.getAll();
      if (!result.success) return result;
      const number = String(vehicle.number || '').trim().toUpperCase();
      if (!number) throw new Error('Vehicle number is required.');
      const current = result.data.invoice.vehicles || [];
      if (current.some((item) => String(typeof item === 'string' ? item : item.number || '').replace(/\s+/g, '') === number.replace(/\s+/g, ''))) {
        throw new Error('This vehicle number already exists.');
      }
      const nextVehicle = {
        id: vehicle.id || `vehicle-${Date.now()}`,
        number,
        driver: String(vehicle.driver || '').trim(),
        capacity: String(vehicle.capacity || '').trim(),
        notes: String(vehicle.notes || '').trim(),
        createdAt: vehicle.createdAt || new Date().toISOString(),
      };
      const vehicles = [...current, nextVehicle];
      await setDoc(doc(db, 'settings', 'invoice'), { vehicles, updatedAt: serverTimestamp() }, { merge: true });
      return resultOk(nextVehicle);
    } catch (error) {
      return resultError(error);
    }
  },

  updateVehicle: async (vehicleId, vehicle) => {
    try {
      const result = await settingsService.getAll();
      if (!result.success) return result;
      const number = String(vehicle.number || '').trim().toUpperCase();
      if (!number) throw new Error('Vehicle number is required.');
      const vehicles = (result.data.invoice.vehicles || []).map((item, index) => {
        const normalizedItem = typeof item === 'string'
          ? { id: `vehicle-${index + 1}`, number: item, driver: '', capacity: '', notes: '' }
          : item;
        return normalizedItem.id === vehicleId
          ? { ...normalizedItem, ...vehicle, number, updatedAt: new Date().toISOString() }
          : normalizedItem;
      });
      await setDoc(doc(db, 'settings', 'invoice'), { vehicles, updatedAt: serverTimestamp() }, { merge: true });
      return resultOk(vehicles.find((item) => item.id === vehicleId));
    } catch (error) {
      return resultError(error);
    }
  },

  deleteVehicle: async (vehicleId) => {
    try {
      const result = await settingsService.getAll();
      if (!result.success) return result;
      const vehicles = (result.data.invoice.vehicles || []).filter((item, index) => {
        const id = typeof item === 'string' ? `vehicle-${index + 1}` : item.id;
        return id !== vehicleId;
      });
      await setDoc(doc(db, 'settings', 'invoice'), { vehicles, updatedAt: serverTimestamp() }, { merge: true });
      return resultOk(vehicles);
    } catch (error) {
      return resultError(error);
    }
  },
};
