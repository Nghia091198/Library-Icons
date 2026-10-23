import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  CONFLICT_KIND,
  ICON_LIST_ORDER,
  RepositoryConflictError,
  toSlugSearchTerm,
  type AuditEntry,
  type IconListFilter,
  type IconListPage,
  type IconPatch,
  type IconRecord,
  type IconRepository,
  type IconSetPatch,
  type IconSetRecord,
  type IconSummaryRecord,
  type NewIcon,
  type NewIconSet,
} from '@/server/icons/iconRepository';
import { ICON_SET_STYLE, ICON_STATUS } from '@/shared/constants/icons';

const UNIQUE_VIOLATION = '23505';
const ICON_SET_COLUMNS = 'id, slug, name, description, style, stroke_width, created_at, updated_at';
const ICON_SUMMARY_COLUMNS =
  'id, set_id, category_id, slug, name, description, svg, content_hash, tags, use_cases, aliases, is_multicolor, status, published_at, created_at, updated_at';
const ICON_DETAIL_COLUMNS = `${ICON_SUMMARY_COLUMNS}, source_svg`;
const ICON_CATEGORY_COLUMNS = 'id, slug, name, sort_order';

const ICON_COLUMN_BY_FIELD = {
  setId: 'set_id',
  categoryId: 'category_id',
  slug: 'slug',
  name: 'name',
  description: 'description',
  svg: 'svg',
  sourceSvg: 'source_svg',
  contentHash: 'content_hash',
  tags: 'tags',
  useCases: 'use_cases',
  aliases: 'aliases',
  isMulticolor: 'is_multicolor',
  status: 'status',
  publishedAt: 'published_at',
} as const satisfies Record<keyof IconPatch, string>;

const iconSetRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  style: z.nativeEnum(ICON_SET_STYLE),
  stroke_width: z.coerce.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const iconSummaryRowSchema = z.object({
  id: z.string(),
  set_id: z.string(),
  category_id: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  svg: z.string(),
  content_hash: z.string(),
  tags: z.array(z.string()),
  use_cases: z.array(z.string()),
  aliases: z.array(z.string()),
  is_multicolor: z.boolean(),
  status: z.nativeEnum(ICON_STATUS),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const iconDetailRowSchema = iconSummaryRowSchema.extend({ source_svg: z.string() });

const iconCategoryRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  sort_order: z.coerce.number(),
});

const categoryCountRowSchema = z.object({
  category_id: z.string().nullable(),
  icon_count: z.coerce.number(),
});

function toIconSet(row: z.infer<typeof iconSetRowSchema>): IconSetRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    style: row.style,
    strokeWidth: row.stroke_width,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIconSummary(row: z.infer<typeof iconSummaryRowSchema>): IconSummaryRecord {
  return {
    id: row.id,
    setId: row.set_id,
    categoryId: row.category_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    svg: row.svg,
    contentHash: row.content_hash,
    tags: row.tags,
    useCases: row.use_cases,
    aliases: row.aliases,
    isMulticolor: row.is_multicolor,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIcon(row: z.infer<typeof iconDetailRowSchema>): IconRecord {
  return { ...toIconSummary(row), sourceSvg: row.source_svg };
}

function toIconColumns(patch: IconPatch): Record<string, unknown> {
  const entries = Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([field, value]) => [ICON_COLUMN_BY_FIELD[field as keyof IconPatch], value]);
  return Object.fromEntries(entries);
}

function throwIfFailed(error: PostgrestError | null): void {
  if (!error) return;
  if (error.code === UNIQUE_VIOLATION) {
    throw new RepositoryConflictError(error.message.includes('content_hash') ? CONFLICT_KIND.contentHash : CONFLICT_KIND.slug);
  }
  throw new Error(`Database error ${error.code}: ${error.message}`);
}

// Bỏ ký tự có nghĩa trong cú pháp filter của PostgREST để từ khoá tìm kiếm không phá được câu truy vấn.
function toSafeSearchTerm(query: string): string {
  return query.replace(/[,()*%\\:."']/g, ' ').trim();
}

export function createSupabaseIconRepository(supabase: SupabaseClient): IconRepository {
  return {
    async listSets() {
      const { data, error } = await supabase.from('icon_sets').select(ICON_SET_COLUMNS).order('created_at');
      throwIfFailed(error);
      return z.array(iconSetRowSchema).parse(data).map(toIconSet);
    },

    async getSet(id) {
      const { data, error } = await supabase.from('icon_sets').select(ICON_SET_COLUMNS).eq('id', id).maybeSingle();
      throwIfFailed(error);
      return data ? toIconSet(iconSetRowSchema.parse(data)) : null;
    },

    async createSet(input: NewIconSet) {
      const { data, error } = await supabase
        .from('icon_sets')
        .insert({
          slug: input.slug,
          name: input.name,
          description: input.description,
          style: input.style,
          stroke_width: input.strokeWidth,
        })
        .select(ICON_SET_COLUMNS)
        .single();
      throwIfFailed(error);
      return toIconSet(iconSetRowSchema.parse(data));
    },

    async updateSet(id: string, patch: IconSetPatch) {
      const { data, error } = await supabase
        .from('icon_sets')
        .update(patch)
        .eq('id', id)
        .select(ICON_SET_COLUMNS)
        .maybeSingle();
      throwIfFailed(error);
      return data ? toIconSet(iconSetRowSchema.parse(data)) : null;
    },

    async listCategories() {
      const { data, error } = await supabase.from('icon_categories').select(ICON_CATEGORY_COLUMNS).order('sort_order');
      throwIfFailed(error);
      return z
        .array(iconCategoryRowSchema)
        .parse(data)
        .map((row) => ({ id: row.id, slug: row.slug, name: row.name, sortOrder: row.sort_order }));
    },

    async countIconsByCategory(statuses) {
      const { data, error } = await supabase.rpc('count_icons_by_category', { statuses });
      throwIfFailed(error);
      return new Map(z.array(categoryCountRowSchema).parse(data).map((row) => [row.category_id, row.icon_count]));
    },

    async listIcons(filter: IconListFilter): Promise<IconListPage> {
      let request = supabase.from('icons').select(ICON_SUMMARY_COLUMNS, { count: 'exact' });
      if (filter.setId) request = request.eq('set_id', filter.setId);
      if (filter.categoryId) request = request.eq('category_id', filter.categoryId);
      if (filter.status) request = request.eq('status', filter.status);
      if (filter.activeOnly) request = request.neq('status', ICON_STATUS.archived);
      const terms = [filter.query, ...(filter.alternativeQueries ?? [])]
        .map((term) => (term ? toSafeSearchTerm(term) : ''))
        .filter((term) => term.length > 0);
      if (terms.length > 0) {
        const conditions = terms.flatMap((term) => [
          `slug.ilike.*${toSafeSearchTerm(toSlugSearchTerm(term))}*`,
          `name.ilike.*${term}*`,
        ]);
        request = request.or(conditions.join(','));
      }

      const ordered =
        filter.orderBy === ICON_LIST_ORDER.name
          ? request.order('slug', { ascending: true }).order('id', { ascending: true })
          : request.order('updated_at', { ascending: false }).order('id', { ascending: true });
      const { data, error, count } = await ordered.range(filter.offset, filter.offset + filter.limit - 1);
      throwIfFailed(error);
      return { items: z.array(iconSummaryRowSchema).parse(data).map(toIconSummary), total: count ?? 0 };
    },

    async getIcon(id) {
      const { data, error } = await supabase.from('icons').select(ICON_DETAIL_COLUMNS).eq('id', id).maybeSingle();
      throwIfFailed(error);
      return data ? toIcon(iconDetailRowSchema.parse(data)) : null;
    },

    async findIconsInSet(setId, { slugs, contentHashes }) {
      const conditions = [
        slugs.length > 0 ? `slug.in.(${slugs.join(',')})` : null,
        contentHashes.length > 0 ? `content_hash.in.(${contentHashes.join(',')})` : null,
      ].filter((condition): condition is string => condition !== null);
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from('icons')
        .select(ICON_SUMMARY_COLUMNS)
        .eq('set_id', setId)
        .or(conditions.join(','));
      throwIfFailed(error);
      return z.array(iconSummaryRowSchema).parse(data).map(toIconSummary);
    },

    async insertIcon(input: NewIcon) {
      const { setId, ...fields } = input;
      const { data, error } = await supabase
        .from('icons')
        .insert({ set_id: setId, ...toIconColumns(fields) })
        .select(ICON_DETAIL_COLUMNS)
        .single();
      throwIfFailed(error);
      return toIcon(iconDetailRowSchema.parse(data));
    },

    async updateIcon(id: string, patch: IconPatch) {
      const { data, error } = await supabase
        .from('icons')
        .update(toIconColumns(patch))
        .eq('id', id)
        .select(ICON_DETAIL_COLUMNS)
        .maybeSingle();
      throwIfFailed(error);
      return data ? toIcon(iconDetailRowSchema.parse(data)) : null;
    },

    async deleteIcon(id: string) {
      const { data, error } = await supabase.from('icons').delete().eq('id', id).select('id');
      throwIfFailed(error);
      return Array.isArray(data) && data.length > 0;
    },

    async appendAuditLog(entry: AuditEntry) {
      const { error } = await supabase.from('audit_logs').insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        actor: entry.actor,
        changes: entry.changes,
      });
      throwIfFailed(error);
    },
  };
}
