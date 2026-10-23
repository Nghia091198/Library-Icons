import { CheckCircleOutlined, CloseOutlined, DeleteOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Divider, Flex, Popconfirm, Select, Typography } from 'antd';
import { FloatingBar } from '@/client/common/FloatingBar';
import { BULK_ICON_ACTION, type BulkIconAction } from '@/shared/constants/icons';
import type { IconCategoryDto } from '@/shared/types/icons';

// Giá trị riêng trong ô chọn nhóm cho lựa chọn "bỏ nhóm" (gửi lên server là categoryId null).
const NO_CATEGORY = '__none__';

interface BulkActionBarProps {
  selectedCount: number;
  visibleCount: number;
  categories: IconCategoryDto[];
  busyAction: BulkIconAction | null;
  onAction: (action: BulkIconAction, categoryId?: string | null) => void;
  onSelectAllVisible: () => void;
  onClear: () => void;
  onExit: () => void;
}

export function BulkActionBar({
  selectedCount,
  visibleCount,
  categories,
  busyAction,
  onAction,
  onSelectAllVisible,
  onClear,
  onExit,
}: BulkActionBarProps) {
  const isEmpty = selectedCount === 0;
  const isBusy = busyAction !== null;
  const countText = selectedCount.toLocaleString('en-US');

  return (
    <FloatingBar label="Thao tác với các icon đã chọn">
      <Flex wrap align="center" gap={8}>
        <Typography.Text strong aria-live="polite" style={{ padding: '0 4px', minWidth: 96 }}>
          Đã chọn {countText}
        </Typography.Text>
        <Button size="small" type="text" onClick={onSelectAllVisible} disabled={isBusy}>
          Chọn {visibleCount.toLocaleString('en-US')} đang hiện
        </Button>
        <Button size="small" type="text" onClick={onClear} disabled={isEmpty || isBusy}>
          Bỏ chọn
        </Button>

        <Divider type="vertical" style={{ margin: 0 }} />

        <Button
          size="small"
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={isEmpty || isBusy}
          loading={busyAction === BULK_ICON_ACTION.publish}
          onClick={() => onAction(BULK_ICON_ACTION.publish)}
        >
          Publish
        </Button>
        <Popconfirm
          title={`Lưu trữ ${countText} icon?`}
          description="Icon sẽ ẩn khỏi gallery và API, slug vẫn được giữ."
          okText="Lưu trữ"
          cancelText="Huỷ"
          disabled={isEmpty || isBusy}
          onConfirm={() => onAction(BULK_ICON_ACTION.archive)}
        >
          <Button size="small" icon={<InboxOutlined />} disabled={isEmpty || isBusy} loading={busyAction === BULK_ICON_ACTION.archive}>
            Lưu trữ
          </Button>
        </Popconfirm>
        <Button
          size="small"
          icon={<UndoOutlined />}
          disabled={isEmpty || isBusy}
          loading={busyAction === BULK_ICON_ACTION.restore}
          onClick={() => onAction(BULK_ICON_ACTION.restore)}
        >
          Khôi phục
        </Button>
        <Select
          size="small"
          showSearch
          optionFilterProp="label"
          placeholder="Đổi nhóm…"
          aria-label="Đổi nhóm cho các icon đã chọn"
          value={null}
          disabled={isEmpty || isBusy}
          loading={busyAction === BULK_ICON_ACTION.setCategory}
          onChange={(value: string) => onAction(BULK_ICON_ACTION.setCategory, value === NO_CATEGORY ? null : value)}
          options={[
            { value: NO_CATEGORY, label: 'Bỏ nhóm' },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
          style={{ width: 150 }}
        />
        <Popconfirm
          title={`Xoá các bản nháp trong ${countText} icon đã chọn?`}
          description="Chỉ xoá được bản nháp chưa từng publish; icon khác sẽ được bỏ qua. Không hoàn tác được."
          okText="Xoá"
          okButtonProps={{ danger: true }}
          cancelText="Huỷ"
          disabled={isEmpty || isBusy}
          onConfirm={() => onAction(BULK_ICON_ACTION.delete)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} disabled={isEmpty || isBusy} loading={busyAction === BULK_ICON_ACTION.delete}>
            Xoá nháp
          </Button>
        </Popconfirm>

        <Divider type="vertical" style={{ margin: 0 }} />

        <Button size="small" type="text" icon={<CloseOutlined />} aria-label="Thoát chế độ chọn nhiều" onClick={onExit} disabled={isBusy} />
      </Flex>
    </FloatingBar>
  );
}
