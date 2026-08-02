import {
  collection,
  documentId,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { dateKey, monthKey, resultError, resultOk } from './queryUtils';

const sumFields = (rows) => rows.reduce((total, row) => {
  Object.entries(row).forEach(([key, value]) => {
    if (typeof value === 'number') total[key] = (total[key] || 0) + value;
  });
  return total;
}, {});

export const reportService = {
  getSummary: async ({ mode = 'month', dateFrom = '', dateTo = '' } = {}) => {
    try {
      if (mode === 'today') {
        const snapshot = await getDoc(doc(db, 'dailyStats', dateKey()));
        return resultOk({ summary: snapshot.exists() ? snapshot.data() : {}, rows: snapshot.exists() ? [{ date: dateKey(), ...snapshot.data() }] : [] });
      }
      if (mode === 'month') {
        const month = monthKey();
        const [summarySnapshot, rowsSnapshot] = await Promise.all([
          getDoc(doc(db, 'monthlyStats', month)),
          getDocs(
            query(
              collection(db, 'dailyStats'),
              where(documentId(), '>=', `${month}-01`),
              where(documentId(), '<=', `${month}-31`),
              orderBy(documentId(), 'asc'),
              limit(31),
            ),
          ),
        ]);
        return resultOk({
          summary: summarySnapshot.exists() ? summarySnapshot.data() : {},
          rows: rowsSnapshot.docs.map((item) => ({ date: item.id, ...item.data() })),
        });
      }

      if (!dateFrom || !dateTo) throw new Error('Select both start and end dates.');
      const startDate = new Date(`${dateFrom}T00:00:00`);
      const endDate = new Date(`${dateTo}T00:00:00`);
      if (endDate < startDate) throw new Error('The end date must be on or after the start date.');
      const rangeDays = Math.floor((endDate - startDate) / 86400000) + 1;
      if (rangeDays > 366) throw new Error('Custom reports are limited to 366 days to control Firestore reads.');
      const snapshot = await getDocs(
        query(
          collection(db, 'dailyStats'),
          where(documentId(), '>=', dateFrom),
          where(documentId(), '<=', dateTo),
          orderBy(documentId(), 'asc'),
          limit(366),
        ),
      );
      const rows = snapshot.docs.map((item) => ({ date: item.id, ...item.data() }));
      return resultOk({ summary: sumFields(rows), rows });
    } catch (error) {
      return resultError(error);
    }
  },
};
