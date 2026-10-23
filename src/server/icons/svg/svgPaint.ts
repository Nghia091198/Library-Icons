import { walkElements, type CleanElement } from '@/server/icons/svg/svgMarkup';

export const COLOR_ATTRIBUTES = ['fill', 'stroke', 'stop-color'];
const NON_COLOR_PAINT_VALUES = new Set(['none', 'currentcolor', 'inherit', 'transparent']);

export function isConcreteColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !NON_COLOR_PAINT_VALUES.has(normalized) && !normalized.startsWith('url(');
}

export function collectConcreteColors(root: CleanElement): Set<string> {
  const colors = new Set<string>();
  walkElements(root, (node) => {
    for (const attribute of COLOR_ATTRIBUTES) {
      const value = node.attributes.get(attribute);
      if (value && isConcreteColor(value)) colors.add(value.trim().toLowerCase());
    }
  });
  return colors;
}

const NAMED_ACHROMATIC_COLORS = new Set([
  'black', 'white', 'gray', 'grey', 'silver', 'gainsboro', 'whitesmoke',
  'lightgray', 'lightgrey', 'darkgray', 'darkgrey', 'dimgray', 'dimgrey',
]);
// Chênh lệch tối đa giữa các kênh R, G, B để vẫn coi là xám (bù sai số khi xuất từ công cụ thiết kế).
const ACHROMATIC_CHANNEL_TOLERANCE = 12;

function parseRgb(value: string): number[] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (hex?.[1]) {
    const digits = hex[1];
    return digits.length === 3
      ? [...digits].map((digit) => Number.parseInt(digit + digit, 16))
      : [0, 2, 4].map((start) => Number.parseInt(digits.slice(start, start + 2), 16));
  }
  const functional = /^rgba?\(([^)]+)\)$/.exec(value);
  if (functional?.[1]) return functional[1].split(/[\s,/]+/).slice(0, 3).map(Number);
  return null;
}

// Trắng, đen, xám: màu "trung tính", logo dùng màu này là logo đơn sắc chứ không mang màu thương hiệu.
export function isAchromaticColor(color: string): boolean {
  const value = color.trim().toLowerCase();
  if (NAMED_ACHROMATIC_COLORS.has(value)) return true;
  const channels = parseRgb(value);
  if (!channels || channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return false;
  return Math.max(...channels) - Math.min(...channels) <= ACHROMATIC_CHANNEL_TOLERANCE;
}
