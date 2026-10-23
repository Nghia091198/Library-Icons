import { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Spin,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publishDrafts } from '@/client/admin/icons/iconAdminService';
import { IconDetailPanel } from '@/client/admin/icons/IconDetailPanel';
import { IconGrid } from '@/client/admin/icons/IconGrid';
import { describeApiError, ICON_STATUS_LABEL } from '@/client/admin/icons/iconTexts';
import { useIconCategories, useIconList, useIconSets } from '@/client/admin/icons/useIcons';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { useMessage } from '@/client/common/MessageProvider';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/client/common/useDebouncedValue';
import { ICON_LIST_PAGE_SIZE, ICON_STATUS, type IconStatus } from '@/shared/constants/icons';

const ALL = 'all';
const STATUS_TABS = [
  { key: ALL, label: 'Tất cả' },
  ...Object.values(ICON_STATUS).map((status) => ({ key: status, label: ICON_STATUS_LABEL[status] })),
];

function isIconStatus(value: string): value is IconStatus {
  return (Object.values(ICON_STATUS) as string[]).includes(value);
}

export function IconSettingsPage() {
  const navigate = useNavigate();
  const message = useMessage();
  const [status, setStatus] = useState<string>(ALL);
  const [setId, setSetId] = useState<string>(ALL);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [searchText, setSearchText] = useState('');
  const query = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPublishing, setPublishing] = useState(false);

  useEffect(() => setPage(1), [query]);

  const { sets } = useIconSets();
  const categoryResource = useIconCategories();
  const { categories } = categoryResource;
  const filters = {
    setId: setId === ALL ? undefined : setId,
    categoryId: categoryId === ALL ? undefined : categoryId,
  };
  const list = useIconList({
    ...filters,
    status: isIconStatus(status) ? status : undefined,
    q: query || undefined,
    page,
    pageSize: ICON_LIST_PAGE_SIZE.default,
  });
  const icons = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const isDraftTab = status === ICON_STATUS.draft;

  const resetToFirstPage = <TValue,>(apply: (value: TValue) => void) => (value: TValue) => {
    apply(value);
    setPage(1);
  };
  const setName = (id: string) => sets.find((set) => set.id === id)?.name ?? '—';
  const refresh = () => {
    list.reload();
    categoryResource.reload();
  };

  async function publishFilteredDrafts() {
    setPublishing(true);
    try {
      const result = await publishDrafts(filters);
      void message.success(`Đã publish ${result.published} icon`);
      refresh();
    } catch (error) {
      void message.error(describeApiError(error));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Flex vertical gap={16}>
      <Flex wrap align="center" gap={16}>
        <div style={{ flex: '1 1 300px' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Quản lý icon
          </Typography.Title>
          <Typography.Text type="secondary">
            Merchant chỉ thấy icon <strong>Đã publish</strong> trên gallery. Chọn một icon để sửa, đổi nhóm, publish hoặc lưu trữ.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(CLIENT_ROUTE.adminUpload)}>
          Upload icon
        </Button>
      </Flex>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={16}>
          <Card styles={{ body: { paddingTop: 0 } }}>
            <Tabs activeKey={status} items={STATUS_TABS} onChange={resetToFirstPage(setStatus)} />
            <Flex wrap gap={12} style={{ marginBottom: 16 }}>
              <Input.Search
                allowClear
                placeholder="Tìm theo tên hoặc slug"
                aria-label="Tìm icon"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onSearch={setSearchText}
                style={{ flex: '1 1 220px' }}
              />
              <Select
                aria-label="Lọc theo bộ icon"
                value={setId}
                onChange={resetToFirstPage(setSetId)}
                style={{ minWidth: 140 }}
                options={[{ value: ALL, label: 'Tất cả bộ' }, ...sets.map((set) => ({ value: set.id, label: set.name }))]}
              />
              <Select
                aria-label="Lọc theo nhóm"
                showSearch
                optionFilterProp="label"
                value={categoryId}
                onChange={resetToFirstPage(setCategoryId)}
                style={{ minWidth: 180 }}
                options={[
                  { value: ALL, label: 'Tất cả nhóm' },
                  ...categories.map((category) => ({ value: category.id, label: `${category.name} (${category.iconCount})` })),
                ]}
              />
            </Flex>

            {isDraftTab && total > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={`${total} bản nháp khớp bộ lọc bộ và nhóm hiện tại`}
                action={
                  <Popconfirm
                    title={`Publish ${total} icon?`}
                    description="Các icon này sẽ hiện ngay trên gallery công khai."
                    okText="Publish"
                    cancelText="Huỷ"
                    disabled={query.length > 0}
                    onConfirm={() => void publishFilteredDrafts()}
                  >
                    <Tooltip title={query.length > 0 ? 'Xoá ô tìm kiếm trước, vì publish hàng loạt chỉ lọc theo bộ và nhóm' : undefined}>
                      <Button type="primary" icon={<CheckCircleOutlined />} loading={isPublishing} disabled={query.length > 0}>
                        Publish tất cả
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                }
              />
            )}

            {list.error !== null && <Alert type="error" showIcon message={describeApiError(list.error)} />}
            <Spin spinning={list.loading}>
              {icons.length > 0 ? (
                <IconGrid icons={icons} selectedId={selectedId} onSelect={setSelectedId} />
              ) : (
                !list.loading && <Empty description="Chưa có icon nào khớp bộ lọc" />
              )}
            </Spin>

            {total > 0 && (
              <Flex wrap justify="space-between" align="center" gap={12} style={{ marginTop: 16 }}>
                <Typography.Text type="secondary">{total} icon</Typography.Text>
                <Pagination
                  current={page}
                  pageSize={ICON_LIST_PAGE_SIZE.default}
                  total={total}
                  showSizeChanger={false}
                  onChange={setPage}
                />
              </Flex>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <IconDetailPanel
            iconId={selectedId}
            setName={setName}
            categories={categories}
            onChanged={refresh}
            onDeleted={() => {
              setSelectedId(null);
              refresh();
            }}
          />
        </Col>
      </Row>
    </Flex>
  );
}
