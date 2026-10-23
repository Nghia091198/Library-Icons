import { useCallback, useEffect } from 'react';
import useSWR, { preload, useSWRConfig } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { api } from '@/client/common/apiClient';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import type { IconStatus } from '@/shared/constants/icons';
import type {
  AdminIconStatsResponse,
  IconCategoryListResponse,
  IconDetailDto,
  IconListResponse,
  IconSetListResponse,
  IconSummaryDto,
} from '@/shared/types/icons';

export const ADMIN_PAGE_SIZE = 96;

export interface AdminIconFilters {
  status?: IconStatus;
  setId?: string;
  categoryId?: string;
  q?: string;
}

const fetchJson = <TResponse>(url: string) => api.get<TResponse>(url);

export function adminIconsUrl(filters: AdminIconFilters, page: number): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(ADMIN_PAGE_SIZE) });
  for (const [name, value] of Object.entries(filters)) {
    if (value) query.set(name, value);
  }
  return `${API_ROUTE.adminIcons}?${query.toString()}`;
}

export const adminIconUrl = (id: string) => fillRoute(API_ROUTE_TEMPLATE.adminIcon, { id });

// Các khoá chứa số liệu cần làm mới sau khi icon đổi trạng thái, bộ hay nhóm.
const SUMMARY_KEYS = [API_ROUTE.adminIconStats, API_ROUTE.adminIconCategories];

export function useAdminSets() {
  const { data } = useSWR(API_ROUTE.adminIconSets, fetchJson<IconSetListResponse>);
  return { sets: data?.items ?? [] };
}

export function useAdminCategories() {
  const { data, isLoading } = useSWR(API_ROUTE.adminIconCategories, fetchJson<IconCategoryListResponse>);
  return { categories: data?.items ?? [], isLoading };
}

export function useAdminStats() {
  const { data, isLoading } = useSWR(API_ROUTE.adminIconStats, fetchJson<AdminIconStatsResponse>);
  return { stats: data ?? null, isLoading };
}

export function useAdminIconDetail(iconId: string | null) {
  return useSWR(iconId ? adminIconUrl(iconId) : null, fetchJson<IconDetailDto>, { keepPreviousData: false });
}

export function useAdminIconPages({ status, setId, categoryId, q }: AdminIconFilters) {
  const getKey = useCallback(
    (pageIndex: number, previousPage: IconListResponse | null) => {
      if (previousPage && pageIndex * ADMIN_PAGE_SIZE >= previousPage.total) return null;
      return adminIconsUrl({ status, setId, categoryId, q }, pageIndex + 1);
    },
    [status, setId, categoryId, q],
  );

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite(getKey, fetchJson<IconListResponse>, {
    revalidateFirstPage: false,
  });

  const pages = data ?? [];
  const items = pages.flatMap((page) => page.items);
  const total = pages[0]?.total ?? 0;
  const lastLoadedPage = pages[pages.length - 1] ?? null;
  const isLoadingMore = isLoading || (size > 0 && pages.length < size);
  const hasMore = items.length < total;

  // Tải sẵn trang kế tiếp vào cache để khi cuộn tới là hiện tức thì.
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const nextKey = getKey(pages.length, lastLoadedPage);
    if (nextKey) void preload(nextKey, fetchJson<IconListResponse>);
  }, [hasMore, isLoadingMore, getKey, pages.length, lastLoadedPage]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) void setSize((current) => current + 1);
  }, [isLoadingMore, hasMore, setSize]);

  // Thay icon đã sửa ngay trên lưới (hoặc bỏ khỏi lưới khi bị xoá) mà không tải lại danh sách.
  const replaceIcon = useCallback(
    (iconId: string, updated: IconSummaryDto | null) =>
      mutate(
        (current) =>
          current?.map((page) => ({
            ...page,
            items: updated
              ? page.items.map((item) => (item.id === iconId ? updated : item))
              : page.items.filter((item) => item.id !== iconId),
            total: updated ? page.total : Math.max(0, page.total - 1),
          })),
        { revalidate: false },
      ),
    [mutate],
  );

  return {
    items,
    total,
    error: error as unknown,
    hasMore,
    isLoadingFirstPage: isLoading && pages.length === 0,
    isLoadingMore: isLoadingMore && pages.length > 0,
    loadMore,
    replaceIcon,
    reload: () => void mutate(),
  };
}

// Sau khi sửa icon: làm mới ngầm số liệu ở sidebar (số theo trạng thái, theo bộ, theo nhóm).
export function useRefreshAdminSummaries() {
  const { mutate } = useSWRConfig();
  return useCallback(() => {
    for (const key of SUMMARY_KEYS) void mutate(key);
  }, [mutate]);
}
