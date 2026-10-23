import type { IconSetStyle, IconStatus } from '@/shared/constants/icons';
import type { IconDetailDto, IconSetDto, IconSummaryDto } from '@/shared/types/icons';

export type IconSetRecord = IconSetDto;
export type IconRecord = IconDetailDto;
export type IconSummaryRecord = IconSummaryDto;

export interface NewIconSet {
  slug: string;
  name: string;
  description: string;
  style: IconSetStyle;
  strokeWidth: number | null;
}

export type IconSetPatch = Partial<Pick<IconSetRecord, 'name' | 'description'>>;

export type NewIcon = Omit<IconRecord, 'id' | 'createdAt' | 'updatedAt'>;

export type IconPatch = Partial<Omit<IconRecord, 'id' | 'createdAt' | 'updatedAt'>>;

export const ICON_LIST_ORDER = {
  recent: 'recent',
  name: 'name',
} as const;

export type IconListOrder = (typeof ICON_LIST_ORDER)[keyof typeof ICON_LIST_ORDER];

export interface IconListFilter {
  setId?: string;
  categoryId?: string;
  status?: IconStatus;
  activeOnly?: boolean;
  query?: string;
  // Mặc định recent. Luôn kèm id làm tiêu chí phụ để phân trang không lặp hay sót khi trùng giá trị sắp xếp.
  orderBy?: IconListOrder;
  offset: number;
  limit: number;
}

// Biến từ khoá người dùng gõ thành dạng so khớp slug: "Arrow Down" → "arrow-down".
export function toSlugSearchTerm(query: string): string {
  return query.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

export interface IconCategoryRecord {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface IconListPage {
  items: IconSummaryRecord[];
  total: number;
}

export interface AuditEntry {
  entityType: 'icon' | 'icon_set';
  entityId: string;
  action: string;
  actor: string;
  changes: Record<string, unknown>;
}

export const CONFLICT_KIND = {
  slug: 'slug',
  contentHash: 'contentHash',
} as const;

export type ConflictKind = (typeof CONFLICT_KIND)[keyof typeof CONFLICT_KIND];

export class RepositoryConflictError extends Error {
  constructor(readonly kind: ConflictKind) {
    super(`Unique constraint violated: ${kind}`);
    this.name = 'RepositoryConflictError';
  }
}

export interface IconRepository {
  listSets(): Promise<IconSetRecord[]>;
  getSet(id: string): Promise<IconSetRecord | null>;
  createSet(input: NewIconSet): Promise<IconSetRecord>;
  updateSet(id: string, patch: IconSetPatch): Promise<IconSetRecord | null>;

  listCategories(): Promise<IconCategoryRecord[]>;
  // Khoá null = icon chưa có nhóm.
  countIconsByCategory(statuses: IconStatus[]): Promise<Map<string | null, number>>;

  listIcons(filter: IconListFilter): Promise<IconListPage>;
  getIcon(id: string): Promise<IconRecord | null>;
  findIconsInSet(setId: string, match: { slugs: string[]; contentHashes: string[] }): Promise<IconSummaryRecord[]>;
  insertIcon(input: NewIcon): Promise<IconRecord>;
  updateIcon(id: string, patch: IconPatch): Promise<IconRecord | null>;
  deleteIcon(id: string): Promise<boolean>;

  appendAuditLog(entry: AuditEntry): Promise<void>;
}
