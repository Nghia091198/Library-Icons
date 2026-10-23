import { ICON_STATUS, type IconStatus } from '@/shared/constants/icons';

// Màu chấm trạng thái trên nền tối: vàng = nháp (cần xử lý), xanh = đang hiện trên gallery, xám = đã ẩn.
export const ICON_STATUS_COLOR: Record<IconStatus, string> = {
  [ICON_STATUS.draft]: '#f59e0b',
  [ICON_STATUS.published]: '#22c55e',
  [ICON_STATUS.archived]: '#64748b',
};

export function StatusDot({ status, size = 8 }: { status: IconStatus; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: ICON_STATUS_COLOR[status], flex: 'none' }}
    />
  );
}
