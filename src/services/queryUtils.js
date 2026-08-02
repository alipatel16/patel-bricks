export const PAGE_SIZE = 10;
export const AUTOCOMPLETE_LIMIT = 8;

export const normalizeText = (value = '') =>
  String(value)
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');

export const normalizePhone = (value = '') => String(value).replace(/\D/g, '');

export const makeSearchPrefixes = (...values) => {
  const prefixes = new Set();
  values
    .filter(Boolean)
    .map(normalizeText)
    .forEach((value) => {
      const compact = value.replace(/\s+/g, '');
      [value, compact].forEach((candidate) => {
        for (let i = 2; i <= Math.min(candidate.length, 32); i += 1) {
          prefixes.add(candidate.slice(0, i));
        }
      });
    });
  return Array.from(prefixes).slice(0, 180);
};

export const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const dateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const monthKey = (value = new Date()) => dateKey(value).slice(0, 7);

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(asNumber(value));

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(asNumber(value));

export const toPlainData = (snapshot) => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
  };
};

export const resultOk = (data, extra = {}) => ({ success: true, data, ...extra });
export const resultError = (error) => ({
  success: false,
  error: error?.message || String(error || 'Something went wrong'),
});
