import { useCallback, useRef, useState } from 'react';

// Danh sách icon đã chọn để thao tác hàng loạt. Shift + bấm chọn cả dải từ icon bấm trước đó.
export function useIconSelection() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const lastToggledId = useRef<string | null>(null);

  const toggle = useCallback((iconId: string, withRange: boolean, orderedIds: readonly string[]) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const anchorIndex = lastToggledId.current ? orderedIds.indexOf(lastToggledId.current) : -1;
      const targetIndex = orderedIds.indexOf(iconId);

      if (withRange && anchorIndex !== -1 && targetIndex !== -1) {
        const [from, to] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        for (const id of orderedIds.slice(from, to + 1)) next.add(id);
      } else if (next.has(iconId)) {
        next.delete(iconId);
      } else {
        next.add(iconId);
      }
      return next;
    });
    lastToggledId.current = iconId;
  }, []);

  const selectAll = useCallback((ids: readonly string[]) => {
    setSelectedIds((current) => new Set([...current, ...ids]));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    lastToggledId.current = null;
  }, []);

  return { selectedIds, toggle, selectAll, clear };
}
