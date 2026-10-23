import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminIconFilters } from '@/client/admin/icons/adminData';
import { ICON_STATUS, type IconStatus } from '@/shared/constants/icons';

// Tên tham số trên URL: giữ bộ lọc khi tải lại trang và cho phép gửi link tới đúng một icon.
export const ADMIN_FILTER_PARAM = {
  status: 'status',
  set: 'set',
  category: 'category',
  query: 'q',
  icon: 'icon',
} as const;

type FilterParam = (typeof ADMIN_FILTER_PARAM)[keyof typeof ADMIN_FILTER_PARAM];

function isIconStatus(value: string | null): value is IconStatus {
  return value !== null && (Object.values(ICON_STATUS) as string[]).includes(value);
}

export function useAdminFilters() {
  const [params, setParams] = useSearchParams();

  const filters: AdminIconFilters = useMemo(() => {
    const status = params.get(ADMIN_FILTER_PARAM.status);
    return {
      status: isIconStatus(status) ? status : undefined,
      setId: params.get(ADMIN_FILTER_PARAM.set) ?? undefined,
      categoryId: params.get(ADMIN_FILTER_PARAM.category) ?? undefined,
      q: params.get(ADMIN_FILTER_PARAM.query) ?? undefined,
    };
  }, [params]);
  const selectedIconId = params.get(ADMIN_FILTER_PARAM.icon);

  // Link đổi một vài tham số, giữ nguyên các tham số còn lại; giá trị undefined = bỏ tham số đó.
  const hrefWith = useCallback(
    (patch: Partial<Record<FilterParam, string | undefined>>) => {
      const next = new URLSearchParams(params);
      for (const [name, value] of Object.entries(patch)) {
        if (value) next.set(name, value);
        else next.delete(name);
      }
      const query = next.toString();
      return query ? `?${query}` : '?';
    },
    [params],
  );

  const update = useCallback(
    (patch: Partial<Record<FilterParam, string | undefined>>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(patch)) {
            if (value) next.set(name, value);
            else next.delete(name);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const selectIcon = useCallback(
    (iconId: string | null) => update({ [ADMIN_FILTER_PARAM.icon]: iconId ?? undefined }),
    [update],
  );
  const setQuery = useCallback((query: string) => update({ [ADMIN_FILTER_PARAM.query]: query || undefined }), [update]);

  return { filters, selectedIconId, hrefWith, selectIcon, setQuery };
}
