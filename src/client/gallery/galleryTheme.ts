import { theme, type ThemeConfig } from 'antd';

export const GALLERY_COLOR = {
  background: '#0a1020',
  surface: '#0f1a2e',
  surfaceRaised: '#13203a',
  // Nền thẻ icon tối hơn nền trang để icon sáng nổi bật.
  card: '#05080f',
  cardBorder: '#1a2438',
  iconOnCard: '#f8fafc',
  // Icon giữ màu gốc (logo, nhiều màu) có thể chứa màu đen: hiện trên nền sáng để màu nào cũng thấy rõ.
  coloredIconSurface: '#eef2f7',
  iconOnColoredSurface: '#0f172a',
  border: '#22314d',
  text: '#e6edf7',
  textMuted: '#94a3b8',
  // Nút chính: chữ trắng trên #2563eb đạt 5.2:1; link trên nền tối dùng #60a5fa (≈7.5:1).
  primary: '#2563eb',
  link: '#60a5fa',
} as const;

export function previewColors(isMulticolor: boolean): { surface: string; icon: string } {
  return isMulticolor
    ? { surface: GALLERY_COLOR.coloredIconSurface, icon: GALLERY_COLOR.iconOnColoredSurface }
    : { surface: GALLERY_COLOR.background, icon: GALLERY_COLOR.iconOnCard };
}

export const GALLERY_THEME: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: GALLERY_COLOR.primary,
    colorLink: GALLERY_COLOR.link,
    colorBgBase: GALLERY_COLOR.background,
    colorTextBase: GALLERY_COLOR.text,
    colorBorder: GALLERY_COLOR.border,
    borderRadius: 8,
  },
  components: {
    Layout: {
      bodyBg: GALLERY_COLOR.background,
      headerBg: GALLERY_COLOR.background,
      siderBg: GALLERY_COLOR.background,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: GALLERY_COLOR.surfaceRaised,
      itemSelectedColor: GALLERY_COLOR.text,
    },
  },
};
