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
import { dateKey, monthKey, resultError, resultOk, toPlainData } from './queryUtils';
import { INVENTORY_DEFAULTS } from './inventoryService';

const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateKey(date);
};

export const dashboardService = {
  getDashboard: async () => {
    try {
      const today = dateKey();
      const month = monthKey();
      const [inventorySnapshot, todaySnapshot, monthSnapshot, metricsSnapshot, recentSales, recentProduction, trendSnapshot] =
        await Promise.all([
          getDoc(doc(db, 'system', 'inventory')),
          getDoc(doc(db, 'dailyStats', today)),
          getDoc(doc(db, 'monthlyStats', month)),
          getDoc(doc(db, 'metrics', 'current')),
          getDocs(query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(collection(db, 'production'), orderBy('date', 'desc'), limit(5))),
          getDocs(
            query(
              collection(db, 'dailyStats'),
              where(documentId(), '>=', daysAgoKey(13)),
              orderBy(documentId(), 'asc'),
              limit(14),
            ),
          ),
        ]);

      return resultOk({
        inventory: inventorySnapshot.exists() ? { ...INVENTORY_DEFAULTS, ...inventorySnapshot.data() } : INVENTORY_DEFAULTS,
        today: todaySnapshot.exists() ? todaySnapshot.data() : {},
        month: monthSnapshot.exists() ? monthSnapshot.data() : {},
        metrics: metricsSnapshot.exists() ? metricsSnapshot.data() : {},
        recentSales: recentSales.docs.map(toPlainData),
        recentProduction: recentProduction.docs.map(toPlainData),
        trend: trendSnapshot.docs.map((snapshot) => ({ date: snapshot.id, ...snapshot.data() })),
      });
    } catch (error) {
      return resultError(error);
    }
  },
};
