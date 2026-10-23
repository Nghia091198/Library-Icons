import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Flex, Form, Input, Modal, Popconfirm, Select, Skeleton, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useAdminIconDetail } from '@/client/admin/icons/adminData';
import {
  changeIconStatus,
  deleteIcon,
  moveIconToSet,
  replaceIconSvg,
  updateIcon,
  type IconStatusAction,
} from '@/client/admin/icons/iconAdminService';
import { StatusDot } from '@/client/admin/icons/iconStatusStyle';
import { describeApiError, ICON_STATUS_LABEL } from '@/client/admin/icons/iconTexts';
import { ReplaceSvgModal } from '@/client/admin/icons/ReplaceSvgModal';
import { copyText, downloadTextFile } from '@/client/common/clipboard';
import { DARK_COLOR, previewColors } from '@/client/common/darkTheme';
import { useMessage } from '@/client/common/MessageProvider';
import { toSvgDataUri } from '@/client/common/svgFiles';
import { ICON_STATUS, isValidSlug } from '@/shared/constants/icons';
import type { IconCategoryDto, IconDetailDto, IconSetDto, SvgSourceInput } from '@/shared/types/icons';

const PREVIEW_SIZES = [16, 24, 40, 64];
const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const SVG_MIME_TYPE = 'image/svg+xml';

interface IconFormValues {
  name: string;
  slug: string;
  categoryId?: string;
  description: string;
  tags: string[];
  useCases: string[];
  aliases: string[];
}

interface IconDetailPanelProps {
  iconId: string | null;
  sets: IconSetDto[];
  categories: IconCategoryDto[];
  onChanged: (icon: IconDetailDto) => void;
  onDeleted: (iconId: string) => void;
}

function toFormValues(icon: IconDetailDto): IconFormValues {
  return {
    name: icon.name,
    slug: icon.slug,
    categoryId: icon.categoryId ?? undefined,
    description: icon.description,
    tags: icon.tags,
    useCases: icon.useCases,
    aliases: icon.aliases,
  };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>
      {children}
    </Typography.Text>
  );
}

export function IconDetailPanel({ iconId, sets, categories, onChanged, onDeleted }: IconDetailPanelProps) {
  const message = useMessage();
  const [form] = Form.useForm<IconFormValues>();
  const detail = useAdminIconDetail(iconId);
  const icon = detail.data;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isReplaceOpen, setReplaceOpen] = useState(false);
  // Dạng hook thay vì Modal.confirm tĩnh, để hộp xác nhận theo theme tối của ConfigProvider.
  const [modal, modalHolder] = Modal.useModal();

  useEffect(() => {
    if (icon) form.setFieldsValue(toFormValues(icon));
  }, [icon, form]);

  if (!iconId) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Flex vertical gap={4}>
              <Typography.Text>Chọn một icon để xem và chỉnh sửa</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Lọc theo trạng thái, bộ, nhóm ở cột bên trái
              </Typography.Text>
            </Flex>
          }
        />
      </Card>
    );
  }
  if (!icon) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const currentIcon = icon;
  const colors = previewColors(icon.isMulticolor);
  const isSlugLocked = icon.publishedAt !== null;

  async function run(action: string, task: () => Promise<IconDetailDto>, successText: string): Promise<boolean> {
    setBusyAction(action);
    try {
      const updated = await task();
      await detail.mutate(updated, { revalidate: false });
      onChanged(updated);
      void message.success(successText);
      return true;
    } catch (error) {
      void message.error(describeApiError(error));
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  const changeStatus = (action: IconStatusAction, successText: string) =>
    run(action, () => changeIconStatus(currentIcon.id, action), successText);

  async function removeDraft() {
    setBusyAction('delete');
    try {
      await deleteIcon(currentIcon.id);
      void message.success('Đã xoá bản nháp');
      onDeleted(currentIcon.id);
    } catch (error) {
      void message.error(describeApiError(error));
    } finally {
      setBusyAction(null);
    }
  }

  function confirmMoveToSet(setId: string) {
    const target = sets.find((set) => set.id === setId);
    if (!target || setId === currentIcon.setId) return;
    modal.confirm({
      title: `Chuyển sang bộ ${target.name}?`,
      content: 'Hình sẽ được chuẩn hoá lại từ mã gốc theo quy tắc của bộ mới (ví dụ Multi Color giữ màu gốc). Slug, nhóm và trạng thái giữ nguyên.',
      okText: 'Chuyển bộ',
      cancelText: 'Huỷ',
      onOk: () => run('move', () => moveIconToSet(currentIcon.id, setId), `Đã chuyển sang ${target.name}`),
    });
  }

  function replaceSvg(source: SvgSourceInput) {
    void run('replace', () => replaceIconSvg(currentIcon.id, { source }), 'Đã thay hình vẽ').then((succeeded) => {
      if (succeeded) setReplaceOpen(false);
    });
  }

  async function copy(text: string, successText: string) {
    if (await copyText(text)) void message.success(successText);
    else void message.error('Trình duyệt không cho phép copy, hãy copy thủ công');
  }

  return (
    <Card
      title={
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <Typography.Text strong ellipsis style={{ fontSize: 16 }}>
            {icon.name}
          </Typography.Text>
        </Flex>
      }
      extra={
        <Flex align="center" gap={6} style={{ fontSize: 13, color: DARK_COLOR.textMuted }}>
          <StatusDot status={icon.status} />
          {ICON_STATUS_LABEL[icon.status]}
        </Flex>
      }
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: 20 } }}
    >
      <Flex
        align="flex-end"
        justify="center"
        gap={20}
        style={{ padding: 24, borderRadius: 10, background: colors.surface, border: `1px solid ${DARK_COLOR.cardBorder}` }}
      >
        {PREVIEW_SIZES.map((size) => (
          <img key={size} src={toSvgDataUri(icon.svg, colors.icon)} width={size} height={size} alt={`${icon.slug} cỡ ${size}`} />
        ))}
      </Flex>

      <Flex wrap gap={8}>
        <Button icon={<CopyOutlined />} onClick={() => void copy(icon.svg, 'Đã copy mã SVG')}>
          SVG
        </Button>
        <Button icon={<CopyOutlined />} onClick={() => void copy(icon.slug, 'Đã copy slug')}>
          Slug
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTextFile(`${icon.slug}.svg`, icon.svg, SVG_MIME_TYPE)}>
          Tải
        </Button>
        <Button onClick={() => setReplaceOpen(true)} style={{ marginLeft: 'auto' }}>
          Thay SVG
        </Button>
      </Flex>

      <Flex vertical gap={8}>
        <SectionTitle>Phân loại</SectionTitle>
        <Select
          aria-label="Bộ"
          value={icon.setId}
          loading={busyAction === 'move'}
          onChange={confirmMoveToSet}
          options={sets.map((set) => ({ value: set.id, label: `Bộ: ${set.name}` }))}
        />
      </Flex>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          void run('save', () => updateIcon(currentIcon.id, { ...values, categoryId: values.categoryId ?? null }), 'Đã lưu thay đổi')
        }
      >
        <Form.Item name="categoryId" label="Nhóm">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chưa có nhóm"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
        </Form.Item>
        <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, whitespace: true, message: 'Nhập tên icon' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="slug"
          label="Slug"
          extra={isSlugLocked ? 'Đã publish nên không đổi được slug. Thêm alias nếu cần tên khác.' : undefined}
          rules={[
            {
              validator: (_rule, value: string) =>
                isValidSlug(value) ? Promise.resolve() : Promise.reject(new Error('Chỉ dùng chữ thường, số và dấu gạch ngang')),
            },
          ]}
        >
          <Input disabled={isSlugLocked} style={{ fontFamily: MONOSPACE }} />
        </Form.Item>
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" tokenSeparators={[',']} placeholder="giỏ hàng, shopping…" open={false} />
        </Form.Item>
        <Form.Item name="useCases" label="Dùng khi nào">
          <Select mode="tags" tokenSeparators={[',']} placeholder="header, nút thêm vào giỏ…" open={false} />
        </Form.Item>
        <Form.Item
          name="aliases"
          label="Alias"
          extra="Tên khác vẫn trỏ về icon này, dùng khi đổi tên sau khi đã publish."
          rules={[
            {
              validator: (_rule, values: string[] = []) =>
                values.every(isValidSlug) ? Promise.resolve() : Promise.reject(new Error('Alias phải có dạng slug')),
            },
          ]}
        >
          <Select mode="tags" tokenSeparators={[',', ' ']} open={false} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>

      <Flex wrap gap={8} style={{ borderTop: `1px solid ${DARK_COLOR.border}`, paddingTop: 16 }}>
        <Space wrap>
          {icon.status === ICON_STATUS.draft && icon.publishedAt === null && (
            <Popconfirm title="Xoá bản nháp này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => void removeDraft()}>
              <Button danger loading={busyAction === 'delete'}>
                Xoá
              </Button>
            </Popconfirm>
          )}
          {icon.status === ICON_STATUS.published && (
            <Popconfirm
              title="Lưu trữ icon này?"
              description="Icon sẽ ẩn khỏi gallery và API, slug vẫn được giữ."
              okText="Lưu trữ"
              cancelText="Huỷ"
              onConfirm={() => void changeStatus('archive', 'Đã lưu trữ')}
            >
              <Button danger loading={busyAction === 'archive'}>
                Lưu trữ
              </Button>
            </Popconfirm>
          )}
          {icon.status === ICON_STATUS.archived && (
            <Button loading={busyAction === 'restore'} onClick={() => void changeStatus('restore', 'Đã khôi phục')}>
              Khôi phục
            </Button>
          )}
        </Space>
        <Space wrap style={{ marginLeft: 'auto' }}>
          {icon.status === ICON_STATUS.draft && (
            <Button loading={busyAction === 'publish'} onClick={() => void changeStatus('publish', 'Đã publish')}>
              Publish
            </Button>
          )}
          <Button type="primary" loading={busyAction === 'save'} onClick={() => form.submit()}>
            Lưu
          </Button>
        </Space>
      </Flex>

      <ReplaceSvgModal
        open={isReplaceOpen}
        submitting={busyAction === 'replace'}
        onCancel={() => setReplaceOpen(false)}
        onSubmit={replaceSvg}
      />
      {modalHolder}
    </Card>
  );
}
