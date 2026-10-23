import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { createContext, useContext, type ReactNode } from 'react';

const MessageContext = createContext<MessageInstance | null>(null);

// Chỉ cung cấp thông báo nổi (toast). Thay cho <App> của antd vốn kéo theo cả Modal và Notification vào gói chính.
// Đặt bên trong ConfigProvider để thông báo theo đúng theme của khu vực đó (gallery tối, admin sáng).
export function MessageProvider({ children }: { children: ReactNode }) {
  const [messageApi, contextHolder] = message.useMessage();
  return (
    <MessageContext.Provider value={messageApi}>
      {contextHolder}
      {children}
    </MessageContext.Provider>
  );
}

export function useMessage(): MessageInstance {
  const messageApi = useContext(MessageContext);
  if (!messageApi) throw new Error('useMessage must be used inside <MessageProvider>');
  return messageApi;
}
