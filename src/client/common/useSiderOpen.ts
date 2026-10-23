import { useCallback, useState } from 'react';

function readSavedPreference(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) !== 'false';
  } catch {
    return true;
  }
}

function savePreference(storageKey: string, isOpen: boolean): void {
  try {
    window.localStorage.setItem(storageKey, String(isOpen));
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư): vẫn đóng mở được, chỉ không nhớ lựa chọn.
  }
}

// storageKey riêng cho từng khu vực (gallery, admin) để mỗi nơi nhớ lựa chọn của mình.
export function useSiderOpen(storageKey: string) {
  const [isOpen, setOpen] = useState(() => readSavedPreference(storageKey));

  const toggle = useCallback(() => {
    setOpen((current) => {
      savePreference(storageKey, !current);
      return !current;
    });
  }, [storageKey]);

  // Màn hình hẹp tự đóng để nhường chỗ cho nội dung; màn hình rộng trở lại lựa chọn đã lưu.
  const onBreakpoint = useCallback(
    (isNarrow: boolean) => {
      setOpen(isNarrow ? false : readSavedPreference(storageKey));
    },
    [storageKey],
  );

  return { isOpen, toggle, onBreakpoint };
}
