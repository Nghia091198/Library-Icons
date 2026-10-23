import { CopyOutlined, DownloadOutlined, FontSizeOutlined } from '@ant-design/icons';
import { Button, Flex, theme, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { downloadTextFile } from '@/client/common/clipboard';
import { toSvgDataUri } from '@/client/common/svgFiles';
import { useCopyToClipboard } from '@/client/common/useCopyToClipboard';
import { DARK_COLOR, previewColors } from '@/client/common/darkTheme';
import type { PublicIconDto } from '@/shared/types/icons';

const PREVIEW_ICON_SIZE = 28;
const COLORED_TILE_SIZE = 52;
const SVG_MIME_TYPE = 'image/svg+xml';

interface IconCardProps {
  icon: PublicIconDto;
  onOpen: (icon: PublicIconDto) => void;
}

export function IconCard({ icon, onOpen }: IconCardProps) {
  const { token } = theme.useToken();
  const copy = useCopyToClipboard();
  const [isHovered, setHovered] = useState(false);

  return (
    <Flex vertical gap={8} align="stretch">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${isHovered ? token.colorPrimary : DARK_COLOR.cardBorder}`,
          background: DARK_COLOR.card,
          boxShadow: isHovered ? `0 0 0 3px ${token.colorPrimaryBg}` : 'none',
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <button
          type="button"
          onClick={() => onOpen(icon)}
          aria-label={`Xem chi tiết ${icon.slug}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            aspectRatio: '16 / 10',
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: COLORED_TILE_SIZE,
              height: COLORED_TILE_SIZE,
              borderRadius: 10,
              background: icon.isMulticolor ? DARK_COLOR.coloredIconSurface : 'transparent',
            }}
          >
            <img
              src={toSvgDataUri(icon.svg, previewColors(icon.isMulticolor).icon)}
              width={PREVIEW_ICON_SIZE}
              height={PREVIEW_ICON_SIZE}
              alt=""
            />
          </span>
        </button>
        <Flex justify="space-around" style={{ borderTop: `1px solid ${DARK_COLOR.cardBorder}`, padding: '2px 4px' }}>
          <Tooltip title="Copy SVG">
            <Button type="text" size="small" icon={<CopyOutlined />} aria-label={`Copy SVG ${icon.slug}`} onClick={() => void copy(icon.svg, 'Đã copy mã SVG')} />
          </Tooltip>
          <Tooltip title="Tải SVG">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              aria-label={`Tải SVG ${icon.slug}`}
              onClick={() => downloadTextFile(`${icon.slug}.svg`, icon.svg, SVG_MIME_TYPE)}
            />
          </Tooltip>
          <Tooltip title="Copy tên">
            <Button type="text" size="small" icon={<FontSizeOutlined />} aria-label={`Copy tên ${icon.slug}`} onClick={() => void copy(icon.slug, 'Đã copy tên')} />
          </Tooltip>
        </Flex>
      </div>
      <Typography.Text style={{ textAlign: 'center', fontSize: 13 }} ellipsis={{ tooltip: icon.slug }}>
        {icon.slug}
      </Typography.Text>
    </Flex>
  );
}
