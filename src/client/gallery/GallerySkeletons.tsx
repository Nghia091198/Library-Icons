import { Flex } from 'antd';
import { DARK_COLOR } from '@/client/common/darkTheme';

// Kích thước khớp IconCard: khung 16:10, thanh 3 nút cao 29px, dòng tên bên dưới.
const ACTION_BAR_HEIGHT = 29;
const NAME_LINE_HEIGHT = 14;

export const ICON_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
  gap: '20px 16px',
} as const;

export function IconCardSkeleton() {
  return (
    <Flex vertical gap={8} aria-hidden="true">
      <div
        style={{
          borderRadius: 8,
          border: `1px solid ${DARK_COLOR.cardBorder}`,
          background: DARK_COLOR.card,
          overflow: 'hidden',
        }}
      >
        <div style={{ aspectRatio: '16 / 10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton-block" style={{ width: 28, height: 28, borderRadius: 6 }} />
        </div>
        <div style={{ height: ACTION_BAR_HEIGHT, borderTop: `1px solid ${DARK_COLOR.cardBorder}` }} />
      </div>
      <div className="skeleton-block" style={{ height: NAME_LINE_HEIGHT, width: '60%', alignSelf: 'center', borderRadius: 4 }} />
    </Flex>
  );
}

export function IconSkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_unused, index) => (
        <IconCardSkeleton key={index} />
      ))}
    </>
  );
}
