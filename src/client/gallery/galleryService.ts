import { api } from '@/client/common/apiClient';
import { API_ROUTE } from '@/shared/constants/apiRoutes';

export interface PublicIconListParams {
  categorySlug?: string;
  setId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function publicIconsUrl(params: PublicIconListParams): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(name, String(value));
  }
  return `${API_ROUTE.publicIcons}?${query.toString()}`;
}

// Fetcher chung cho SWR: khoá cache chính là URL của API công khai.
export function fetchPublicJson<TResponse>(url: string): Promise<TResponse> {
  return api.get<TResponse>(url);
}
