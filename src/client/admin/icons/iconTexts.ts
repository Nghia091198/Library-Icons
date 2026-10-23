import { ApiError } from '@/client/common/apiClient';
import { ERROR_CODE, type ErrorCode } from '@/shared/constants/errorCodes';
import {
  ICON_SET_STYLE,
  ICON_STATUS,
  STYLE_REASON,
  SVG_ISSUE_CODE,
  type IconSetStyle,
  type IconStatus,
  type StyleReason,
  type SvgIssueCode,
} from '@/shared/constants/icons';
import type { SvgIssue } from '@/shared/types/icons';

export const ICON_SET_STYLE_LABEL: Record<IconSetStyle, string> = {
  [ICON_SET_STYLE.outline]: 'nét',
  [ICON_SET_STYLE.solid]: 'khối',
  [ICON_SET_STYLE.brand]: 'thương hiệu',
  [ICON_SET_STYLE.multicolor]: 'nhiều màu',
};

const STYLE_REASON_TEXT: Record<StyleReason, string> = {
  [STYLE_REASON.multicolor]: 'có nhiều màu',
  [STYLE_REASON.brandName]: 'tên là thương hiệu',
  [STYLE_REASON.strokes]: 'vẽ bằng nét',
  [STYLE_REASON.fills]: 'tô khối',
};

export function describeDetectedStyle(style: IconSetStyle, reason: StyleReason | null): string {
  return `Tự nhận: icon ${ICON_SET_STYLE_LABEL[style]}${reason ? ` (${STYLE_REASON_TEXT[reason]})` : ''}`;
}

export const ICON_STATUS_LABEL: Record<IconStatus, string> = {
  [ICON_STATUS.draft]: 'Bản nháp',
  [ICON_STATUS.published]: 'Đã publish',
  [ICON_STATUS.archived]: 'Lưu trữ',
};

export const ICON_STATUS_TAG_COLOR: Record<IconStatus, string> = {
  [ICON_STATUS.draft]: 'default',
  [ICON_STATUS.published]: 'success',
  [ICON_STATUS.archived]: 'warning',
};

const SVG_ISSUE_TEXT: Record<SvgIssueCode, string> = {
  [SVG_ISSUE_CODE.sourceTooLarge]: 'Nội dung quá lớn',
  [SVG_ISSUE_CODE.parseError]: 'Lỗi cú pháp SVG',
  [SVG_ISSUE_CODE.parseWarning]: 'Cú pháp chưa chuẩn nhưng vẫn đọc được',
  [SVG_ISSUE_CODE.noIconFound]: 'Không tìm thấy thẻ <svg> hoặc <symbol>',
  [SVG_ISSUE_CODE.tooManyIcons]: 'Quá nhiều icon trong một lần',
  [SVG_ISSUE_CODE.iconTooLarge]: 'Icon quá lớn',
  [SVG_ISSUE_CODE.missingViewBox]: 'Thiếu viewBox, width và height',
  [SVG_ISSUE_CODE.emptyIcon]: 'Không có hình nào để vẽ',
  [SVG_ISSUE_CODE.noMatchingSet]: 'Chưa có bộ icon nào cho kiểu này',
  [SVG_ISSUE_CODE.removedUnsafeContent]: 'Đã gỡ nội dung không an toàn',
  [SVG_ISSUE_CODE.removedUnsupportedContent]: 'Đã gỡ thuộc tính không cần',
  [SVG_ISSUE_CODE.rescaledToGrid]: 'Đã đưa về lưới 24',
  [SVG_ISSUE_CODE.recoloredToCurrentColor]: 'Đã đổi màu sang currentColor',
  [SVG_ISSUE_CODE.mergedMultipleColors]: 'Nhiều màu đã gộp thành một',
  [SVG_ISSUE_CODE.multicolorKept]: 'Giữ nguyên nhiều màu',
  [SVG_ISSUE_CODE.strokeStyleNormalized]: 'Đã thống nhất độ dày nét',
  [SVG_ISSUE_CODE.transformNotBaked]: 'Còn transform, nét có thể hiển thị lệch',
};

export function describeIssue(issue: SvgIssue): string {
  const detail = issue.detail ? `: ${issue.detail}` : '';
  const line = issue.line ? ` (dòng ${issue.line})` : '';
  return `${SVG_ISSUE_TEXT[issue.code]}${detail}${line}`;
}

export const API_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODE.slugTaken]: 'Slug đã được dùng trong bộ này',
  [ERROR_CODE.duplicateIcon]: 'Hình này đã có trong bộ',
  [ERROR_CODE.invalidIcon]: 'Icon không hợp lệ',
  [ERROR_CODE.invalidState]: 'Không thực hiện được ở trạng thái hiện tại',
  [ERROR_CODE.validationFailed]: 'Dữ liệu không hợp lệ',
  [ERROR_CODE.notFound]: 'Không tìm thấy',
  [ERROR_CODE.payloadTooLarge]: 'Dữ liệu gửi lên quá lớn',
  [ERROR_CODE.unauthorized]: 'Phiên đăng nhập đã hết hạn',
};

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) return API_ERROR_TEXT[error.code] ?? error.message;
  return 'Đã có lỗi, thử lại sau';
}
