export const EXPORT_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256, 512] as const;
export const DEFAULT_EXPORT_SIZE = 24;
const RASTER_FALLBACK_COLOR = '#000000';
const JPEG_BACKGROUND = '#ffffff';
const OPENING_SVG_TAG = /^<svg\b/;

export const RASTER_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
} as const;

export type RasterFormat = (typeof RASTER_FORMAT)[keyof typeof RASTER_FORMAT];

export interface SvgExportOptions {
  // null giữ nguyên currentColor để icon ăn theo màu chữ nơi dán vào.
  color: string | null;
  size: number;
}

export function customizeSvg(svg: string, { color, size }: SvgExportOptions): string {
  const sized = svg.replace(OPENING_SVG_TAG, `<svg width="${size}" height="${size}"`);
  return color ? sized.replaceAll('currentColor', color) : sized;
}

function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(attribute: string): string {
  return attribute.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

export function reactComponentName(slug: string): string {
  const name = toPascalCase(slug);
  return /^[A-Z]/.test(name) ? `${name}Icon` : `Icon${name}`;
}

export function toReactComponent(svg: string, slug: string): string {
  const jsx = svg
    .replace(/\s([a-z]+(?:-[a-z]+)+)=/g, (_match, attribute: string) => ` ${toCamelCase(attribute)}=`)
    .replace(OPENING_SVG_TAG, '<svg {...props}');
  const name = reactComponentName(slug);
  return `import type { SVGProps } from 'react';

export function ${name}(props: SVGProps<SVGSVGElement>) {
  return (
    ${jsx}
  );
}
`;
}

export function toDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function rasterizeSvg(svg: string, { color, size }: SvgExportOptions, format: RasterFormat): Promise<Blob> {
  const image = new Image();
  image.src = toDataUrl(customizeSvg(svg, { color: color ?? RASTER_FALLBACK_COLOR, size }));
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not supported');
  if (format === RASTER_FORMAT.jpeg) {
    context.fillStyle = JPEG_BACKGROUND;
    context.fillRect(0, 0, size, size);
  }
  context.drawImage(image, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), format);
  });
}
