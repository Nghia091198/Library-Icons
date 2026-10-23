import { useCallback, useEffect } from 'react';
import useSWR, { preload } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { fetchPublicJson, publicIconsUrl, type PublicIconListParams } from '@/client/gallery/galleryService';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import type { IconCategoryListResponse, IconSetListResponse, PublicIconListResponse } from '@/shared/types/icons';

// Bội số của số cột lưới hay gặp (4, 6, 8, 12) để hàng cuối mỗi lần tải thường đầy.
export const GALLERY_PAGE_SIZE = 96;

export type GalleryIconFilters = Omit<PublicIconListParams, 'page' | 'pageSize'>;

export function useGalleryCategories() {
  const { data, isLoading } = useSWR(API_ROUTE.publicIconCategories, fetchPublicJson<IconCategoryListResponse>);
  return { categories: data?.items ?? [], totalCount: data?.totalCount ?? 0, isLoading };
}

export function useGallerySets() {
  const { data } = useSWR(API_ROUTE.publicIconSets, fetchPublicJson<IconSetListResponse>);
  return { sets: data?.items ?? [] };
}

export function useGalleryIconPages({ categorySlug, setId, q }: GalleryIconFilters) {
  const getKey = useCallback(
    (pageIndex: number, previousPage: PublicIconListResponse | null) => {
      if (previousPage && pageIndex * GALLERY_PAGE_SIZE >= previousPage.total) return null;
      return publicIconsUrl({ categorySlug, setId, q, page: pageIndex + 1, pageSize: GALLERY_PAGE_SIZE });
    },
    [categorySlug, setId, q],
  );

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite(getKey, fetchPublicJson<PublicIconListResponse>, {
    revalidateFirstPage: false,
    keepPreviousData: true,
  });

  const pages = data ?? [];
  const items = pages.flatMap((page) => page.items);
  const total = pages[0]?.total ?? 0;
  const lastLoadedPage = pages[pages.length - 1] ?? null;
  const isLoadingMore = isLoading || (size > 0 && pages.length < size);
  const hasMore = items.length < total;

  // Tải sẵn trang kế tiếp vào cache ngay khi trang hiện tại về, để khi cuộn tới là hiện tức thì.
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const nextKey = getKey(pages.length, lastLoadedPage);
    if (nextKey) void preload(nextKey, fetchPublicJson<PublicIconListResponse>);
  }, [hasMore, isLoadingMore, getKey, pages.length, lastLoadedPage]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) void setSize((current) => current + 1);
  }, [isLoadingMore, hasMore, setSize]);

  return {
    items,
    total,
    error: error as unknown,
    hasMore,
    isLoadingFirstPage: isLoading && pages.length === 0,
    isLoadingMore: isLoadingMore && pages.length > 0,
    loadMore,
    retry: () => void mutate(),
  };
}
