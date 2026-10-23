import { SHAPE_ELEMENTS } from '@/server/icons/svg/normalizeIcon';
import type { CleanIcon } from '@/server/icons/svg/sanitizeIcon';
import type { CleanElement } from '@/server/icons/svg/svgMarkup';
import { collectConcreteColors, isAchromaticColor } from '@/server/icons/svg/svgPaint';
import { toSlug } from '@/server/icons/svg/suggestSlug';
import { ICON_SET_STYLE, STYLE_REASON, type IconSetStyle, type StyleReason } from '@/shared/constants/icons';

const NON_RENDERED_CONTAINERS = new Set(['defs', 'clipPath', 'mask', 'linearGradient', 'radialGradient']);

// Từ khoá nhận diện logo thương hiệu theo id hoặc tên file. Cố ý không có "x": quá dễ trùng icon đóng (close).
const BRAND_KEYWORDS = new Set([
  'facebook', 'messenger', 'meta', 'instagram', 'threads', 'tiktok', 'youtube', 'zalo', 'zalopay',
  'shopee', 'lazada', 'tiki', 'sendo', 'twitter', 'linkedin', 'reddit', 'pinterest', 'telegram',
  'whatsapp', 'viber', 'skype', 'discord', 'snapchat', 'github', 'gitlab', 'google', 'apple',
  'android', 'spotify', 'behance', 'dribbble', 'figma', 'slack', 'momo', 'vnpay', 'paypal', 'visa',
  'mastercard', 'grab', 'tumblr', 'clubhouse', 'angellist', 'brand', 'logo', 'social',
]);

interface PaintState {
  fill: string;
  stroke: string;
  isFillDeclared: boolean;
}

// Giá trị mặc định của SVG: tô đen, không nét.
const INITIAL_PAINT: PaintState = { fill: 'black', stroke: 'none', isFillDeclared: false };

export interface StyleClassification {
  style: IconSetStyle;
  reason: StyleReason;
}

interface ShapeCounts {
  strokedOnly: number;
  filledOnly: number;
}

function inheritPaint(element: CleanElement, parent: PaintState): PaintState {
  const fill = element.attributes.get('fill');
  const stroke = element.attributes.get('stroke');
  return {
    fill: fill?.trim().toLowerCase() ?? parent.fill,
    stroke: stroke?.trim().toLowerCase() ?? parent.stroke,
    isFillDeclared: fill !== undefined || parent.isFillDeclared,
  };
}

// Nét có màu mà không khai báo fill: tác giả dựa vào CSS (fill: none) để vẽ dạng nét, nên tính là nét.
function countShapes(element: CleanElement, paint: PaintState, counts: ShapeCounts): void {
  if (NON_RENDERED_CONTAINERS.has(element.name)) return;
  const own = inheritPaint(element, paint);

  if (SHAPE_ELEMENTS.has(element.name)) {
    const isStroked = own.stroke !== 'none';
    const isFilled = own.fill !== 'none' && (own.isFillDeclared || !isStroked);
    if (isStroked && !isFilled) counts.strokedOnly += 1;
    if (isFilled && !isStroked) counts.filledOnly += 1;
  }
  element.children.forEach((child) => countShapes(child, own, counts));
}

function hasBrandName(names: Array<string | null>): boolean {
  return names.some((name) => {
    const slug = name ? toSlug(name) : null;
    return slug !== null && slug.split('-').some((token) => BRAND_KEYWORDS.has(token));
  });
}

export function classifyIcon(clean: CleanIcon, names: Array<string | null>): StyleClassification {
  const root: CleanElement = { name: 'g', attributes: clean.rootAttributes, children: clean.children };
  const isBrandName = hasBrandName(names);
  const colors = collectConcreteColors(root);
  const [onlyColor] = colors;

  // Bộ phân theo cách tô màu; chuyện "là thương hiệu" do nhóm (Social, Brands) đảm nhận.
  // Có màu cố định (nhiều màu, hoặc logo mang màu sắc riêng) → Multi Color;
  // logo đơn sắc (currentColor, trắng, đen, xám) → Brand để đổi theo màu chữ.
  if (colors.size > 1) return { style: ICON_SET_STYLE.multicolor, reason: STYLE_REASON.multicolor };
  if (isBrandName && onlyColor !== undefined && !isAchromaticColor(onlyColor)) {
    return { style: ICON_SET_STYLE.multicolor, reason: STYLE_REASON.brandName };
  }
  if (isBrandName) return { style: ICON_SET_STYLE.brand, reason: STYLE_REASON.brandName };

  const counts: ShapeCounts = { strokedOnly: 0, filledOnly: 0 };
  countShapes(root, INITIAL_PAINT, counts);
  return counts.strokedOnly > 0 && counts.strokedOnly >= counts.filledOnly
    ? { style: ICON_SET_STYLE.outline, reason: STYLE_REASON.strokes }
    : { style: ICON_SET_STYLE.solid, reason: STYLE_REASON.fills };
}
