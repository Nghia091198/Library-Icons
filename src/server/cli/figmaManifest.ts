import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { readZipEntries, type ZipEntries } from '@/server/cli/zipReader';
import { toSlug } from '@/server/icons/svg/suggestSlug';
import { ICON_SET_STYLE, type IconSetStyle } from '@/shared/constants/icons';

const MANIFEST_FILE = 'nghia-icon-manifest.json';
const ARCHIVE_FILE = 'nghia-icon-all.zip';
export const ARCHIVED_GROUP = 'Archived';

export interface SetSpec {
  slug: string;
  name: string;
  style: IconSetStyle;
}

export const SET_SPEC = {
  outline: { slug: 'outline', name: 'Outline', style: ICON_SET_STYLE.outline },
  solid: { slug: 'solid', name: 'Solid', style: ICON_SET_STYLE.solid },
  brand: { slug: 'brand', name: 'Brand', style: ICON_SET_STYLE.brand },
  round: { slug: 'round', name: 'Round', style: ICON_SET_STYLE.solid },
  sharp: { slug: 'sharp', name: 'Sharp', style: ICON_SET_STYLE.solid },
  twoTone: { slug: 'two-tone', name: 'Two Tone', style: ICON_SET_STYLE.solid },
} as const satisfies Record<string, SetSpec>;

// Biến thể Style trong Figma → bộ đích. Logo White/Gray/Dark về Brand (đơn sắc, trùng hình sẽ tự gộp);
// logo Original có màu cũng về Brand trước, script đồng bộ màu chuyển sang Multi Color sau.
export const SET_BY_FIGMA_VARIANT: Record<string, SetSpec> = {
  outlined: SET_SPEC.outline,
  filled: SET_SPEC.solid,
  round: SET_SPEC.round,
  sharp: SET_SPEC.sharp,
  'two tone': SET_SPEC.twoTone,
  brand: SET_SPEC.brand,
  white: SET_SPEC.brand,
  gray: SET_SPEC.brand,
  dark: SET_SPEC.brand,
  original: SET_SPEC.brand,
};

export const BRAND_GROUPS = new Set(['Social icon', 'Social Media Logo', 'Integration icons', 'Payment method icon', 'Country icons']);

const NAME_NOISE_TOKENS = new Set(['outline', 'outlined', 'fill', 'filled', 'solid', 'line', 'icon', 'property', '1']);

const manifestSchema = z.object({
  icons: z.array(
    z.object({
      id: z.string(),
      icon_name: z.string(),
      variant_properties: z.record(z.string()),
      full_path: z.array(z.string()),
      file: z.string().nullable(),
    }),
  ),
});

export type ManifestIcon = z.infer<typeof manifestSchema>['icons'][number];

export function readFigmaExport(sourceFolder: string): { icons: ManifestIcon[]; archive: ZipEntries } {
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(sourceFolder, MANIFEST_FILE), 'utf8')));
  return { icons: manifest.icons, archive: readZipEntries(readFileSync(join(sourceFolder, ARCHIVE_FILE))) };
}

export function figmaGroupOf(icon: ManifestIcon): string {
  return icon.full_path[1] ?? icon.full_path[0] ?? 'Khác';
}

// Icon trong "Archived" là Material Icons cổ điển; chủ đề gốc (Action, Image, Maps…) nằm ở cấp kế tiếp.
export function topicGroupOf(icon: ManifestIcon): string {
  const group = figmaGroupOf(icon);
  return group === ARCHIVED_GROUP ? (icon.full_path[2] ?? group) : group;
}

export function figmaVariantOf(icon: ManifestIcon): string | null {
  const style = icon.variant_properties.Style ?? icon.variant_properties.style;
  return style ? style.trim().toLowerCase() : null;
}

export function targetSetOf(icon: ManifestIcon): SetSpec | null | undefined {
  const variant = figmaVariantOf(icon);
  if (variant) return SET_BY_FIGMA_VARIANT[variant];
  return BRAND_GROUPS.has(figmaGroupOf(icon)) ? SET_SPEC.brand : null;
}

export function cleanSlug(iconName: string): string | null {
  const slug = toSlug(iconName);
  if (!slug) return null;
  const tokens = slug.split('-').filter((token) => !NAME_NOISE_TOKENS.has(token));
  return tokens.length > 0 ? toSlug(tokens.join('-')) : slug;
}

// Tag gồm nhóm Figma và, với icon Archived, cả chủ đề Material (ví dụ ["Archived", "Maps"]).
export function tagsFor(group: string, topic: string): string[] {
  return group === topic ? [group] : [group, topic];
}
