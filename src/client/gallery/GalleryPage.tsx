import { Alert, Button, Empty, Flex, Input, Segmented, Typography } from 'antd';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/client/common/useDebouncedValue';
import { useInfiniteScroll } from '@/client/common/useInfiniteScroll';
import { useGalleryContext } from '@/client/gallery/GalleryLayout';
import { ICON_GRID_STYLE, IconSkeletonCards } from '@/client/gallery/GallerySkeletons';
import { IconCard } from '@/client/gallery/IconCard';
import { useGalleryIconPages, useGallerySets } from '@/client/gallery/useGallery';
import type { PublicIconDto } from '@/shared/types/icons';

// Modal (bộ chọn màu, khung code) khá nặng: tách khỏi gói chính, tải sẵn ngầm sau khi trang hiện xong.
const loadPreviewModal = () => import('@/client/gallery/IconPreviewModal');
const IconPreviewModal = lazy(() => loadPreviewModal().then((module) => ({ default: module.IconPreviewModal })));
const PREVIEW_MODAL_PREFETCH_DELAY_MS = 1500;

const ALL_SETS = 'all';
const ALL_ICONS_TITLE = 'All Icons';
const LOAD_ERROR = 'Không tải được danh sách icon, thử lại.';
const FIRST_LOAD_SKELETONS = 36;
const LOAD_MORE_SKELETONS = 12;

export function GalleryPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const { categories, isLoadingCategories } = useGalleryContext();
  const { sets } = useGallerySets();
  const [setId, setSetId] = useState<string>(ALL_SETS);
  const [searchText, setSearchText] = useState('');
  const query = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const [openedIcon, setOpenedIcon] = useState<PublicIconDto | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPreviewModal(), PREVIEW_MODAL_PREFETCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const category = categories.find((candidate) => candidate.slug === categorySlug) ?? null;
  const isUnknownCategory = categorySlug !== undefined && !isLoadingCategories && category === null;

  const icons = useGalleryIconPages({
    categorySlug,
    setId: setId === ALL_SETS ? undefined : setId,
    q: query || undefined,
  });
  const sentinelRef = useInfiniteScroll<HTMLDivElement>(
    icons.loadMore,
    icons.hasMore && !icons.isLoadingMore && icons.error === undefined,
  );

  const setNameOf = (id: string) => sets.find((set) => set.id === id)?.name ?? '';
  const categoryNameOf = (id: string | null) => categories.find((candidate) => candidate.id === id)?.name ?? null;
  const isEmpty = !icons.isLoadingFirstPage && icons.items.length === 0 && icons.error === undefined;

  return (
    <Flex vertical gap={20}>
      <Flex wrap align="flex-end" gap={16}>
        <div style={{ flex: '1 1 260px' }}>
          <Typography.Title level={1} style={{ margin: 0, fontSize: 26 }}>
            {category?.name ?? ALL_ICONS_TITLE}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'inline-block', minHeight: 22 }}>
            {icons.isLoadingFirstPage ? ' ' : `${icons.total.toLocaleString('en-US')} icons`}
          </Typography.Text>
        </div>
        <Input.Search
          allowClear
          size="large"
          placeholder="Search icons"
          aria-label="Search icons"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onSearch={setSearchText}
          style={{ flex: '0 1 360px' }}
        />
      </Flex>

      {sets.length > 1 && (
        <Segmented
          value={setId}
          onChange={(value) => setSetId(String(value))}
          options={[{ value: ALL_SETS, label: 'All styles' }, ...sets.map((set) => ({ value: set.id, label: set.name }))]}
          style={{ alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto' }}
        />
      )}

      {isUnknownCategory && <Alert type="warning" showIcon message={`Không có nhóm "${categorySlug}"`} />}

      {isEmpty ? (
        <Empty description="Không có icon nào" style={{ padding: 48 }} />
      ) : (
        <div style={ICON_GRID_STYLE} aria-busy={icons.isLoadingFirstPage || icons.isLoadingMore}>
          {icons.isLoadingFirstPage ? (
            <IconSkeletonCards count={FIRST_LOAD_SKELETONS} />
          ) : (
            icons.items.map((icon) => <IconCard key={icon.id} icon={icon} onOpen={setOpenedIcon} />)
          )}
          {icons.isLoadingMore && <IconSkeletonCards count={LOAD_MORE_SKELETONS} />}
        </div>
      )}

      {icons.error !== undefined && (
        <Alert
          type="error"
          showIcon
          message={LOAD_ERROR}
          action={
            <Button size="small" onClick={icons.retry}>
              Thử lại
            </Button>
          }
        />
      )}

      {icons.hasMore && <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />}
      {icons.items.length > 0 && (
        <Typography.Text type="secondary" aria-live="polite" style={{ textAlign: 'center', padding: '0 0 24px' }}>
          {icons.hasMore
            ? `Đang hiện ${icons.items.length.toLocaleString('en-US')} / ${icons.total.toLocaleString('en-US')} icons`
            : `Đã hiện hết ${icons.total.toLocaleString('en-US')} icons`}
        </Typography.Text>
      )}

      {openedIcon && (
        <Suspense fallback={null}>
          <IconPreviewModal
            icon={openedIcon}
            setName={setNameOf(openedIcon.setId)}
            categoryName={categoryNameOf(openedIcon.categoryId)}
            onClose={() => setOpenedIcon(null)}
          />
        </Suspense>
      )}
    </Flex>
  );
}
