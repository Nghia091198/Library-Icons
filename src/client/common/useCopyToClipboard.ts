import { useCallback } from 'react';
import { copyText } from '@/client/common/clipboard';
import { useMessage } from '@/client/common/MessageProvider';

export function useCopyToClipboard() {
  const message = useMessage();
  return useCallback(
    async (text: string, successText: string) => {
      if (await copyText(text)) void message.success(successText);
      else void message.error('Trình duyệt không cho phép copy, hãy copy thủ công');
    },
    [message],
  );
}
