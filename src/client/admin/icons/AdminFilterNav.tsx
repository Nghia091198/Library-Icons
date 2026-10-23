import { useAdminCategories, useAdminSets, useAdminStats } from '@/client/admin/icons/adminData';
import { StatusDot } from '@/client/admin/icons/iconStatusStyle';
import { ICON_STATUS_LABEL } from '@/client/admin/icons/iconTexts';
import { ADMIN_FILTER_PARAM, useAdminFilters } from '@/client/admin/icons/useAdminFilters';
import { CountNavLink, NAV_LIST_STYLE, NavSectionTitle } from '@/client/common/CountNavLink';
import { NavSkeleton } from '@/client/common/NavSkeleton';
import { ICON_STATUS } from '@/shared/constants/icons';

const SKELETON_ROWS = 10;
const STATUS_ORDER = [ICON_STATUS.draft, ICON_STATUS.published, ICON_STATUS.archived] as const;

export function AdminFilterNav() {
  const { filters, hrefWith } = useAdminFilters();
  const { stats, isLoading } = useAdminStats();
  const { sets } = useAdminSets();
  const { categories } = useAdminCategories();

  if (isLoading && !stats) return <NavSkeleton count={SKELETON_ROWS} />;

  const setCount = (setId: string) => stats?.bySet.find((entry) => entry.setId === setId)?.count ?? 0;
  // Đổi bộ lọc thì bỏ icon đang chọn, vì icon đó có thể không còn nằm trong danh sách mới.
  const filterHref = (param: string, value: string | undefined) => hrefWith({ [param]: value, [ADMIN_FILTER_PARAM.icon]: undefined });

  return (
    <nav aria-label="Bộ lọc icon" style={{ padding: '4px 8px 16px' }}>
      <NavSectionTitle>Trạng thái</NavSectionTitle>
      <ul style={NAV_LIST_STYLE}>
        <li>
          <CountNavLink
            to={filterHref(ADMIN_FILTER_PARAM.status, undefined)}
            label="Tất cả"
            count={stats?.total}
            isActive={!filters.status}
          />
        </li>
        {STATUS_ORDER.map((status) => (
          <li key={status}>
            <CountNavLink
              to={filterHref(ADMIN_FILTER_PARAM.status, status)}
              label={
                <>
                  <StatusDot status={status} />
                  {ICON_STATUS_LABEL[status]}
                </>
              }
              count={stats?.byStatus[status]}
              isActive={filters.status === status}
            />
          </li>
        ))}
      </ul>

      <NavSectionTitle>Bộ</NavSectionTitle>
      <ul style={NAV_LIST_STYLE}>
        <li>
          <CountNavLink to={filterHref(ADMIN_FILTER_PARAM.set, undefined)} label="Tất cả bộ" isActive={!filters.setId} />
        </li>
        {sets.map((set) => (
          <li key={set.id}>
            <CountNavLink
              to={filterHref(ADMIN_FILTER_PARAM.set, set.id)}
              label={set.name}
              count={setCount(set.id)}
              isActive={filters.setId === set.id}
            />
          </li>
        ))}
      </ul>

      <NavSectionTitle>Nhóm</NavSectionTitle>
      <ul style={NAV_LIST_STYLE}>
        <li>
          <CountNavLink to={filterHref(ADMIN_FILTER_PARAM.category, undefined)} label="Tất cả nhóm" isActive={!filters.categoryId} />
        </li>
        {categories
          .filter((category) => category.iconCount > 0)
          .map((category) => (
            <li key={category.id}>
              <CountNavLink
                to={filterHref(ADMIN_FILTER_PARAM.category, category.id)}
                label={category.name}
                count={category.iconCount}
                isActive={filters.categoryId === category.id}
              />
            </li>
          ))}
      </ul>
    </nav>
  );
}
