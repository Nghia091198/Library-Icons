import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CLIENT_ROUTE, galleryCategoryPath } from '@/client/common/clientRoutes';
import { GALLERY_COLOR } from '@/client/gallery/galleryTheme';
import type { IconCategoryDto } from '@/shared/types/icons';

const ALL_ICONS_LABEL = 'All Icons';

interface CategoryLinkProps {
  to: string;
  label: string;
  count: number;
  isActive: boolean;
}

function CategoryLink({ to, label, count, isActive }: CategoryLinkProps) {
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
        color: isActive ? GALLERY_COLOR.text : GALLERY_COLOR.textMuted,
        background: isActive ? GALLERY_COLOR.surfaceRaised : isHovered ? GALLERY_COLOR.surface : 'transparent',
        fontWeight: isActive ? 600 : 400,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span
        style={{
          flex: 'none',
          fontSize: 12,
          lineHeight: '20px',
          padding: '0 8px',
          borderRadius: 10,
          color: isActive ? GALLERY_COLOR.text : GALLERY_COLOR.textMuted,
          background: isActive ? GALLERY_COLOR.primary : GALLERY_COLOR.surfaceRaised,
        }}
      >
        {count.toLocaleString('en-US')}
      </span>
    </Link>
  );
}

interface CategoryNavProps {
  categories: IconCategoryDto[];
  totalCount: number;
  activePath: string;
}

export function CategoryNav({ categories, totalCount, activePath }: CategoryNavProps) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <li>
        <CategoryLink
          to={CLIENT_ROUTE.gallery}
          label={ALL_ICONS_LABEL}
          count={totalCount}
          isActive={activePath === CLIENT_ROUTE.gallery}
        />
      </li>
      {categories
        .filter((category) => category.iconCount > 0)
        .map((category) => {
          const path = galleryCategoryPath(category.slug);
          return (
            <li key={category.id}>
              <CategoryLink to={path} label={category.name} count={category.iconCount} isActive={activePath === path} />
            </li>
          );
        })}
    </ul>
  );
}
