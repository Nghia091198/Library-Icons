import type { Element } from '@xmldom/xmldom';
import { childElements, toArray } from '@/server/icons/svg/parseSvgSource';
import { createIssue } from '@/server/icons/svg/svgIssue';
import { SVG_NAMESPACE, type CleanElement, type ViewBox } from '@/server/icons/svg/svgMarkup';
import { SVG_ISSUE_CODE } from '@/shared/constants/icons';
import type { SvgIssue } from '@/shared/types/icons';

const DRAWING_ELEMENTS = new Set([
  'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect',
  'defs', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop',
]);

const SILENTLY_DROPPED_ELEMENTS = new Set(['title', 'desc', 'metadata']);

const UNSAFE_ELEMENTS = new Set([
  'script', 'foreignObject', 'style', 'use', 'image', 'a', 'iframe', 'object', 'embed',
  'animate', 'animateMotion', 'animateTransform', 'set', 'handler', 'listener', 'feImage',
]);

export const PRESENTATION_PROPERTIES = new Set([
  'fill', 'fill-rule', 'fill-opacity', 'clip-rule', 'clip-path', 'mask',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'stop-color', 'stop-opacity',
]);

const GEOMETRY_ATTRIBUTES = new Set([
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'fx', 'fy',
  'width', 'height', 'points', 'transform', 'offset', 'pathLength', 'id',
  'gradientUnits', 'gradientTransform', 'spreadMethod', 'clipPathUnits', 'maskUnits', 'maskContentUnits',
]);

const ROOT_CONSUMED_ATTRIBUTES = new Set(['viewBox', 'width', 'height', 'x', 'y', 'id']);
const SILENTLY_DROPPED_ATTRIBUTES = new Set(['version', 'xml:space', 'preserveAspectRatio']);
const LOCAL_URL_REFERENCE = /^url\(\s*['"]?#[\w.-]+['"]?\s*\)$/i;
const SIZE_IN_PIXELS = /^\s*(\d+(?:\.\d+)?)\s*(px)?\s*$/i;

const VERDICT = { keep: 'keep', unsafe: 'unsafe', unsupported: 'unsupported', silent: 'silent' } as const;
type Verdict = (typeof VERDICT)[keyof typeof VERDICT];

export interface CleanIcon {
  viewBox: ViewBox | null;
  rootAttributes: Map<string, string>;
  children: CleanElement[];
  issues: SvgIssue[];
}

class RemovalLog {
  readonly unsafe = new Set<string>();
  readonly unsupported = new Set<string>();

  record(verdict: Verdict, label: string): void {
    if (verdict === VERDICT.unsafe) this.unsafe.add(label);
    if (verdict === VERDICT.unsupported) this.unsupported.add(label);
  }

  toIssues(): SvgIssue[] {
    const issues: SvgIssue[] = [];
    if (this.unsafe.size > 0) {
      issues.push(createIssue(SVG_ISSUE_CODE.removedUnsafeContent, 'Removed potentially unsafe content', {
        detail: Array.from(this.unsafe).join(', '),
      }));
    }
    if (this.unsupported.size > 0) {
      issues.push(createIssue(SVG_ISSUE_CODE.removedUnsupportedContent, 'Removed unsupported content', {
        detail: Array.from(this.unsupported).join(', '),
      }));
    }
    return issues;
  }
}

function classifyValue(value: string): Verdict {
  if (/javascript:|expression\s*\(|@import/i.test(value)) return VERDICT.unsafe;
  if (/url\s*\(/i.test(value) && !LOCAL_URL_REFERENCE.test(value.trim())) return VERDICT.unsafe;
  if (/var\s*\(/i.test(value)) return VERDICT.unsupported;
  return VERDICT.keep;
}

function classifyAttribute(name: string, value: string): Verdict {
  const lowerName = name.toLowerCase();
  if (lowerName === 'xmlns' || lowerName.startsWith('xmlns:') || SILENTLY_DROPPED_ATTRIBUTES.has(name)) {
    return VERDICT.silent;
  }
  if (lowerName.startsWith('on')) return VERDICT.unsafe;
  if (lowerName === 'href' || lowerName.endsWith(':href')) return VERDICT.unsafe;
  if (!GEOMETRY_ATTRIBUTES.has(name) && !PRESENTATION_PROPERTIES.has(name)) return VERDICT.unsupported;
  return classifyValue(value);
}

function parseStyleDeclarations(style: string): Array<[string, string]> {
  return style
    .split(';')
    .map((declaration): [string, string] | null => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return null;
      return [declaration.slice(0, separator).trim().toLowerCase(), declaration.slice(separator + 1).trim()];
    })
    .filter((entry): entry is [string, string] => entry !== null && entry[0].length > 0 && entry[1].length > 0);
}

function applyStyleAttribute(style: string, attributes: Map<string, string>, log: RemovalLog): void {
  for (const [property, value] of parseStyleDeclarations(style)) {
    const verdict = PRESENTATION_PROPERTIES.has(property) ? classifyValue(value) : VERDICT.unsupported;
    if (verdict === VERDICT.keep) attributes.set(property, value);
    else log.record(verdict, `style: ${property}`);
  }
}

function cleanAttributes(element: Element, log: RemovalLog, consumed: ReadonlySet<string> = new Set()): Map<string, string> {
  const attributes = new Map<string, string>();
  let style: string | null = null;

  for (const attribute of toArray(element.attributes)) {
    const { name, value } = attribute;
    if (consumed.has(name)) continue;
    if (name === 'style') {
      style = value;
      continue;
    }
    const verdict = classifyAttribute(name, value);
    if (verdict === VERDICT.keep) attributes.set(name, value.trim());
    else log.record(verdict, name);
  }

  // Thuộc tính style ghi đè presentation attribute cùng tên, đúng thứ tự ưu tiên của CSS.
  if (style !== null) applyStyleAttribute(style, attributes, log);
  return attributes;
}

function cleanElement(element: Element, log: RemovalLog): CleanElement | null {
  const name = element.localName ?? element.nodeName;
  if (element.namespaceURI !== SVG_NAMESPACE || !DRAWING_ELEMENTS.has(name)) {
    if (!SILENTLY_DROPPED_ELEMENTS.has(name)) {
      log.record(UNSAFE_ELEMENTS.has(name) ? VERDICT.unsafe : VERDICT.unsupported, `<${element.nodeName}>`);
    }
    return null;
  }

  return {
    name,
    attributes: cleanAttributes(element, log),
    children: childElements(element)
      .map((child) => cleanElement(child, log))
      .filter((child): child is CleanElement => child !== null),
  };
}

function parseViewBox(value: string | null): ViewBox | null {
  if (!value) return null;
  const numbers = value.trim().split(/[\s,]+/).map(Number);
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) return null;
  const [minX = 0, minY = 0, width = 0, height = 0] = numbers;
  return width > 0 && height > 0 ? { minX, minY, width, height } : null;
}

function readPixelSize(value: string | null): number | null {
  const match = value ? SIZE_IN_PIXELS.exec(value) : null;
  const size = match?.[1] ? Number(match[1]) : null;
  return size !== null && size > 0 ? size : null;
}

function resolveViewBox(root: Element): ViewBox | null {
  const declared = parseViewBox(root.getAttribute('viewBox'));
  if (declared) return declared;
  const width = readPixelSize(root.getAttribute('width'));
  const height = readPixelSize(root.getAttribute('height'));
  return width !== null && height !== null ? { minX: 0, minY: 0, width, height } : null;
}

export function sanitizeIcon(root: Element): CleanIcon {
  const log = new RemovalLog();
  const rootAttributes = cleanAttributes(root, log, ROOT_CONSUMED_ATTRIBUTES);
  for (const name of Array.from(rootAttributes.keys())) {
    if (!PRESENTATION_PROPERTIES.has(name)) {
      rootAttributes.delete(name);
      log.record(VERDICT.unsupported, name);
    }
  }

  const children = childElements(root)
    .map((child) => cleanElement(child, log))
    .filter((child): child is CleanElement => child !== null);

  return { viewBox: resolveViewBox(root), rootAttributes, children, issues: log.toIssues() };
}
