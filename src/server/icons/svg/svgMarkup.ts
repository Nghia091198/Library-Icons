export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

export interface CleanElement {
  name: string;
  attributes: Map<string, string>;
  children: CleanElement[];
}

export interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function serializeAttributes(attributes: ReadonlyMap<string, string>): string {
  return Array.from(attributes, ([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('');
}

export function serializeElement(element: CleanElement): string {
  const attributes = serializeAttributes(element.attributes);
  if (element.children.length === 0) return `<${element.name}${attributes}/>`;
  return `<${element.name}${attributes}>${element.children.map(serializeElement).join('')}</${element.name}>`;
}

export function walkElements(element: CleanElement, visit: (element: CleanElement) => void): void {
  visit(element);
  element.children.forEach((child) => walkElements(child, visit));
}

export function formatNumber(value: number): string {
  return String(Number(value.toFixed(6)));
}
