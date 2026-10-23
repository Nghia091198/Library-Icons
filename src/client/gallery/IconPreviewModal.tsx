import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, ColorPicker, Flex, Modal, Segmented, Select, Space, Tag, theme, Typography } from 'antd';
import { useState } from 'react';
import { downloadBlob, downloadTextFile } from '@/client/common/clipboard';
import {
  customizeSvg,
  DEFAULT_EXPORT_SIZE,
  EXPORT_SIZES,
  RASTER_FORMAT,
  rasterizeSvg,
  toDataUrl,
  toReactComponent,
  type RasterFormat,
} from '@/client/common/svgExport';
import { toSvgDataUri } from '@/client/common/svgFiles';
import { useCopyToClipboard } from '@/client/common/useCopyToClipboard';
import { useMessage } from '@/client/common/MessageProvider';
import { DARK_COLOR, previewColors } from '@/client/common/darkTheme';
import type { PublicIconDto } from '@/shared/types/icons';

const CODE_FORMAT = { svg: 'SVG', react: 'React', dataUrl: 'Data URL' } as const;
type CodeFormat = (typeof CODE_FORMAT)[keyof typeof CODE_FORMAT];

const MAX_PREVIEW_SIZE = 96;
const SVG_MIME_TYPE = 'image/svg+xml';
const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FILE_EXTENSION: Record<RasterFormat, string> = { [RASTER_FORMAT.png]: 'png', [RASTER_FORMAT.jpeg]: 'jpg' };

interface IconPreviewModalProps {
  icon: PublicIconDto | null;
  setName: string;
  categoryName: string | null;
  onClose: () => void;
}

export function IconPreviewModal({ icon, setName, categoryName, onClose }: IconPreviewModalProps) {
  const { token } = theme.useToken();
  const message = useMessage();
  const copy = useCopyToClipboard();
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<number>(DEFAULT_EXPORT_SIZE);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>(CODE_FORMAT.svg);

  if (!icon) return null;
  const currentIcon = icon;

  const exportedSvg = customizeSvg(icon.svg, { color, size });
  const code = {
    [CODE_FORMAT.svg]: exportedSvg,
    [CODE_FORMAT.react]: toReactComponent(customizeSvg(icon.svg, { color, size }), icon.slug),
    [CODE_FORMAT.dataUrl]: toDataUrl(exportedSvg),
  }[codeFormat];
  const previewSize = Math.min(size, MAX_PREVIEW_SIZE);
  const preview = previewColors(icon.isMulticolor);

  async function downloadRaster(format: RasterFormat) {
    try {
      const blob = await rasterizeSvg(currentIcon.svg, { color, size }, format);
      downloadBlob(`${currentIcon.slug}-${size}.${FILE_EXTENSION[format]}`, blob);
    } catch {
      void message.error('Không tạo được ảnh, thử lại với trình duyệt khác');
    }
  }

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={720}
      title={null}
      destroyOnClose
      styles={{ content: { background: DARK_COLOR.card, border: `1px solid ${DARK_COLOR.cardBorder}` } }}
    >
      <Flex vertical gap={20}>
        <Flex gap={24} wrap align="flex-start">
          <Flex
            align="center"
            justify="center"
            style={{
              width: 136,
              height: 136,
              flex: 'none',
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${DARK_COLOR.cardBorder}`,
              background: preview.surface,
            }}
          >
            <img src={toSvgDataUri(icon.svg, color ?? preview.icon)} width={previewSize} height={previewSize} alt={icon.slug} />
          </Flex>
          <Flex vertical gap={10} style={{ flex: '1 1 300px', minWidth: 0 }}>
            <Flex align="center" gap={8}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {icon.slug}
              </Typography.Title>
              <Button type="text" size="small" icon={<CopyOutlined />} aria-label="Copy tên" onClick={() => void copy(icon.slug, 'Đã copy tên')} />
            </Flex>
            {icon.name !== icon.slug && <Typography.Text type="secondary">{icon.name}</Typography.Text>}
            <Space wrap size={[4, 4]}>
              <Tag>{setName}</Tag>
              {categoryName && <Tag color="blue">{categoryName}</Tag>}
              {icon.tags.map((tag) => (
                <Tag key={tag} bordered={false}>
                  {tag}
                </Tag>
              ))}
            </Space>
          </Flex>
        </Flex>

        <Flex wrap align="center" gap={12} style={{ borderTop: `1px solid ${DARK_COLOR.cardBorder}`, paddingTop: 20 }}>
          <ColorPicker
            allowClear
            value={color}
            onChange={(value) => setColor(value.toHexString())}
            onClear={() => setColor(null)}
            showText={(value) => (color ? value.toHexString() : 'currentColor')}
          />
          <Select
            aria-label="Kích thước"
            value={size}
            onChange={setSize}
            options={EXPORT_SIZES.map((option) => ({ value: option, label: `${option}px` }))}
            style={{ width: 100 }}
          />
          <Space wrap style={{ marginLeft: 'auto' }}>
            <Button type="primary" icon={<CopyOutlined />} onClick={() => void copy(exportedSvg, 'Đã copy mã SVG')}>
              Copy SVG
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => downloadTextFile(`${icon.slug}.svg`, exportedSvg, SVG_MIME_TYPE)}>
              SVG
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => void downloadRaster(RASTER_FORMAT.png)}>
              PNG
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => void downloadRaster(RASTER_FORMAT.jpeg)}>
              JPG
            </Button>
          </Space>
        </Flex>

        <Flex vertical gap={10}>
          <Segmented<CodeFormat> options={Object.values(CODE_FORMAT)} value={codeFormat} onChange={setCodeFormat} />
          <div style={{ position: 'relative' }}>
            <pre
              style={{
                margin: 0,
                padding: '16px 56px 16px 16px',
                maxHeight: 220,
                overflow: 'auto',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${DARK_COLOR.cardBorder}`,
                background: DARK_COLOR.background,
                fontFamily: MONOSPACE,
                fontSize: 12.5,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {code}
            </pre>
            <Button
              icon={<CopyOutlined />}
              aria-label={`Copy mã ${codeFormat}`}
              onClick={() => void copy(code, `Đã copy mã ${codeFormat}`)}
              style={{ position: 'absolute', top: 10, right: 10 }}
            />
          </div>
        </Flex>
      </Flex>
    </Modal>
  );
}
