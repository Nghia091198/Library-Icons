import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncResource<TData> {
  data: TData | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
  setData: (data: TData) => void;
}

// `key` quyết định khi nào tải lại: đổi key là tải lại, `load` mới với cùng key thì không.
export function useAsyncResource<TData>(load: (() => Promise<TData>) | null, key: string): AsyncResource<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(load !== null);
  const [error, setError] = useState<unknown>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const currentLoad = loadRef.current;
    if (!currentLoad) {
      setData(null);
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);
    setError(null);
    currentLoad()
      .then((result) => {
        if (isActive) setData(result);
      })
      .catch((loadError: unknown) => {
        if (isActive) setError(loadError);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [key, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  return { data, loading, error, reload, setData };
}
