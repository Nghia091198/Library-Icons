import { categorizeIcon } from '@/server/icons/categorizeIcon';
import {
  CONFLICT_KIND,
  ICON_LIST_ORDER,
  RepositoryConflictError,
  type AuditEntry,
  type IconCategoryRecord,
  type IconPatch,
  type IconRecord,
  type IconRepository,
  type IconSetRecord,
  type IconSummaryRecord,
} from '@/server/icons/iconRepository';
import {
  processSvgSource,
  toPublicSourceResult,
  type ProcessedSource,
  type SetChoice,
} from '@/server/icons/svg/processSvgSource';
import { HTTP_STATUS, HttpError } from '@/server/lib/httpError';
import { ERROR_CODE, type ErrorCode } from '@/shared/constants/errorCodes';
import {
  ICON_LIST_PAGE_SIZE,
  ICON_SET_STYLE,
  ICON_STATUS,
  SVG_ISSUE_SEVERITY,
  type IconSetStyle,
  type IconStatus,
} from '@/shared/constants/icons';
import type {
  CreateIconItem,
  CreateIconResult,
  CreateIconSetRequest,
  CreateIconsRequest,
  CreateIconsResponse,
  IconConflict,
  IconCategoryListResponse,
  IconListResponse,
  PreviewIconsRequest,
  PreviewIconsResponse,
  PublicIconDto,
  PublicIconListResponse,
  PublishDraftsRequest,
  PublishDraftsResponse,
  ReplaceIconSvgRequest,
  SvgIssue,
  SvgSourceInput,
  UpdateIconRequest,
  UpdateIconSetRequest,
} from '@/shared/types/icons';

export const DEFAULT_OUTLINE_STROKE_WIDTH = 1.5;
const PUBLISH_BATCH_SIZE = 100;
// Nhóm gần như không đổi; cache để mỗi lần cuộn gallery không phải tra lại bảng nhóm.
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
// Chặn vòng lặp vô hạn nếu có bản nháp không publish được: tối đa 100 × 100 icon mỗi lần gọi.
const MAX_PUBLISH_ROUNDS = 100;

export interface PublicIconListParams {
  categorySlug?: string;
  setId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function toPublicIcon(icon: IconSummaryRecord): PublicIconDto {
  return {
    id: icon.id,
    slug: icon.slug,
    name: icon.name,
    setId: icon.setId,
    categoryId: icon.categoryId,
    svg: icon.svg,
    tags: icon.tags,
    isMulticolor: icon.isMulticolor,
  };
}

export const AUDIT_ACTION = {
  create: 'create',
  update: 'update',
  replaceSvg: 'replace_svg',
  moveSet: 'move_set',
  renormalize: 'renormalize',
  publish: 'publish',
  archive: 'archive',
  restore: 'restore',
  delete: 'delete',
} as const;

type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export interface IconListParams {
  setId?: string;
  categoryId?: string;
  status?: IconStatus;
  active?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface IconServiceDeps {
  repository: IconRepository;
  now?: () => Date;
}

export type IconService = ReturnType<typeof createIconService>;

function notFound(entity: string): HttpError {
  return new HttpError(HTTP_STATUS.notFound, ERROR_CODE.notFound, `${entity} not found`);
}

function invalidState(message: string): HttpError {
  return new HttpError(HTTP_STATUS.conflict, ERROR_CODE.invalidState, message);
}

export function toIconSummary(icon: IconRecord): IconSummaryRecord {
  return {
    id: icon.id,
    setId: icon.setId,
    categoryId: icon.categoryId,
    slug: icon.slug,
    name: icon.name,
    description: icon.description,
    svg: icon.svg,
    contentHash: icon.contentHash,
    tags: icon.tags,
    useCases: icon.useCases,
    aliases: icon.aliases,
    isMulticolor: icon.isMulticolor,
    status: icon.status,
    publishedAt: icon.publishedAt,
    createdAt: icon.createdAt,
    updatedAt: icon.updatedAt,
  };
}

function toConflict(icon: IconSummaryRecord | undefined): IconConflict | null {
  return icon ? { iconId: icon.id, slug: icon.slug } : null;
}

function normalizeList(values: string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.map((item) => item.trim()).filter((item) => item.length > 0)) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function slugToName(slug: string): string {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function firstErrorMessage(issues: readonly SvgIssue[]): string {
  return issues.find((issue) => issue.severity === SVG_ISSUE_SEVERITY.error)?.message ?? 'Icon is not valid';
}

function definedEntries(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function unique<TValue>(values: TValue[]): TValue[] {
  return Array.from(new Set(values));
}

function toSetChoice(set: IconSetRecord): SetChoice {
  return { setId: set.id, style: set.style, strokeWidth: set.strokeWidth };
}

// Bộ tạo sớm nhất của mỗi kiểu là bộ mặc định khi tự xếp icon.
function defaultSetsByStyle(sets: IconSetRecord[]): Map<IconSetStyle, IconSetRecord> {
  const byStyle = new Map<IconSetStyle, IconSetRecord>();
  for (const set of [...sets].sort((first, second) => first.createdAt.localeCompare(second.createdAt))) {
    if (!byStyle.has(set.style)) byStyle.set(set.style, set);
  }
  return byStyle;
}

export function createIconService({ repository, now = () => new Date() }: IconServiceDeps) {
  const timestamp = () => now().toISOString();

  async function requireSet(id: string): Promise<IconSetRecord> {
    const set = await repository.getSet(id);
    if (!set) throw notFound('Icon set');
    return set;
  }

  async function requireIcon(id: string): Promise<IconRecord> {
    const icon = await repository.getIcon(id);
    if (!icon) throw notFound('Icon');
    return icon;
  }

  let categoryCache: { loadedAt: number; items: IconCategoryRecord[] } | null = null;
  async function cachedCategories(): Promise<IconCategoryRecord[]> {
    const current = now().getTime();
    if (!categoryCache || current - categoryCache.loadedAt > CATEGORY_CACHE_TTL_MS) {
      categoryCache = { loadedAt: current, items: await repository.listCategories() };
    }
    return categoryCache.items;
  }

  function processSource(set: IconSetRecord, source: SvgSourceInput): ProcessedSource {
    return processSvgSource(source.text, {
      sourceName: source.name ?? null,
      chooseSet: () => toSetChoice(set),
    });
  }

  function audit(entityType: AuditEntry['entityType'], entityId: string, action: AuditAction, actor: string, changes: object = {}) {
    return repository.appendAuditLog({ entityType, entityId, action, actor, changes: definedEntries(changes) });
  }

  async function saveIconPatch(id: string, patch: IconPatch): Promise<IconRecord> {
    try {
      const updated = await repository.updateIcon(id, patch);
      if (!updated) throw notFound('Icon');
      return updated;
    } catch (error) {
      if (error instanceof RepositoryConflictError) {
        throw error.kind === CONFLICT_KIND.slug
          ? new HttpError(HTTP_STATUS.conflict, ERROR_CODE.slugTaken, 'Slug is already used in this set')
          : new HttpError(HTTP_STATUS.conflict, ERROR_CODE.duplicateIcon, 'The same icon already exists in this set');
      }
      throw error;
    }
  }

  async function transition(
    id: string,
    actor: string,
    rule: { from: IconStatus; to: IconStatus; action: AuditAction; message: string },
  ): Promise<IconRecord> {
    const icon = await requireIcon(id);
    if (icon.status !== rule.from) throw invalidState(rule.message);
    const publishedAt = rule.to === ICON_STATUS.published ? (icon.publishedAt ?? timestamp()) : undefined;
    const updated = await saveIconPatch(id, { status: rule.to, publishedAt });
    await audit('icon', id, rule.action, actor, { from: icon.status, to: rule.to });
    return updated;
  }

  return {
    listSets: () => repository.listSets(),

    async listCategories(
      statuses: IconStatus[] = [ICON_STATUS.draft, ICON_STATUS.published],
    ): Promise<IconCategoryListResponse> {
      const [categories, counts] = await Promise.all([
        repository.listCategories(),
        repository.countIconsByCategory(statuses),
      ]);
      const totalCount = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
      return {
        items: categories.map((category) => ({ ...category, iconCount: counts.get(category.id) ?? 0 })),
        totalCount,
        uncategorizedCount: counts.get(null) ?? 0,
      };
    },

    async createSet(input: CreateIconSetRequest, actor: string): Promise<IconSetRecord> {
      const strokeWidth =
        input.style === ICON_SET_STYLE.outline ? (input.strokeWidth ?? DEFAULT_OUTLINE_STROKE_WIDTH) : null;
      try {
        const set = await repository.createSet({
          slug: input.slug,
          name: input.name.trim(),
          description: input.description?.trim() ?? '',
          style: input.style,
          strokeWidth,
        });
        await audit('icon_set', set.id, AUDIT_ACTION.create, actor, { slug: set.slug, style: set.style });
        return set;
      } catch (error) {
        if (error instanceof RepositoryConflictError) {
          throw new HttpError(HTTP_STATUS.conflict, ERROR_CODE.slugTaken, 'An icon set with this slug already exists');
        }
        throw error;
      }
    },

    async updateSet(id: string, input: UpdateIconSetRequest, actor: string): Promise<IconSetRecord> {
      const patch = definedEntries({ name: input.name?.trim(), description: input.description?.trim() });
      const set = await repository.updateSet(id, patch);
      if (!set) throw notFound('Icon set');
      await audit('icon_set', id, AUDIT_ACTION.update, actor, patch);
      return set;
    },

    async previewIcons(request: PreviewIconsRequest): Promise<PreviewIconsResponse> {
      const sets = await repository.listSets();
      const setsById = new Map(sets.map((set) => [set.id, set]));
      const defaults = defaultSetsByStyle(sets);

      const processed = request.sources.map((source) =>
        processSvgSource(source.text, {
          sourceName: source.name ?? null,
          chooseSet: ({ index, detectedStyle }) => {
            const overrideId = source.setOverrides?.[String(index)];
            const set = overrideId ? setsById.get(overrideId) : defaults.get(detectedStyle);
            return set ? toSetChoice(set) : null;
          },
        }),
      );

      const candidates = processed.flatMap((source) => source.candidates);
      const existingBySet = new Map<string, IconSummaryRecord[]>();
      for (const setId of unique(candidates.flatMap((candidate) => (candidate.setId ? [candidate.setId] : [])))) {
        const inSet = candidates.filter((candidate) => candidate.setId === setId);
        existingBySet.set(
          setId,
          await repository.findIconsInSet(setId, {
            slugs: unique(inSet.map((candidate) => candidate.suggestedSlug)),
            contentHashes: unique(inSet.flatMap((candidate) => (candidate.contentHash ? [candidate.contentHash] : []))),
          }),
        );
      }
      const findExisting = (setId: string | null, matches: (icon: IconSummaryRecord) => boolean) =>
        setId ? existingBySet.get(setId)?.find(matches) : undefined;

      return {
        sources: processed.map((source) => {
          const publicSource = toPublicSourceResult(source);
          return {
            ...publicSource,
            candidates: publicSource.candidates.map((candidate) => ({
              ...candidate,
              slugTakenBy: toConflict(findExisting(candidate.setId, (icon) => icon.slug === candidate.suggestedSlug)),
              duplicateOf: toConflict(
                candidate.contentHash
                  ? findExisting(candidate.setId, (icon) => icon.contentHash === candidate.contentHash)
                  : undefined,
              ),
            })),
          };
        }),
      };
    },

    async createIcons(request: CreateIconsRequest, actor: string): Promise<CreateIconsResponse> {
      const setsById = new Map((await repository.listSets()).map((set) => [set.id, set]));
      const categoryIdBySlug = new Map((await repository.listCategories()).map((category) => [category.slug, category.id]));
      const resolveCategoryId = (item: CreateIconItem, set: IconSetRecord): string | null =>
        item.categoryId !== undefined
          ? item.categoryId
          : (categoryIdBySlug.get(categorizeIcon({ slug: item.slug, setStyle: set.style })) ?? null);
      const processedBySource = new Map<string, ProcessedSource>();
      const processCached = (set: IconSetRecord, source: SvgSourceInput) => {
        const key = `${set.id}\u0000${source.name ?? ''}\u0000${source.text}`;
        const cached = processedBySource.get(key) ?? processSource(set, source);
        processedBySource.set(key, cached);
        return cached;
      };
      const failure = (index: number, code: ErrorCode, message: string): CreateIconResult => ({
        index,
        ok: false,
        error: { code, message },
      });

      async function createOne(index: number, item: CreateIconItem): Promise<CreateIconResult> {
        const set = setsById.get(item.setId);
        if (!set) return failure(index, ERROR_CODE.notFound, 'Icon set not found');
        const candidate = processCached(set, item.source).candidates[item.candidateIndex];
        if (!candidate) return failure(index, ERROR_CODE.invalidIcon, 'No icon at this position in the source');
        if (!candidate.isValid || !candidate.svg || !candidate.contentHash) {
          return failure(index, ERROR_CODE.invalidIcon, firstErrorMessage(candidate.issues));
        }

        try {
          const icon = await repository.insertIcon({
            setId: set.id,
            categoryId: resolveCategoryId(item, set),
            slug: item.slug,
            name: item.name?.trim() || slugToName(item.slug),
            description: '',
            svg: candidate.svg,
            sourceSvg: candidate.sourceSvg,
            contentHash: candidate.contentHash,
            tags: normalizeList(item.tags) ?? [],
            useCases: normalizeList(item.useCases) ?? [],
            aliases: [],
            isMulticolor: candidate.isMulticolor,
            status: request.status,
            publishedAt: request.status === ICON_STATUS.published ? timestamp() : null,
          });
          await audit('icon', icon.id, AUDIT_ACTION.create, actor, { slug: icon.slug, status: icon.status });
          return { index, ok: true, icon: toIconSummary(icon) };
        } catch (error) {
          if (!(error instanceof RepositoryConflictError)) throw error;
          return error.kind === CONFLICT_KIND.slug
            ? failure(index, ERROR_CODE.slugTaken, `Slug "${item.slug}" is already used in this set`)
            : failure(index, ERROR_CODE.duplicateIcon, 'The same icon already exists in this set');
        }
      }

      const results: CreateIconResult[] = [];
      for (const [index, item] of request.items.entries()) {
        results.push(await createOne(index, item));
      }
      return { results };
    },

    async listIcons(params: IconListParams): Promise<IconListResponse> {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(Math.max(1, params.pageSize ?? ICON_LIST_PAGE_SIZE.default), ICON_LIST_PAGE_SIZE.max);
      const { items, total } = await repository.listIcons({
        setId: params.setId,
        categoryId: params.categoryId,
        status: params.status,
        activeOnly: params.active,
        query: params.q?.trim() || undefined,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });
      return { items, total, page, pageSize };
    },

    async listPublicIcons(params: PublicIconListParams): Promise<PublicIconListResponse> {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(Math.max(1, params.pageSize ?? ICON_LIST_PAGE_SIZE.default), ICON_LIST_PAGE_SIZE.max);
      let categoryId: string | undefined;
      if (params.categorySlug) {
        const category = (await cachedCategories()).find((candidate) => candidate.slug === params.categorySlug);
        if (!category) return { items: [], total: 0, page, pageSize };
        categoryId = category.id;
      }

      const { items, total } = await repository.listIcons({
        status: ICON_STATUS.published,
        categoryId,
        setId: params.setId,
        query: params.q?.trim() || undefined,
        orderBy: ICON_LIST_ORDER.name,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });
      return { items: items.map(toPublicIcon), total, page, pageSize };
    },

    async publishDrafts(filter: PublishDraftsRequest, actor: string): Promise<PublishDraftsResponse> {
      let published = 0;
      for (let round = 0; round < MAX_PUBLISH_ROUNDS; round += 1) {
        const { items } = await repository.listIcons({
          status: ICON_STATUS.draft,
          setId: filter.setId,
          categoryId: filter.categoryId,
          offset: 0,
          limit: PUBLISH_BATCH_SIZE,
        });
        if (items.length === 0) break;
        for (const icon of items) {
          await saveIconPatch(icon.id, { status: ICON_STATUS.published, publishedAt: icon.publishedAt ?? timestamp() });
          await audit('icon', icon.id, AUDIT_ACTION.publish, actor, { from: ICON_STATUS.draft, to: ICON_STATUS.published });
          published += 1;
        }
      }
      return { published };
    },

    getIcon: requireIcon,

    async updateIcon(id: string, input: UpdateIconRequest, actor: string): Promise<IconRecord> {
      const icon = await requireIcon(id);
      if (input.slug !== undefined && input.slug !== icon.slug && icon.publishedAt !== null) {
        throw invalidState('Slug cannot change after the icon has been published; add an alias instead');
      }

      if (input.categoryId) {
        const categories = await repository.listCategories();
        if (!categories.some((category) => category.id === input.categoryId)) throw notFound('Icon category');
      }

      const patch: IconPatch = {
        slug: input.slug,
        categoryId: input.categoryId,
        name: input.name?.trim(),
        description: input.description?.trim(),
        tags: normalizeList(input.tags),
        useCases: normalizeList(input.useCases),
        aliases: normalizeList(input.aliases),
      };
      const updated = await saveIconPatch(id, patch);
      await audit('icon', id, AUDIT_ACTION.update, actor, patch);
      return updated;
    },

    async replaceIconSvg(id: string, request: ReplaceIconSvgRequest, actor: string): Promise<IconRecord> {
      const icon = await requireIcon(id);
      const set = await requireSet(icon.setId);
      const candidate = processSource(set, request.source).candidates[request.candidateIndex ?? 0];
      if (!candidate) throw new HttpError(HTTP_STATUS.unprocessable, ERROR_CODE.invalidIcon, 'No icon found in the source');
      if (!candidate.isValid || !candidate.svg || !candidate.contentHash) {
        throw new HttpError(HTTP_STATUS.unprocessable, ERROR_CODE.invalidIcon, firstErrorMessage(candidate.issues));
      }

      const updated = await saveIconPatch(id, {
        svg: candidate.svg,
        sourceSvg: candidate.sourceSvg,
        contentHash: candidate.contentHash,
        isMulticolor: candidate.isMulticolor,
      });
      await audit('icon', id, AUDIT_ACTION.replaceSvg, actor, {
        previousHash: icon.contentHash,
        contentHash: candidate.contentHash,
      });
      return updated;
    },

    // Chuyển sang chính bộ hiện tại = chuẩn hoá lại từ mã gốc theo quy tắc mới nhất; không đổi gì thì không ghi.
    async moveIconToSet(id: string, setId: string, actor: string): Promise<IconRecord> {
      const icon = await requireIcon(id);
      const set = await requireSet(setId);
      const isSameSet = icon.setId === set.id;

      const candidate = processSource(set, { name: icon.slug, text: icon.sourceSvg }).candidates[0];
      if (!candidate?.isValid || !candidate.svg || !candidate.contentHash) {
        throw new HttpError(
          HTTP_STATUS.unprocessable,
          ERROR_CODE.invalidIcon,
          candidate ? firstErrorMessage(candidate.issues) : 'Original source no longer contains an icon',
        );
      }
      if (isSameSet && candidate.contentHash === icon.contentHash) return icon;

      const updated = await saveIconPatch(id, {
        setId: set.id,
        svg: candidate.svg,
        contentHash: candidate.contentHash,
        isMulticolor: candidate.isMulticolor,
      });
      await audit('icon', id, isSameSet ? AUDIT_ACTION.renormalize : AUDIT_ACTION.moveSet, actor, {
        fromSetId: icon.setId,
        toSetId: set.id,
        previousHash: icon.contentHash,
        contentHash: candidate.contentHash,
      });
      return updated;
    },

    publishIcon: (id: string, actor: string) =>
      transition(id, actor, {
        from: ICON_STATUS.draft,
        to: ICON_STATUS.published,
        action: AUDIT_ACTION.publish,
        message: 'Only draft icons can be published',
      }),

    archiveIcon: (id: string, actor: string) =>
      transition(id, actor, {
        from: ICON_STATUS.published,
        to: ICON_STATUS.archived,
        action: AUDIT_ACTION.archive,
        message: 'Only published icons can be archived',
      }),

    restoreIcon: (id: string, actor: string) =>
      transition(id, actor, {
        from: ICON_STATUS.archived,
        to: ICON_STATUS.published,
        action: AUDIT_ACTION.restore,
        message: 'Only archived icons can be restored',
      }),

    async deleteIcon(id: string, actor: string): Promise<void> {
      const icon = await requireIcon(id);
      if (icon.status !== ICON_STATUS.draft || icon.publishedAt !== null) {
        throw invalidState('Only drafts that were never published can be deleted; archive the icon instead');
      }
      await repository.deleteIcon(id);
      await audit('icon', id, AUDIT_ACTION.delete, actor, { slug: icon.slug });
    },
  };
}
