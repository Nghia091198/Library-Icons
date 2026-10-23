import { createHash } from 'node:crypto';
import { optimize, type Config } from 'svgo';
import type { CleanIcon } from '@/server/icons/svg/sanitizeIcon';
import { createIssue } from '@/server/icons/svg/svgIssue';
import { collectConcreteColors, COLOR_ATTRIBUTES, isConcreteColor } from '@/server/icons/svg/svgPaint';
import {
  formatNumber,
  serializeAttributes,
  serializeElement,
  SVG_NAMESPACE,
  walkElements,
  type CleanElement,
  type ViewBox,
} from '@/server/icons/svg/svgMarkup';
import { ICON_GRID_SIZE, ICON_SET_STYLE, SVG_ISSUE_CODE, SVG_SOURCE_LIMIT, type IconSetStyle } from '@/shared/constants/icons';
import type { SvgIssue } from '@/shared/types/icons';

const CURRENT_COLOR = 'currentColor';
const OUTLINE_STROKE_STYLE_ATTRIBUTES = ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit'];
export const SHAPE_ELEMENTS = new Set(['path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect']);
const ID_PREFIX_LENGTH = 8;

export interface NormalizeOptions {
  style: IconSetStyle;
  strokeWidth: number | null;
}

export interface NormalizedIcon {
  svg: string | null;
  contentHash: string | null;
  isMulticolor: boolean;
  issues: SvgIssue[];
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hasShape(element: CleanElement): boolean {
  let found = false;
  walkElements(element, (node) => {
    if (SHAPE_ELEMENTS.has(node.name)) found = true;
  });
  return found;
}

function normalizeColors(wrapper: CleanElement, style: IconSetStyle): { isMulticolor: boolean; issues: SvgIssue[] } {
  const colors = collectConcreteColors(wrapper);

  if (colors.size === 0) return { isMulticolor: false, issues: [] };
  // Multi Color luôn giữ màu gốc. Brand là logo đơn sắc nên đổi về currentColor,
  // trừ khi logo có nhiều màu (gộp sẽ làm hỏng hình).
  const keepsColors =
    style === ICON_SET_STYLE.multicolor || (style === ICON_SET_STYLE.brand && colors.size > 1);
  if (keepsColors) {
    return {
      isMulticolor: true,
      issues: [createIssue(SVG_ISSUE_CODE.multicolorKept, 'Kept original colors', { detail: Array.from(colors).join(', ') })],
    };
  }

  walkElements(wrapper, (node) => {
    for (const attribute of COLOR_ATTRIBUTES) {
      const value = node.attributes.get(attribute);
      if (value && isConcreteColor(value)) node.attributes.set(attribute, CURRENT_COLOR);
    }
  });

  const detail = Array.from(colors).join(', ');
  const issue =
    colors.size > 1
      ? createIssue(SVG_ISSUE_CODE.mergedMultipleColors, 'Merged several colors into currentColor', { detail })
      : createIssue(SVG_ISSUE_CODE.recoloredToCurrentColor, 'Replaced hard-coded color with currentColor', { detail });
  return { isMulticolor: false, issues: [issue] };
}

// Icon nét nhận màu và độ dày nét từ thẻ <svg> gốc, nên bỏ các giá trị riêng lẻ trên từng phần tử.
function normalizeOutlineStroke(wrapper: CleanElement): SvgIssue[] {
  let removed = false;
  walkElements(wrapper, (node) => {
    for (const attribute of OUTLINE_STROKE_STYLE_ATTRIBUTES) {
      if (node.attributes.delete(attribute)) removed = true;
    }
    const stroke = node.attributes.get('stroke');
    if (stroke !== undefined && stroke !== 'none' && node.attributes.delete('stroke')) removed = true;
  });
  return removed ? [createIssue(SVG_ISSUE_CODE.strokeStyleNormalized, 'Unified stroke width and caps')] : [];
}

function readNumber(attributes: ReadonlyMap<string, string>, name: string): number {
  const value = Number.parseFloat(attributes.get(name) ?? '0');
  return Number.isFinite(value) ? value : 0;
}

// svgo không chuyển rect bo góc sang path; tự chuyển để transform luôn được áp thẳng vào toạ độ.
function convertRectsToPaths(wrapper: CleanElement): void {
  walkElements(wrapper, (node) => {
    if (node.name !== 'rect') return;
    const x = readNumber(node.attributes, 'x');
    const y = readNumber(node.attributes, 'y');
    const width = readNumber(node.attributes, 'width');
    const height = readNumber(node.attributes, 'height');
    const declaredRx = node.attributes.has('rx') ? readNumber(node.attributes, 'rx') : null;
    const declaredRy = node.attributes.has('ry') ? readNumber(node.attributes, 'ry') : null;
    const rx = Math.min(Math.max(declaredRx ?? declaredRy ?? 0, 0), width / 2);
    const ry = Math.min(Math.max(declaredRy ?? declaredRx ?? 0, 0), height / 2);
    const n = formatNumber;

    const d =
      rx === 0 || ry === 0
        ? `M${n(x)} ${n(y)}H${n(x + width)}V${n(y + height)}H${n(x)}Z`
        : `M${n(x + rx)} ${n(y)}H${n(x + width - rx)}A${n(rx)} ${n(ry)} 0 0 1 ${n(x + width)} ${n(y + ry)}` +
          `V${n(y + height - ry)}A${n(rx)} ${n(ry)} 0 0 1 ${n(x + width - rx)} ${n(y + height)}` +
          `H${n(x + rx)}A${n(rx)} ${n(ry)} 0 0 1 ${n(x)} ${n(y + height - ry)}` +
          `V${n(y + ry)}A${n(rx)} ${n(ry)} 0 0 1 ${n(x + rx)} ${n(y)}Z`;

    for (const attribute of ['x', 'y', 'width', 'height', 'rx', 'ry']) node.attributes.delete(attribute);
    node.name = 'path';
    node.attributes.set('d', d);
  });
}

function isGrid(viewBox: ViewBox): boolean {
  return viewBox.minX === 0 && viewBox.minY === 0 && viewBox.width === ICON_GRID_SIZE && viewBox.height === ICON_GRID_SIZE;
}

function gridTransform(viewBox: ViewBox): string {
  const scale = ICON_GRID_SIZE / Math.max(viewBox.width, viewBox.height);
  const translateX = (ICON_GRID_SIZE - viewBox.width * scale) / 2 - viewBox.minX * scale;
  const translateY = (ICON_GRID_SIZE - viewBox.height * scale) / 2 - viewBox.minY * scale;
  return `translate(${formatNumber(translateX)} ${formatNumber(translateY)}) scale(${formatNumber(scale)})`;
}

function svgoConfig(idPrefix: string): Config {
  return {
    multipass: true,
    floatPrecision: 3,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            // Hai plugin này xoá stroke="none"/fill mặc định dựa trên thẻ gốc lúc tối ưu,
            // nhưng thuộc tính màu của thẻ gốc chỉ được gắn SAU bước svgo.
            removeUnknownsAndDefaults: false,
            removeUselessStrokeAndFill: false,
            convertShapeToPath: { convertArcs: true },
          },
        },
      },
      { name: 'prefixIds', params: { prefix: idPrefix, delim: '-' } },
    ],
  };
}

function rootPaintAttributes(options: NormalizeOptions): Map<string, string> {
  if (options.style === ICON_SET_STYLE.outline) {
    return new Map([
      ['fill', 'none'],
      ['stroke', CURRENT_COLOR],
      ['stroke-width', formatNumber(options.strokeWidth ?? 1.5)],
      ['stroke-linecap', 'round'],
      ['stroke-linejoin', 'round'],
    ]);
  }
  return new Map([['fill', CURRENT_COLOR]]);
}

const OPENING_SVG_TAG = /^<svg\b[^>]*>/;
const EMPTY_SVG = /^<svg\b[^>]*\/>$/;

export function normalizeIcon(clean: CleanIcon, options: NormalizeOptions): NormalizedIcon {
  const failed = (issue: SvgIssue): NormalizedIcon => ({ svg: null, contentHash: null, isMulticolor: false, issues: [issue] });

  if (!clean.viewBox) {
    return failed(createIssue(SVG_ISSUE_CODE.missingViewBox, 'Icon has no usable viewBox, width or height'));
  }

  const wrapper: CleanElement = { name: 'g', attributes: new Map(clean.rootAttributes), children: clean.children };
  if (!hasShape(wrapper)) return failed(createIssue(SVG_ISSUE_CODE.emptyIcon, 'Icon contains no drawable shape'));

  const issues: SvgIssue[] = [];
  const colorResult = normalizeColors(wrapper, options.style);
  issues.push(...colorResult.issues);
  if (options.style === ICON_SET_STYLE.outline) issues.push(...normalizeOutlineStroke(wrapper));
  convertRectsToPaths(wrapper);

  const needsRescale = !isGrid(clean.viewBox);
  if (needsRescale) {
    wrapper.attributes.set('transform', gridTransform(clean.viewBox));
    issues.push(createIssue(SVG_ISSUE_CODE.rescaledToGrid, 'Rescaled to the 24×24 grid', {
      detail: `${formatNumber(clean.viewBox.width)}×${formatNumber(clean.viewBox.height)}`,
    }));
  }

  const draft = `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${ICON_GRID_SIZE} ${ICON_GRID_SIZE}">${serializeElement(wrapper)}</svg>`;
  const idPrefix = `i${sha256(draft).slice(0, ID_PREFIX_LENGTH)}`;

  let optimized: string;
  try {
    optimized = optimize(draft, svgoConfig(idPrefix)).data;
  } catch (error) {
    return failed(createIssue(SVG_ISSUE_CODE.parseError, error instanceof Error ? error.message : 'Could not optimize icon'));
  }

  if (EMPTY_SVG.test(optimized)) return failed(createIssue(SVG_ISSUE_CODE.emptyIcon, 'Icon contains no drawable shape'));

  const rootAttributes = new Map([
    ['xmlns', SVG_NAMESPACE],
    ['viewBox', `0 0 ${ICON_GRID_SIZE} ${ICON_GRID_SIZE}`],
    ...rootPaintAttributes(options),
  ]);
  const svg = optimized.replace(OPENING_SVG_TAG, `<svg${serializeAttributes(rootAttributes)}>`);

  if (needsRescale && /\btransform="/.test(svg)) {
    issues.push(createIssue(SVG_ISSUE_CODE.transformNotBaked, 'Some shapes keep a transform; stroke width may look different'));
  }
  if (Buffer.byteLength(svg, 'utf8') > SVG_SOURCE_LIMIT.maxIconBytes) {
    return failed(createIssue(SVG_ISSUE_CODE.iconTooLarge, 'Icon is larger than the allowed size after optimization'));
  }

  return { svg, contentHash: sha256(svg), isMulticolor: colorResult.isMulticolor, issues };
}
