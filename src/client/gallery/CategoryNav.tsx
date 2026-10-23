import { CLIENT_ROUTE, galleryCategoryPath } from '@/client/common/clientRoutes';
import { CountNavLink, NAV_LIST_STYLE } from '@/client/common/CountNavLink';
import type { IconCategoryDto } from '@/shared/types/icons';

const ALL_ICONS_LABEL = 'All Icons';

interface CategoryNavProps {
  categories: IconCategoryDto[];
  totalCount: number;
  activePath: string;
}

export function CategoryNav({ categories, totalCount, activePath }: CategoryNavProps) {
  return (
    <ul style={{ ...NAV_LIST_STYLE, padding: '12px 8px' }}>
      <li>
        <CountNavLink
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
              <CountNavLink to={path} label={category.name} count={category.iconCount} isActive={activePath === path} />
            </li>
          );
        })}
    </ul>
  );
}
