import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lib-icons:gallery-sider-open';

function readSavedPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function savePreference(isOpen: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(isOpen));
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư): vẫn đóng mở được, chỉ không nhớ lựa chọn.
  }
}

export function useSiderOpen() {
  const [isOpen, setOpen] = useState(readSavedPreference);

  const toggle = useCallback(() => {
    setOpen((current) => {
      savePreference(!current);
      return !current;
    });
  }, []);

  // Màn hình hẹp tự đóng để nhường chỗ cho lưới icon; màn hình rộng trở lại lựa chọn đã lưu.
  const onBreakpoint = useCallback((isNarrow: boolean) => {
    setOpen(isNarrow ? false : readSavedPreference());
  }, []);

  return { isOpen, toggle, onBreakpoint };
}
