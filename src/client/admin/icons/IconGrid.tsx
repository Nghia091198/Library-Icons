import { theme, Typography } from 'antd';
import { toSvgDataUri } from '@/client/common/svgFiles';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { IconSummaryDto } from '@/shared/types/icons';

const TILE_ICON_SIZE = 28;

interface IconGridProps {
  icons: IconSummaryDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function IconGrid({ icons, selectedId, onSelect }: IconGridProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 12 }}>
      {icons.map((icon) => {
        const isSelected = icon.id === selectedId;
        return (
          <button
            key={icon.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(icon.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '16px 8px 12px',
              borderRadius: token.borderRadiusLG,
              border: `${isSelected ? 2 : 1}px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
              margin: isSelected ? 0 : 1,
              background: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
              cursor: 'pointer',
              font: 'inherit',
              opacity: icon.status === ICON_STATUS.archived ? 0.55 : 1,
            }}
          >
            <img src={toSvgDataUri(icon.svg)} width={TILE_ICON_SIZE} height={TILE_ICON_SIZE} alt="" />
            <Typography.Text style={{ fontSize: 13, maxWidth: '100%' }} ellipsis>
              {icon.slug}
            </Typography.Text>
            {icon.status === ICON_STATUS.draft && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Nháp
              </Typography.Text>
            )}
          </button>
        );
      })}
    </div>
  );
}
