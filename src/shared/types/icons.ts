import type { ErrorCode } from '@/shared/constants/errorCodes';
import type {
  BulkIconAction,
  CreatableIconStatus,
  IconSetStyle,
  IconStatus,
  StyleReason,
  SvgIssueCode,
  SvgIssueSeverity,
} from '@/shared/constants/icons';

export interface SvgIssue {
  code: SvgIssueCode;
  severity: SvgIssueSeverity;
  message: string;
  detail?: string;
  line?: number;
}

export interface IconCandidate {
  index: number;
  sourceId: string | null;
  suggestedSlug: string;
  line: number | null;
  detectedStyle: IconSetStyle | null;
  styleReason: StyleReason | null;
  setId: string | null;
  svg: string | null;
  contentHash: string | null;
  isMulticolor: boolean;
  isValid: boolean;
  issues: SvgIssue[];
}

export interface SvgSourceResult {
  sourceName: string | null;
  issues: SvgIssue[];
  candidates: IconCandidate[];
}

export interface SvgSourceInput {
  name?: string | null;
  text: string;
}

export interface IconSetDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  style: IconSetStyle;
  strokeWidth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IconSetListResponse {
  items: IconSetDto[];
}

export interface IconCategoryDto {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  iconCount: number;
}

export interface IconCategoryListResponse {
  items: IconCategoryDto[];
  totalCount: number;
  uncategorizedCount: number;
}

// Dữ liệu icon trả ra công khai: chỉ những gì merchant cần để xem, copy và tải.
export interface PublicIconDto {
  id: string;
  slug: string;
  name: string;
  setId: string;
  categoryId: string | null;
  svg: string;
  tags: string[];
  isMulticolor: boolean;
}

export interface PublicIconListResponse {
  items: PublicIconDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublishDraftsRequest {
  setId?: string;
  categoryId?: string;
}

// Số liệu cho sidebar admin: theo trạng thái (gồm cả lưu trữ) và theo bộ (không tính icon đã lưu trữ).
export interface AdminIconStatsResponse {
  total: number;
  byStatus: Record<IconStatus, number>;
  bySet: Array<{ setId: string; count: number }>;
}

export interface BulkIconRequest {
  ids: string[];
  action: BulkIconAction;
  // Chỉ dùng với action setCategory; null = bỏ nhóm.
  categoryId?: string | null;
}

export interface BulkIconResponse {
  succeeded: number;
  failed: Array<{ id: string; code: ErrorCode; message: string }>;
}

export interface PublishDraftsResponse {
  published: number;
}

export interface CreateIconSetRequest {
  slug: string;
  name: string;
  description?: string;
  style: IconSetStyle;
  strokeWidth?: number | null;
}

export interface UpdateIconSetRequest {
  name?: string;
  description?: string;
}

export interface IconSummaryDto {
  id: string;
  setId: string;
  categoryId: string | null;
  slug: string;
  name: string;
  description: string;
  svg: string;
  contentHash: string;
  tags: string[];
  useCases: string[];
  aliases: string[];
  isMulticolor: boolean;
  status: IconStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IconDetailDto extends IconSummaryDto {
  sourceSvg: string;
}

export interface IconListResponse {
  items: IconSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IconConflict {
  iconId: string;
  slug: string;
}

export interface PreviewCandidate extends IconCandidate {
  slugTakenBy: IconConflict | null;
  duplicateOf: IconConflict | null;
}

export interface PreviewSourceResult extends Omit<SvgSourceResult, 'candidates'> {
  candidates: PreviewCandidate[];
}

// setOverrides: vị trí icon trong nguồn (dạng chuỗi) → id bộ icon người dùng chọn thay cho bộ tự nhận.
export interface PreviewSourceInput extends SvgSourceInput {
  setOverrides?: Record<string, string>;
}

export interface PreviewIconsRequest {
  sources: PreviewSourceInput[];
}

export interface PreviewIconsResponse {
  sources: PreviewSourceResult[];
}

export interface CreateIconItem {
  source: SvgSourceInput;
  candidateIndex: number;
  setId: string;
  categoryId?: string | null;
  slug: string;
  name?: string;
  tags?: string[];
  useCases?: string[];
}

export interface CreateIconsRequest {
  status: CreatableIconStatus;
  items: CreateIconItem[];
}

export interface CreateIconError {
  code: ErrorCode;
  message: string;
}

export type CreateIconResult =
  | { index: number; ok: true; icon: IconSummaryDto }
  | { index: number; ok: false; error: CreateIconError };

export interface CreateIconsResponse {
  results: CreateIconResult[];
}

export interface UpdateIconRequest {
  slug?: string;
  categoryId?: string | null;
  name?: string;
  description?: string;
  tags?: string[];
  useCases?: string[];
  aliases?: string[];
}

export interface ReplaceIconSvgRequest {
  source: SvgSourceInput;
  candidateIndex?: number;
}

export interface MoveIconSetRequest {
  setId: string;
}
