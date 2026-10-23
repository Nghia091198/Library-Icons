import { parseSvgSource } from '@/server/icons/svg/parseSvgSource';
import { sanitizeIcon } from '@/server/icons/svg/sanitizeIcon';
import { collectConcreteColors, isAchromaticColor } from '@/server/icons/svg/svgPaint';

export interface SourceColors {
  colorCount: number;
  hasChromaticColor: boolean;
}

// Màu cố định trong mã gốc (trước khi chuẩn hoá), dùng để biết icon có mang màu sắc riêng hay chỉ đơn sắc.
export function inspectSourceColors(source: string): SourceColors | null {
  const [candidate] = parseSvgSource(source).candidates;
  if (!candidate) return null;
  const clean = sanitizeIcon(candidate.element);
  const colors = collectConcreteColors({ name: 'g', attributes: clean.rootAttributes, children: clean.children });
  return {
    colorCount: colors.size,
    hasChromaticColor: Array.from(colors).some((color) => !isAchromaticColor(color)),
  };
}

export function hasOwnColors(colors: SourceColors | null): boolean {
  return colors !== null && (colors.colorCount > 1 || colors.hasChromaticColor);
}
