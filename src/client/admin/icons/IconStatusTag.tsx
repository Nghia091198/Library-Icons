import { Tag } from 'antd';
import { ICON_STATUS_LABEL, ICON_STATUS_TAG_COLOR } from '@/client/admin/icons/iconTexts';
import type { IconStatus } from '@/shared/constants/icons';

export function IconStatusTag({ status }: { status: IconStatus }) {
  return <Tag color={ICON_STATUS_TAG_COLOR[status]}>{ICON_STATUS_LABEL[status]}</Tag>;
}
