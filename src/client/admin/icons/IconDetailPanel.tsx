import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Flex, Form, Input, Popconfirm, Select, Skeleton, Space, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import {
  changeIconStatus,
  deleteIcon,
  replaceIconSvg,
  updateIcon,
  type IconStatusAction,
} from '@/client/admin/icons/iconAdminService';
import { describeApiError } from '@/client/admin/icons/iconTexts';
import { IconStatusTag } from '@/client/admin/icons/IconStatusTag';
import { ReplaceSvgModal } from '@/client/admin/icons/ReplaceSvgModal';
import { useIconDetail } from '@/client/admin/icons/useIcons';
import { copyText, downloadTextFile } from '@/client/common/clipboard';
import { useMessage } from '@/client/common/MessageProvider';
import { toSvgDataUri } from '@/client/common/svgFiles';
import { ICON_STATUS, isValidSlug } from '@/shared/constants/icons';
import type { IconCategoryDto, IconDetailDto, SvgSourceInput } from '@/shared/types/icons';

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
  setName: (setId: string) => string;
  categories: IconCategoryDto[];
  onChanged: () => void;
  onDeleted: () => void;
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

export function IconDetailPanel({ iconId, setName, categories, onChanged, onDeleted }: IconDetailPanelProps) {
  const { token } = theme.useToken();
  const message = useMessage();
  const [form] = Form.useForm<IconFormValues>();
  const detail = useIconDetail(iconId);
  const icon = detail.data;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isReplaceOpen, setReplaceOpen] = useState(false);

  useEffect(() => {
    if (icon) form.setFieldsValue(toFormValues(icon));
  }, [icon, form]);

  if (!iconId) {
    return (
      <Card>
        <Empty description="Chọn một icon để xem và chỉnh sửa" />
      </Card>
    );
  }
  if (!icon) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }

  async function run(action: string, task: () => Promise<IconDetailDto>, successText: string): Promise<boolean> {
    setBusyAction(action);
    try {
      detail.setData(await task());
      onChanged();
      void message.success(successText);
      return true;
    } catch (error) {
      void message.error(describeApiError(error));
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  const currentIcon = icon;
  const changeStatus = (action: IconStatusAction, successText: string) =>
    run(action, () => changeIconStatus(currentIcon.id, action), successText);

  async function removeDraft() {
    setBusyAction('delete');
    try {
      await deleteIcon(currentIcon.id);
      void message.success('Đã xoá bản nháp');
      onDeleted();
    } catch (error) {
      void message.error(describeApiError(error));
      setBusyAction(null);
    }
  }

  function replaceSvg(source: SvgSourceInput) {
    void run('replace', () => replaceIconSvg(currentIcon.id, { source }), 'Đã thay hình vẽ').then((succeeded) => {
      if (succeeded) setReplaceOpen(false);
    });
  }

  const isSlugLocked = icon.publishedAt !== null;

  async function copy(text: string, successText: string) {
    if (await copyText(text)) void message.success(successText);
    else void message.error('Trình duyệt không cho phép copy, hãy copy thủ công');
  }

  return (
    <Card
      title={icon.name}
      extra={<IconStatusTag status={icon.status} />}
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: 20 } }}
    >
      <Flex
        align="flex-end"
        justify="center"
        gap={20}
        style={{ padding: 24, background: token.colorFillQuaternary, borderRadius: token.borderRadiusLG }}
      >
        {PREVIEW_SIZES.map((size, index) => (
          <img
            key={size}
            src={toSvgDataUri(icon.svg, index === PREVIEW_SIZES.length - 1 ? token.colorPrimary : token.colorText)}
            width={size}
            height={size}
            alt={`${icon.slug} cỡ ${size}`}
          />
        ))}
      </Flex>

      <Space wrap>
        <Button icon={<CopyOutlined />} onClick={() => void copy(icon.svg, 'Đã copy mã SVG')}>
          Copy SVG
        </Button>
        <Button icon={<CopyOutlined />} onClick={() => void copy(icon.slug, 'Đã copy slug')}>
          Copy slug
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTextFile(`${icon.slug}.svg`, icon.svg, SVG_MIME_TYPE)}>
          Tải SVG
        </Button>
      </Space>

      <Typography.Text type="secondary">Bộ: {setName(icon.setId)}</Typography.Text>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          void run('save', () => updateIcon(currentIcon.id, { ...values, categoryId: values.categoryId ?? null }), 'Đã lưu thay đổi')
        }
      >
        <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, whitespace: true, message: 'Nhập tên icon' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="categoryId" label="Nhóm">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chưa có nhóm"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
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

      <Flex wrap gap={8} style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 16 }}>
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
          <Button onClick={() => setReplaceOpen(true)}>Thay SVG</Button>
          {icon.status === ICON_STATUS.draft && (
            <Button loading={busyAction === 'publish'} onClick={() => void changeStatus('publish', 'Đã publish')}>
              Publish
            </Button>
          )}
          <Button type="primary" loading={busyAction === 'save'} onClick={() => form.submit()}>
            Lưu thay đổi
          </Button>
        </Space>
      </Flex>

      <ReplaceSvgModal
        open={isReplaceOpen}
        submitting={busyAction === 'replace'}
        onCancel={() => setReplaceOpen(false)}
        onSubmit={replaceSvg}
      />
    </Card>
  );
}
