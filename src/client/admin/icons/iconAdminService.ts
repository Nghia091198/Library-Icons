import { api } from '@/client/common/apiClient';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import { BULK_ICON_LIMIT, type BulkIconAction, type IconStatus } from '@/shared/constants/icons';
import type {
  BulkIconRequest,
  BulkIconResponse,
  CreateIconsRequest,
  CreateIconsResponse,
  IconCategoryListResponse,
  IconDetailDto,
  IconListResponse,
  IconSetListResponse,
  PreviewIconsRequest,
  PreviewIconsResponse,
  PublishDraftsRequest,
  PublishDraftsResponse,
  ReplaceIconSvgRequest,
  UpdateIconRequest,
} from '@/shared/types/icons';

export const ICON_STATUS_ACTION = {
  publish: API_ROUTE_TEMPLATE.adminIconPublish,
  archive: API_ROUTE_TEMPLATE.adminIconArchive,
  restore: API_ROUTE_TEMPLATE.adminIconRestore,
} as const;

export type IconStatusAction = keyof typeof ICON_STATUS_ACTION;

export interface IconListParams {
  setId?: string;
  categoryId?: string;
  status?: IconStatus;
  active?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

const iconPath = (id: string) => fillRoute(API_ROUTE_TEMPLATE.adminIcon, { id });

export function listIconSets(): Promise<IconSetListResponse> {
  return api.get<IconSetListResponse>(API_ROUTE.adminIconSets);
}

export function listIconCategories(): Promise<IconCategoryListResponse> {
  return api.get<IconCategoryListResponse>(API_ROUTE.adminIconCategories);
}

export function listIcons(params: IconListParams): Promise<IconListResponse> {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(name, String(value));
  }
  return api.get<IconListResponse>(`${API_ROUTE.adminIcons}?${query.toString()}`);
}

export function getIcon(id: string): Promise<IconDetailDto> {
  return api.get<IconDetailDto>(iconPath(id));
}

export function updateIcon(id: string, body: UpdateIconRequest): Promise<IconDetailDto> {
  return api.patch<IconDetailDto>(iconPath(id), body);
}

export function replaceIconSvg(id: string, body: ReplaceIconSvgRequest): Promise<IconDetailDto> {
  return api.put<IconDetailDto>(fillRoute(API_ROUTE_TEMPLATE.adminIconSvg, { id }), body);
}

export function moveIconToSet(id: string, setId: string): Promise<IconDetailDto> {
  return api.post<IconDetailDto>(fillRoute(API_ROUTE_TEMPLATE.adminIconMoveSet, { id }), { setId });
}

export function changeIconStatus(id: string, action: IconStatusAction): Promise<IconDetailDto> {
  return api.post<IconDetailDto>(fillRoute(ICON_STATUS_ACTION[action], { id }));
}

export async function deleteIcon(id: string): Promise<void> {
  await api.delete<null>(iconPath(id));
}

export function previewIcons(body: PreviewIconsRequest): Promise<PreviewIconsResponse> {
  return api.post<PreviewIconsResponse>(API_ROUTE.adminIconsPreview, body);
}

export function createIcons(body: CreateIconsRequest): Promise<CreateIconsResponse> {
  return api.post<CreateIconsResponse>(API_ROUTE.adminIcons, body);
}

export function publishDrafts(body: PublishDraftsRequest): Promise<PublishDraftsResponse> {
  return api.post<PublishDraftsResponse>(API_ROUTE.adminIconsPublishDrafts, body);
}

// Chia danh sách thành các lô theo giới hạn của server rồi gộp kết quả; chạy tuần tự để không dồn tải.
export async function runBulkIconAction(
  ids: string[],
  action: BulkIconAction,
  categoryId?: string | null,
): Promise<BulkIconResponse> {
  const total: BulkIconResponse = { succeeded: 0, failed: [] };
  for (let start = 0; start < ids.length; start += BULK_ICON_LIMIT) {
    const body: BulkIconRequest = { ids: ids.slice(start, start + BULK_ICON_LIMIT), action, categoryId };
    const result = await api.post<BulkIconResponse>(API_ROUTE.adminIconsBulk, body);
    total.succeeded += result.succeeded;
    total.failed.push(...result.failed);
  }
  return total;
}
