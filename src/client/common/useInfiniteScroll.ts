import { useEffect, useRef } from 'react';

// Bắt đầu tải khi mốc còn cách màn hình khoảng 2–3 màn hình, để người dùng cuộn liên tục không chạm đáy.
const DEFAULT_PREFETCH_DISTANCE_PX = 1500;

export function useInfiniteScroll<TElement extends Element>(
  onReachEnd: () => void,
  enabled: boolean,
  prefetchDistancePx: number = DEFAULT_PREFETCH_DISTANCE_PX,
) {
  const sentinelRef = useRef<TElement | null>(null);
  const onReachEndRef = useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onReachEndRef.current();
      },
      { rootMargin: `0px 0px ${prefetchDistancePx}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, prefetchDistancePx]);

  return sentinelRef;
}
