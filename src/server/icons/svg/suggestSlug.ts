import { isValidSlug, SLUG_MAX_LENGTH } from '@/shared/constants/icons';

const SOURCE_ID_PREFIXES = ['ic-', 'icon-', 'icons-', 'svg-'];

export function toSlug(raw: string): string | null {
  const slug = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\.svg$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
  return isValidSlug(slug) ? slug : null;
}

function stripSourcePrefix(slug: string): string {
  const prefix = SOURCE_ID_PREFIXES.find((candidate) => slug.startsWith(candidate) && slug.length > candidate.length);
  return prefix ? slug.slice(prefix.length) : slug;
}

export function suggestSlug(sourceId: string | null, fileName: string | null, index: number): string {
  const fromId = sourceId ? toSlug(sourceId) : null;
  if (fromId) return stripSourcePrefix(fromId);

  const fromFileName = fileName ? toSlug(fileName) : null;
  if (fromFileName) return stripSourcePrefix(fromFileName);

  return `icon-${index + 1}`;
}
