import { theme, type ThemeConfig } from 'antd';

export const DARK_COLOR = {
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
    ? { surface: DARK_COLOR.coloredIconSurface, icon: DARK_COLOR.iconOnColoredSurface }
    : { surface: DARK_COLOR.background, icon: DARK_COLOR.iconOnCard };
}

export const DARK_THEME: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: DARK_COLOR.primary,
    colorLink: DARK_COLOR.link,
    colorBgBase: DARK_COLOR.background,
    colorTextBase: DARK_COLOR.text,
    colorBorder: DARK_COLOR.border,
    borderRadius: 8,
  },
  components: {
    Layout: {
      bodyBg: DARK_COLOR.background,
      headerBg: DARK_COLOR.background,
      siderBg: DARK_COLOR.background,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: DARK_COLOR.surfaceRaised,
      itemSelectedColor: DARK_COLOR.text,
    },
  },
};
