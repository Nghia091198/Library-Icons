import { useEffect, useState } from 'react';

// Đủ ngắn để kết quả hiện như tức thì, đủ dài để không gửi request cho mỗi phím gõ.
export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<TValue>(value: TValue, delayMs: number): TValue {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
