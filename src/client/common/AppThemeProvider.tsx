import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import type { ReactNode } from 'react';
import { MessageProvider } from '@/client/common/MessageProvider';

// Primary blue-7 của Ant thay cho #1677ff mặc định: chữ trắng trên #1677ff không đạt tương phản 4.5:1.
export const BRAND_PRIMARY = '#0958d9';

const THEME = {
  token: { colorPrimary: BRAND_PRIMARY, colorLink: BRAND_PRIMARY, borderRadius: 6 },
};

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={viVN} theme={THEME}>
      <MessageProvider>{children}</MessageProvider>
    </ConfigProvider>
  );
}
