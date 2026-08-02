import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { INVENTORY_DEFAULTS } from './inventoryService';
import { DEFAULT_SETTINGS } from './settingsService';
import { ensureLegacyMigration } from './migrationService';
import { resultError, resultOk } from './queryUtils';

let initializationPromise = null;

const runInitialization = async () => {
  try {
    const migrationResult = await ensureLegacyMigration();

    const inventorySnapshot = await getDoc(doc(db, 'system', 'inventory'));
    const metricsSnapshot = await getDoc(doc(db, 'metrics', 'current'));
    const sections = Object.keys(DEFAULT_SETTINGS);
    const settingSnapshots = await Promise.all(sections.map((section) => getDoc(doc(db, 'settings', section))));

    const writes = [];
    if (!inventorySnapshot.exists()) {
      writes.push(setDoc(doc(db, 'system', 'inventory'), { ...INVENTORY_DEFAULTS, updatedAt: serverTimestamp() }, { merge: true }));
    }
    if (!metricsSnapshot.exists()) {
      writes.push(setDoc(doc(db, 'metrics', 'current'), { initialized: true, updatedAt: serverTimestamp() }, { merge: true }));
    }
    settingSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) {
        const section = sections[index];
        writes.push(setDoc(doc(db, 'settings', section), { ...DEFAULT_SETTINGS[section], updatedAt: serverTimestamp() }, { merge: true }));
      }
    });
    await Promise.all(writes);

    return resultOk({
      migration: migrationResult.success ? migrationResult.data : null,
      migrationWarning: migrationResult.success ? '' : migrationResult.error,
      skipped: migrationResult.skipped,
    });
  } catch (error) {
    return resultError(error);
  }
};

export const initializeDatabase = () => {
  if (!initializationPromise) initializationPromise = runInitialization();
  return initializationPromise;
};
