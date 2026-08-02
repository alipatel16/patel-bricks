import { useCallback, useEffect, useRef, useState } from 'react';

export const useCursorPager = ({ loader, dependencies = [], pageSize = 10 }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const cursorStack = useRef([null]);

  const load = useCallback(
    async (targetPage = 1, cursor = null) => {
      setLoading(true);
      setError('');
      try {
        const response = await loader({ cursor, pageSize });
        if (!response.success) throw new Error(response.error);
        setRows(response.data || []);
        setHasMore(Boolean(response.hasMore));
        setPage(targetPage);
        cursorStack.current[targetPage] = response.nextCursor || null;
      } catch (loadError) {
        setRows([]);
        setHasMore(false);
        setError(loadError.message || 'Unable to load data');
      } finally {
        setLoading(false);
      }
    },
    [loader, pageSize],
  );

  const reset = useCallback(() => {
    cursorStack.current = [null];
    return load(1, null);
  }, [load]);

  const next = useCallback(() => {
    if (!hasMore || !cursorStack.current[page]) return;
    load(page + 1, cursorStack.current[page]);
  }, [hasMore, load, page]);

  const previous = useCallback(() => {
    if (page <= 1) return;
    const target = page - 1;
    load(target, cursorStack.current[target - 1] || null);
  }, [load, page]);

  useEffect(() => {
    reset();
    // dependencies are intentionally controlled by the calling page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { rows, loading, error, page, hasMore, next, previous, refresh: reset };
};
