export const ICON_STATUS = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
} as const;

export type IconStatus = (typeof ICON_STATUS)[keyof typeof ICON_STATUS];

export const ICON_SET_STYLE = {
  outline: 'outline',
  solid: 'solid',
  brand: 'brand',
  multicolor: 'multicolor',
} as const;

export type IconSetStyle = (typeof ICON_SET_STYLE)[keyof typeof ICON_SET_STYLE];

export const STYLE_REASON = {
  multicolor: 'multicolor',
  brandName: 'brandName',
  strokes: 'strokes',
  fills: 'fills',
} as const;

export type StyleReason = (typeof STYLE_REASON)[keyof typeof STYLE_REASON];

export const ICON_GRID_SIZE = 24;

export const SLUG_MAX_LENGTH = 64;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

export const SVG_SOURCE_LIMIT = {
  maxSourceBytes: 2_000_000,
  maxIconBytes: 100_000,
  maxIconsPerSource: 200,
  maxSourcesPerRequest: 50,
  maxItemsPerCreate: 200,
} as const;

export const ICON_METADATA_LIMIT = {
  maxNameLength: 80,
  maxDescriptionLength: 500,
  maxListItems: 20,
  maxListItemLength: 60,
} as const;

export const ICON_LIST_PAGE_SIZE = {
  default: 24,
  max: 100,
} as const;

export const CREATABLE_ICON_STATUSES = [ICON_STATUS.draft, ICON_STATUS.published] as const;
export type CreatableIconStatus = (typeof CREATABLE_ICON_STATUSES)[number];

export const BULK_ICON_ACTION = {
  publish: 'publish',
  archive: 'archive',
  restore: 'restore',
  delete: 'delete',
  setCategory: 'setCategory',
} as const;

export type BulkIconAction = (typeof BULK_ICON_ACTION)[keyof typeof BULK_ICON_ACTION];

// Mỗi lần gọi bị giới hạn để chạy xong trong thời gian tối đa của một request serverless;
// giao diện tự chia danh sách lớn thành nhiều lô.
export const BULK_ICON_LIMIT = 100;

export const SVG_ISSUE_SEVERITY = {
  info: 'info',
  warning: 'warning',
  error: 'error',
} as const;

export type SvgIssueSeverity = (typeof SVG_ISSUE_SEVERITY)[keyof typeof SVG_ISSUE_SEVERITY];

export const SVG_ISSUE_CODE = {
  sourceTooLarge: 'SOURCE_TOO_LARGE',
  parseError: 'PARSE_ERROR',
  parseWarning: 'PARSE_WARNING',
  noIconFound: 'NO_ICON_FOUND',
  tooManyIcons: 'TOO_MANY_ICONS',
  iconTooLarge: 'ICON_TOO_LARGE',
  missingViewBox: 'MISSING_VIEWBOX',
  emptyIcon: 'EMPTY_ICON',
  noMatchingSet: 'NO_MATCHING_SET',
  removedUnsafeContent: 'REMOVED_UNSAFE_CONTENT',
  removedUnsupportedContent: 'REMOVED_UNSUPPORTED_CONTENT',
  rescaledToGrid: 'RESCALED_TO_GRID',
  recoloredToCurrentColor: 'RECOLORED_TO_CURRENT_COLOR',
  mergedMultipleColors: 'MERGED_MULTIPLE_COLORS',
  multicolorKept: 'MULTICOLOR_KEPT',
  strokeStyleNormalized: 'STROKE_STYLE_NORMALIZED',
  transformNotBaked: 'TRANSFORM_NOT_BAKED',
} as const;

export type SvgIssueCode = (typeof SVG_ISSUE_CODE)[keyof typeof SVG_ISSUE_CODE];
