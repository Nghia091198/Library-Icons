import type { SvgSourceInput } from '@/shared/types/icons';

const DEFAULT_ICON_COLOR = '#1f1f1f';

// Hiển thị qua <img> (không chèn SVG vào DOM) để không đoạn mã nào trong SVG có thể chạy được.
export function toSvgDataUri(svg: string, color: string = DEFAULT_ICON_COLOR): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll('currentColor', color))}`;
}

export async function readSvgFile(file: File): Promise<SvgSourceInput> {
  return { name: file.name, text: await file.text() };
}

export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}
