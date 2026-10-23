import { useEffect, useState } from 'react';

// Mục đang xem = mục cuối cùng có đỉnh đã cuộn qua mốc topOffset (ngay dưới header cố định).
export function useActiveSection(sectionIds: readonly string[], topOffset: number): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);
  const idsKey = sectionIds.join('|');

  useEffect(() => {
    const ids = idsKey.split('|').filter(Boolean);
    let frame = 0;

    function update(): void {
      frame = 0;
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (scrolledToBottom) {
        setActiveId(ids.at(-1) ?? null);
        return;
      }
      let current = ids[0] ?? null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top - topOffset <= 1) current = id;
      }
      setActiveId(current);
    }

    function scheduleUpdate(): void {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [idsKey, topOffset]);

  return activeId;
}

export function scrollToSection(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
}
