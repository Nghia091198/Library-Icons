import { useAsyncResource } from '@/client/common/useAsyncResource';
import {
  getIcon,
  listIconCategories,
  listIcons,
  listIconSets,
  type IconListParams,
} from '@/client/admin/icons/iconAdminService';

export function useIconSets() {
  const resource = useAsyncResource(listIconSets, 'icon-sets');
  return { ...resource, sets: resource.data?.items ?? [] };
}

// refreshKey: đổi giá trị để tải lại số lượng (ví dụ mỗi lần chuyển trang).
export function useIconCategories(refreshKey = 'icon-categories') {
  const resource = useAsyncResource(listIconCategories, refreshKey);
  return { ...resource, categories: resource.data?.items ?? [] };
}

export function useIconList(params: IconListParams) {
  const key = JSON.stringify(params);
  return useAsyncResource(() => listIcons(params), key);
}

export function useIconDetail(iconId: string | null) {
  return useAsyncResource(iconId ? () => getIcon(iconId) : null, iconId ?? 'none');
}
