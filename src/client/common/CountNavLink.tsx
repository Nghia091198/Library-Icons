import { Typography } from 'antd';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DARK_COLOR } from '@/client/common/darkTheme';

interface CountNavLinkProps {
  to: string;
  label: ReactNode;
  count?: number;
  isActive: boolean;
}

// Mục điều hướng dạng link kèm ô số lượng, dùng cho menu nhóm của gallery và bộ lọc của admin.
export function CountNavLink({ to, label, count, isActive }: CountNavLinkProps) {
  const [isHovered, setHovered] = useState(false);

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        height: 40,
        padding: '0 12px',
        borderRadius: 8,
        color: isActive ? DARK_COLOR.text : DARK_COLOR.textMuted,
        background: isActive ? DARK_COLOR.surfaceRaised : isHovered ? DARK_COLOR.surface : 'transparent',
        fontWeight: isActive ? 600 : 400,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            flex: 'none',
            fontSize: 12,
            lineHeight: '20px',
            padding: '0 8px',
            borderRadius: 10,
            color: isActive ? DARK_COLOR.text : DARK_COLOR.textMuted,
            background: isActive ? DARK_COLOR.primary : DARK_COLOR.surfaceRaised,
          }}
        >
          {count.toLocaleString('en-US')}
        </span>
      )}
    </Link>
  );
}

export function NavSectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography.Text
      type="secondary"
      style={{ display: 'block', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', margin: '16px 12px 6px' }}
    >
      {children}
    </Typography.Text>
  );
}

export const NAV_LIST_STYLE = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
} as const;
