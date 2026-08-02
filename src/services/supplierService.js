import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchCursorPage } from './firestorePager';
import {
  AUTOCOMPLETE_LIMIT,
  makeSearchPrefixes,
  normalizePhone,
  normalizeText,
  resultError,
  resultOk,
  toPlainData,
} from './queryUtils';

const prepareSupplier = (input) => {
  const name = String(input.name || '').trim();
  const gstin = String(input.gstin || '').trim().toUpperCase();
  const phone = String(input.phone || input.contact?.phone || '').trim();
  return {
    name,
    nameLower: normalizeText(name),
    gstin,
    type: input.type || 'Raw Material',
    phone,
    phoneNormalized: normalizePhone(phone),
    address: String(input.address || input.address?.line1 || '').trim(),
    notes: String(input.notes || '').trim(),
    status: input.status || 'active',
    searchPrefixes: makeSearchPrefixes(name, gstin, phone, input.type),
  };
};

export const supplierService = {
  createSupplier: async (input) => {
    try {
      const supplier = prepareSupplier(input);
      if (supplier.name.length < 2) throw new Error('Supplier name must contain at least 2 characters.');
      if (supplier.gstin) {
        const duplicate = await getDocs(query(collection(db, 'suppliers'), where('gstin', '==', supplier.gstin), limit(1)));
        if (!duplicate.empty) throw new Error('A supplier with this GSTIN already exists.');
      }
      const reference = await addDoc(collection(db, 'suppliers'), {
        ...supplier,
        totalPurchases: 0,
        totalAmount: 0,
        lastPurchaseDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return resultOk({ id: reference.id, ...supplier });
    } catch (error) {
      return resultError(error);
    }
  },

  updateSupplier: async (id, input) => {
    try {
      const supplier = prepareSupplier(input);
      await updateDoc(doc(db, 'suppliers', id), { ...supplier, updatedAt: serverTimestamp() });
      return resultOk({ id, ...supplier });
    } catch (error) {
      return resultError(error);
    }
  },

  getSupplierById: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'suppliers', id));
      return resultOk(snapshot.exists() ? toPlainData(snapshot) : null);
    } catch (error) {
      return resultError(error);
    }
  },

  getSuppliersPage: async ({ cursor, pageSize = 10, searchTerm = '', status = 'all' }) => {
    try {
      const normalized = normalizeText(searchTerm).replace(/\s+/g, '');
      const constraints = [];
      if (normalized.length >= 2) constraints.push(where('searchPrefixes', 'array-contains', normalized));
      if (status !== 'all') constraints.push(where('status', '==', status));
      const page = await fetchCursorPage({
        collectionName: 'suppliers',
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

  searchSuppliers: async (term, maxResults = AUTOCOMPLETE_LIMIT) => {
    try {
      const normalized = normalizeText(term).replace(/\s+/g, '');
      if (normalized.length < 2) return resultOk([]);
      const snapshot = await getDocs(
        query(
          collection(db, 'suppliers'),
          where('searchPrefixes', 'array-contains', normalized),
          orderBy('nameLower', 'asc'),
          limit(maxResults),
        ),
      );
      return resultOk(snapshot.docs.map(toPlainData));
    } catch (error) {
      return resultError(error);
    }
  },

  deleteSupplier: async (id) => {
    try {
      const snapshot = await getDoc(doc(db, 'suppliers', id));
      if (!snapshot.exists()) throw new Error('Supplier not found.');
      if ((snapshot.data().totalPurchases || 0) > 0) {
        await updateDoc(snapshot.ref, { status: 'inactive', updatedAt: serverTimestamp() });
        return resultOk(null, { message: 'Supplier has purchase history and was marked inactive.' });
      }
      await deleteDoc(snapshot.ref);
      return resultOk(null);
    } catch (error) {
      return resultError(error);
    }
  },


  getSupplierPurchasesPage: async ({ supplierId, cursor, pageSize = 10 }) => {
    try {
      const page = await fetchCursorPage({
        collectionName: 'purchases',
        cursor,
        pageSize,
        constraints: [where('supplierId', '==', supplierId)],
        sortField: 'date',
        sortDirection: 'desc',
      });
      return resultOk(page.data, page);
    } catch (error) {
      return resultError(error);
    }
  },

  getAllSuppliers: async () => supplierService.getSuppliersPage({ pageSize: 25 }),
};
