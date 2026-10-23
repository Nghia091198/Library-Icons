import { Flex, Typography } from 'antd';
import { memo, useState } from 'react';
import { StatusDot } from '@/client/admin/icons/iconStatusStyle';
import { ICON_STATUS_LABEL } from '@/client/admin/icons/iconTexts';
import { DARK_COLOR, previewColors } from '@/client/common/darkTheme';
import { toSvgDataUri } from '@/client/common/svgFiles';
import type { IconSummaryDto } from '@/shared/types/icons';

const PREVIEW_ICON_SIZE = 28;
const COLORED_TILE_SIZE = 48;
const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const ADMIN_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
  gap: '16px 12px',
} as const;

interface AdminIconTileProps {
  icon: IconSummaryDto;
  isSelected: boolean;
  onSelect: (iconId: string) => void;
}

// memo: lưới có thể tới hàng nghìn thẻ; chọn một icon chỉ vẽ lại hai thẻ đổi trạng thái chọn.
export const AdminIconTile = memo(function AdminIconTile({ icon, isSelected, onSelect }: AdminIconTileProps) {
  const [isHovered, setHovered] = useState(false);
  const colors = previewColors(icon.isMulticolor);
  const borderColor = isSelected ? DARK_COLOR.primary : isHovered ? DARK_COLOR.border : DARK_COLOR.cardBorder;

  return (
    <Flex vertical gap={6} style={{ minWidth: 0 }}>
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`${icon.name} (${ICON_STATUS_LABEL[icon.status]})`}
        onClick={() => onSelect(icon.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          borderRadius: 10,
          border: `1px solid ${borderColor}`,
          boxShadow: isSelected ? `0 0 0 3px ${DARK_COLOR.primary}55` : 'none',
          background: DARK_COLOR.card,
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ position: 'absolute', top: 8, left: 8, display: 'flex' }}>
          <StatusDot status={icon.status} />
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: COLORED_TILE_SIZE,
            height: COLORED_TILE_SIZE,
            borderRadius: 10,
            background: icon.isMulticolor ? colors.surface : 'transparent',
          }}
        >
          <img src={toSvgDataUri(icon.svg, colors.icon)} width={PREVIEW_ICON_SIZE} height={PREVIEW_ICON_SIZE} alt="" loading="lazy" />
        </span>
      </button>
      <Typography.Text
        ellipsis={{ tooltip: icon.slug }}
        style={{ fontSize: 12, fontFamily: MONOSPACE, color: isSelected ? DARK_COLOR.text : DARK_COLOR.textMuted, textAlign: 'center' }}
      >
        {icon.slug}
      </Typography.Text>
    </Flex>
  );
});

function AdminIconTileSkeleton() {
  return (
    <Flex vertical gap={6} aria-hidden="true">
      <div
        style={{
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          border: `1px solid ${DARK_COLOR.cardBorder}`,
          background: DARK_COLOR.card,
        }}
      >
        <div className="skeleton-block" style={{ width: PREVIEW_ICON_SIZE, height: PREVIEW_ICON_SIZE, borderRadius: 6 }} />
      </div>
      <div className="skeleton-block" style={{ height: 12, width: '70%', alignSelf: 'center', borderRadius: 4 }} />
    </Flex>
  );
}

export function AdminIconTileSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_unused, index) => (
        <AdminIconTileSkeleton key={index} />
      ))}
    </>
  );
}
