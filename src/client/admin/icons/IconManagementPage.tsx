import { CheckCircleOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Flex, Grid, Input, Popconfirm, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAdminCategories,
  useAdminIconPages,
  useAdminSets,
  useRefreshAdminSummaries,
  type AdminIconFilters,
} from '@/client/admin/icons/adminData';
import { ADMIN_GRID_STYLE, AdminIconTile, AdminIconTileSkeletons } from '@/client/admin/icons/AdminIconTile';
import { publishDrafts } from '@/client/admin/icons/iconAdminService';
import { IconDetailPanel } from '@/client/admin/icons/IconDetailPanel';
import { describeApiError, ICON_STATUS_LABEL } from '@/client/admin/icons/iconTexts';
import { useAdminFilters } from '@/client/admin/icons/useAdminFilters';
import { APP_HEADER_HEIGHT } from '@/client/common/AppShell';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { useMessage } from '@/client/common/MessageProvider';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/client/common/useDebouncedValue';
import { useInfiniteScroll } from '@/client/common/useInfiniteScroll';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { IconDetailDto, IconSummaryDto } from '@/shared/types/icons';

const DETAIL_COLUMN_WIDTH = 400;
const COLUMN_GAP = 16;
const FIRST_LOAD_SKELETONS = 40;
const LOAD_MORE_SKELETONS = 16;
// Khoảng cách từ đáy header tới cột chi tiết khi cột này dính theo khi cuộn.
const STICKY_TOP = APP_HEADER_HEIGHT + 24;

function matchesFilters(icon: IconSummaryDto, filters: AdminIconFilters): boolean {
  return (
    (!filters.status || icon.status === filters.status) &&
    (!filters.setId || icon.setId === filters.setId) &&
    (!filters.categoryId || icon.categoryId === filters.categoryId)
  );
}

export function IconManagementPage() {
  const navigate = useNavigate();
  const message = useMessage();
  const screens = Grid.useBreakpoint();
  const isWide = screens.xl === true;

  const { filters, selectedIconId, selectIcon, setQuery } = useAdminFilters();
  const [searchText, setSearchText] = useState(filters.q ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const [isPublishing, setPublishing] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== (filters.q ?? '')) setQuery(debouncedSearch);
  }, [debouncedSearch, filters.q, setQuery]);

  const { sets } = useAdminSets();
  const { categories } = useAdminCategories();
  const icons = useAdminIconPages(filters);
  const refreshSummaries = useRefreshAdminSummaries();
  const sentinelRef = useInfiniteScroll<HTMLDivElement>(
    icons.loadMore,
    icons.hasMore && !icons.isLoadingMore && icons.error === undefined,
  );

  const title = [
    filters.status ? ICON_STATUS_LABEL[filters.status] : 'Tất cả icon',
    sets.find((set) => set.id === filters.setId)?.name,
    categories.find((category) => category.id === filters.categoryId)?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  const isDraftView = filters.status === ICON_STATUS.draft;
  const isEmpty = !icons.isLoadingFirstPage && icons.items.length === 0 && icons.error === undefined;

  const handleChanged = useCallback(
    (updated: IconDetailDto) => {
      void icons.replaceIcon(updated.id, matchesFilters(updated, filters) ? updated : null);
      refreshSummaries();
    },
    [icons, filters, refreshSummaries],
  );

  const handleDeleted = useCallback(
    (iconId: string) => {
      void icons.replaceIcon(iconId, null);
      selectIcon(null);
      refreshSummaries();
    },
    [icons, selectIcon, refreshSummaries],
  );

  async function publishFilteredDrafts() {
    setPublishing(true);
    try {
      const result = await publishDrafts({ setId: filters.setId, categoryId: filters.categoryId });
      void message.success(`Đã publish ${result.published} icon`);
      icons.reload();
      refreshSummaries();
    } catch (error) {
      void message.error(describeApiError(error));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Flex vertical gap={16}>
      <Flex wrap align="flex-end" gap={16}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <Typography.Title level={1} style={{ margin: 0, fontSize: 24 }}>
            {title}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'inline-block', minHeight: 22 }}>
            {icons.isLoadingFirstPage ? ' ' : `${icons.total.toLocaleString('en-US')} icon`}
          </Typography.Text>
        </div>
        <Input.Search
          allowClear
          placeholder="Tìm theo tên hoặc slug"
          aria-label="Tìm icon"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onSearch={setSearchText}
          style={{ flex: '0 1 320px' }}
        />
        <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => navigate(CLIENT_ROUTE.adminUpload)}>
          Upload
        </Button>
      </Flex>

      {isDraftView && icons.total > 0 && !filters.q && (
        <Alert
          type="info"
          showIcon
          message={`${icons.total.toLocaleString('en-US')} bản nháp khớp bộ lọc hiện tại`}
          action={
            <Popconfirm
              title={`Publish ${icons.total.toLocaleString('en-US')} icon?`}
              description="Các icon này sẽ hiện ngay trên gallery công khai."
              okText="Publish"
              cancelText="Huỷ"
              onConfirm={() => void publishFilteredDrafts()}
            >
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} loading={isPublishing}>
                Publish tất cả
              </Button>
            </Popconfirm>
          }
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isWide ? `minmax(0, 1fr) ${DETAIL_COLUMN_WIDTH}px` : 'minmax(0, 1fr)',
          gap: COLUMN_GAP,
          alignItems: 'start',
        }}
      >
        <Flex vertical gap={16} style={{ minWidth: 0 }}>
          {icons.error !== undefined && (
            <Alert
              type="error"
              showIcon
              message={describeApiError(icons.error)}
              action={
                <Button size="small" onClick={icons.reload}>
                  Thử lại
                </Button>
              }
            />
          )}
          {isEmpty ? (
            <Empty description="Không có icon nào khớp bộ lọc" style={{ padding: 48 }} />
          ) : (
            <div style={ADMIN_GRID_STYLE} aria-busy={icons.isLoadingFirstPage || icons.isLoadingMore}>
              {icons.isLoadingFirstPage ? (
                <AdminIconTileSkeletons count={FIRST_LOAD_SKELETONS} />
              ) : (
                icons.items.map((icon) => (
                  <AdminIconTile key={icon.id} icon={icon} isSelected={icon.id === selectedIconId} onSelect={selectIcon} />
                ))
              )}
              {icons.isLoadingMore && <AdminIconTileSkeletons count={LOAD_MORE_SKELETONS} />}
            </div>
          )}
          {icons.hasMore && <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />}
          {icons.items.length > 0 && (
            <Typography.Text type="secondary" aria-live="polite" style={{ textAlign: 'center', paddingBottom: 24 }}>
              {icons.hasMore
                ? `Đang hiện ${icons.items.length.toLocaleString('en-US')} / ${icons.total.toLocaleString('en-US')} icon`
                : `Đã hiện hết ${icons.total.toLocaleString('en-US')} icon`}
            </Typography.Text>
          )}
        </Flex>

        {(isWide || selectedIconId) && (
          <aside
            aria-label="Chi tiết icon"
            className="gallery-scroll"
            style={
              isWide
                ? { position: 'sticky', top: STICKY_TOP, maxHeight: `calc(100vh - ${STICKY_TOP + 16}px)`, overflowY: 'auto' }
                : { order: -1 }
            }
          >
            <IconDetailPanel
              iconId={selectedIconId}
              sets={sets}
              categories={categories}
              onChanged={handleChanged}
              onDeleted={handleDeleted}
            />
          </aside>
        )}
      </div>
    </Flex>
  );
}
