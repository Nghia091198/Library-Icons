import { ConfigProvider } from 'antd';
import { useEffect, type ReactNode } from 'react';
import { SWRConfig, type SWRConfiguration } from 'swr';
import { DARK_COLOR, DARK_THEME } from '@/client/common/darkTheme';
import { MessageProvider } from '@/client/common/MessageProvider';

// Dữ liệu thư viện ít thay đổi: không gọi lại khi đổi tab, gộp các lần gọi trùng trong 1 phút,
// giữ kết quả cũ trên màn hình trong lúc tải kết quả mới (đổi bộ lọc, gõ tìm kiếm) để không bị nháy.
const SWR_OPTIONS: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 60_000,
  keepPreviousData: true,
};

// Nền body phải tối theo, nếu không phần kéo quá đầu/cuối trang sẽ lộ màu sáng mặc định.
function useDarkPageBackground(): void {
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = DARK_COLOR.background;
    return () => {
      document.body.style.background = previous;
    };
  }, []);
}

// Khung chung của gallery và admin: theme xanh đen, thông báo theo theme, cache SWR.
export function DarkThemeProvider({ children }: { children: ReactNode }) {
  useDarkPageBackground();
  return (
    <ConfigProvider theme={DARK_THEME}>
      <MessageProvider>
        <SWRConfig value={SWR_OPTIONS}>{children}</SWRConfig>
      </MessageProvider>
    </ConfigProvider>
  );
}
