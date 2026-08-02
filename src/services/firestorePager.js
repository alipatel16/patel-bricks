import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { PAGE_SIZE, toPlainData } from './queryUtils';

export const fetchCursorPage = async ({
  collectionName,
  cursor = null,
  pageSize = PAGE_SIZE,
  constraints = [],
  sortField = 'createdAt',
  sortDirection = 'desc',
}) => {
  const queryConstraints = [
    ...constraints,
    orderBy(sortField === '__name__' ? documentId() : sortField, sortDirection),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize + 1),
  ];

  const snapshot = await getDocs(query(collection(db, collectionName), ...queryConstraints));
  const visibleDocs = snapshot.docs.slice(0, pageSize);
  return {
    data: visibleDocs.map(toPlainData),
    nextCursor: visibleDocs.length ? visibleDocs[visibleDocs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
};

export { where };
