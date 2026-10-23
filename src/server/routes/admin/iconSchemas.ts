import { z } from '@hono/zod-openapi';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import {
  CREATABLE_ICON_STATUSES,
  ICON_LIST_PAGE_SIZE,
  ICON_METADATA_LIMIT,
  ICON_SET_STYLE,
  ICON_STATUS,
  isValidSlug,
  SLUG_MAX_LENGTH,
  STYLE_REASON,
  SVG_ISSUE_CODE,
  SVG_ISSUE_SEVERITY,
  SVG_SOURCE_LIMIT,
} from '@/shared/constants/icons';
import type {
  CreateIconsResponse,
  IconCategoryListResponse,
  IconDetailDto,
  IconListResponse,
  IconSetDto,
  IconSetListResponse,
  IconSummaryDto,
  PreviewIconsResponse,
  PublicIconListResponse,
  PublishDraftsResponse,
} from '@/shared/types/icons';

const MAX_OUTLINE_STROKE_WIDTH = 4;
const MAX_SEARCH_LENGTH = 100;
const MAX_SOURCE_NAME_LENGTH = 255;

export const SlugSchema = z
  .string()
  .max(SLUG_MAX_LENGTH)
  .refine(isValidSlug, 'Use lowercase letters, digits and single dashes')
  .openapi({ example: 'cart-bag' });

const NameSchema = z.string().trim().min(1).max(ICON_METADATA_LIMIT.maxNameLength);
const DescriptionSchema = z.string().max(ICON_METADATA_LIMIT.maxDescriptionLength);
const LabelListSchema = z
  .array(z.string().max(ICON_METADATA_LIMIT.maxListItemLength))
  .max(ICON_METADATA_LIMIT.maxListItems);

export const IdParamSchema = z.object({
  id: z.string().uuid().openapi({ param: { name: 'id', in: 'path' } }),
});

export const IconSetSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    style: z.nativeEnum(ICON_SET_STYLE),
    strokeWidth: z.number().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('IconSet') satisfies z.ZodType<IconSetDto>;

export const IconSetListSchema = z
  .object({ items: z.array(IconSetSchema) })
  .openapi('IconSetList') satisfies z.ZodType<IconSetListResponse>;

export const IconCategoryListSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string().uuid(),
          slug: z.string(),
          name: z.string(),
          sortOrder: z.number().int(),
          iconCount: z.number().int(),
        })
        .openapi('IconCategory'),
    ),
    totalCount: z.number().int(),
    uncategorizedCount: z.number().int(),
  })
  .openapi('IconCategoryList') satisfies z.ZodType<IconCategoryListResponse>;

export const CreateIconSetSchema = z
  .object({
    slug: SlugSchema,
    name: NameSchema,
    description: DescriptionSchema.optional(),
    style: z.nativeEnum(ICON_SET_STYLE),
    strokeWidth: z.number().positive().max(MAX_OUTLINE_STROKE_WIDTH).nullable().optional(),
  })
  .openapi('CreateIconSetRequest');

export const UpdateIconSetSchema = z
  .object({ name: NameSchema.optional(), description: DescriptionSchema.optional() })
  .openapi('UpdateIconSetRequest');

const SvgIssueSchema = z
  .object({
    code: z.nativeEnum(SVG_ISSUE_CODE),
    severity: z.nativeEnum(SVG_ISSUE_SEVERITY),
    message: z.string(),
    detail: z.string().optional(),
    line: z.number().int().optional(),
  })
  .openapi('SvgIssue');

const IconConflictSchema = z.object({ iconId: z.string().uuid(), slug: z.string() }).openapi('IconConflict');

const PreviewCandidateSchema = z
  .object({
    index: z.number().int(),
    sourceId: z.string().nullable(),
    suggestedSlug: z.string(),
    line: z.number().int().nullable(),
    detectedStyle: z.nativeEnum(ICON_SET_STYLE).nullable(),
    styleReason: z.nativeEnum(STYLE_REASON).nullable(),
    setId: z.string().uuid().nullable(),
    svg: z.string().nullable(),
    contentHash: z.string().nullable(),
    isMulticolor: z.boolean(),
    isValid: z.boolean(),
    issues: z.array(SvgIssueSchema),
    slugTakenBy: IconConflictSchema.nullable(),
    duplicateOf: IconConflictSchema.nullable(),
  })
  .openapi('PreviewCandidate');

export const PreviewIconsResponseSchema = z
  .object({
    sources: z.array(
      z.object({
        sourceName: z.string().nullable(),
        issues: z.array(SvgIssueSchema),
        candidates: z.array(PreviewCandidateSchema),
      }),
    ),
  })
  .openapi('PreviewIconsResponse') satisfies z.ZodType<PreviewIconsResponse>;

const SvgSourceInputSchema = z
  .object({
    name: z.string().max(MAX_SOURCE_NAME_LENGTH).nullable().optional(),
    text: z.string().min(1).max(SVG_SOURCE_LIMIT.maxSourceBytes),
  })
  .openapi('SvgSourceInput');

export const PreviewIconsRequestSchema = z
  .object({
    sources: z
      .array(
        SvgSourceInputSchema.extend({
          setOverrides: z
            .record(z.string().regex(/^\d+$/), z.string().uuid())
            .optional()
            .openapi({ description: 'Icon position in the source → icon set id, replacing the detected set' }),
        }),
      )
      .min(1)
      .max(SVG_SOURCE_LIMIT.maxSourcesPerRequest),
  })
  .openapi('PreviewIconsRequest');

export const CreateIconsRequestSchema = z
  .object({
    status: z.enum(CREATABLE_ICON_STATUSES),
    items: z
      .array(
        z.object({
          source: SvgSourceInputSchema,
          candidateIndex: z.number().int().min(0),
          setId: z.string().uuid(),
          categoryId: z.string().uuid().nullable().optional(),
          slug: SlugSchema,
          name: NameSchema.optional(),
          tags: LabelListSchema.optional(),
          useCases: LabelListSchema.optional(),
        }),
      )
      .min(1)
      .max(SVG_SOURCE_LIMIT.maxItemsPerCreate),
  })
  .openapi('CreateIconsRequest');

export const IconSummarySchema = z
  .object({
    id: z.string().uuid(),
    setId: z.string().uuid(),
    categoryId: z.string().uuid().nullable(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    svg: z.string(),
    contentHash: z.string(),
    tags: z.array(z.string()),
    useCases: z.array(z.string()),
    aliases: z.array(z.string()),
    isMulticolor: z.boolean(),
    status: z.nativeEnum(ICON_STATUS),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('IconSummary') satisfies z.ZodType<IconSummaryDto>;

export const IconDetailSchema = IconSummarySchema.extend({ sourceSvg: z.string() }).openapi(
  'IconDetail',
) satisfies z.ZodType<IconDetailDto>;

export const IconListSchema = z
  .object({
    items: z.array(IconSummarySchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .openapi('IconList') satisfies z.ZodType<IconListResponse>;

export const CreateIconsResponseSchema = z
  .object({
    results: z.array(
      z.discriminatedUnion('ok', [
        z.object({ index: z.number().int(), ok: z.literal(true), icon: IconSummarySchema }),
        z.object({
          index: z.number().int(),
          ok: z.literal(false),
          error: z.object({ code: z.nativeEnum(ERROR_CODE), message: z.string() }),
        }),
      ]),
    ),
  })
  .openapi('CreateIconsResponse') satisfies z.ZodType<CreateIconsResponse>;

export const ListIconsQuerySchema = z.object({
  setId: z.string().uuid().optional().openapi({ param: { name: 'setId', in: 'query' } }),
  categoryId: z.string().uuid().optional().openapi({ param: { name: 'categoryId', in: 'query' } }),
  status: z.nativeEnum(ICON_STATUS).optional().openapi({ param: { name: 'status', in: 'query' } }),
  active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .openapi({ param: { name: 'active', in: 'query', description: 'true: hide archived icons' } }),
  q: z.string().max(MAX_SEARCH_LENGTH).optional().openapi({ param: { name: 'q', in: 'query' } }),
  page: z.coerce.number().int().min(1).optional().openapi({ param: { name: 'page', in: 'query' } }),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(ICON_LIST_PAGE_SIZE.max)
    .optional()
    .openapi({ param: { name: 'pageSize', in: 'query' } }),
});

export const UpdateIconSchema = z
  .object({
    slug: SlugSchema.optional(),
    categoryId: z.string().uuid().nullable().optional(),
    name: NameSchema.optional(),
    description: DescriptionSchema.optional(),
    tags: LabelListSchema.optional(),
    useCases: LabelListSchema.optional(),
    aliases: z.array(SlugSchema).max(ICON_METADATA_LIMIT.maxListItems).optional(),
  })
  .openapi('UpdateIconRequest');

export const ReplaceIconSvgSchema = z
  .object({ source: SvgSourceInputSchema, candidateIndex: z.number().int().min(0).optional() })
  .openapi('ReplaceIconSvgRequest');

export const MoveIconSetSchema = z.object({ setId: z.string().uuid() }).openapi('MoveIconSetRequest');

const PublicIconSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    setId: z.string().uuid(),
    categoryId: z.string().uuid().nullable(),
    svg: z.string(),
    tags: z.array(z.string()),
    isMulticolor: z.boolean(),
  })
  .openapi('PublicIcon');

export const PublicIconListSchema = z
  .object({
    items: z.array(PublicIconSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .openapi('PublicIconList') satisfies z.ZodType<PublicIconListResponse>;

export const PublicListIconsQuerySchema = z.object({
  categorySlug: SlugSchema.optional().openapi({ param: { name: 'categorySlug', in: 'query' } }),
  setId: z.string().uuid().optional().openapi({ param: { name: 'setId', in: 'query' } }),
  q: z.string().max(MAX_SEARCH_LENGTH).optional().openapi({ param: { name: 'q', in: 'query' } }),
  page: z.coerce.number().int().min(1).optional().openapi({ param: { name: 'page', in: 'query' } }),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(ICON_LIST_PAGE_SIZE.max)
    .optional()
    .openapi({ param: { name: 'pageSize', in: 'query' } }),
});

export const PublishDraftsRequestSchema = z
  .object({ setId: z.string().uuid().optional(), categoryId: z.string().uuid().optional() })
  .openapi('PublishDraftsRequest');

export const PublishDraftsResponseSchema = z
  .object({ published: z.number().int() })
  .openapi('PublishDraftsResponse') satisfies z.ZodType<PublishDraftsResponse>;
