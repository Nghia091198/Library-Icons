import type { ReactNode } from 'react';
import { DARK_COLOR } from '@/client/common/darkTheme';

// Khoảng chừa ở đáy trang để thanh nổi không che nội dung cuối cùng.
export const FLOATING_BAR_CLEARANCE = 96;

interface FloatingBarProps {
  label: string;
  children: ReactNode;
}

// Thanh thao tác nổi giữa đáy màn hình (thao tác hàng loạt, lưu icon khi upload).
export function FloatingBar({ label, children }: FloatingBarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: 'max-content',
        maxWidth: 'calc(100vw - 32px)',
        padding: '10px 12px',
        borderRadius: 14,
        border: `1px solid ${DARK_COLOR.border}`,
        background: DARK_COLOR.surfaceRaised,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
      }}
    >
      {children}
    </div>
  );
}
