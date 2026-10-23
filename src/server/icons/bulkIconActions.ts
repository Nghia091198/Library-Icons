import type { IconService } from '@/server/icons/iconService';
import { HTTP_STATUS, HttpError } from '@/server/lib/httpError';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { BULK_ICON_ACTION, type BulkIconAction } from '@/shared/constants/icons';
import type { BulkIconRequest, BulkIconResponse } from '@/shared/types/icons';

// Đủ nhanh để 100 icon xong trong thời gian của một request serverless, không dồn quá nhiều kết nối tới database.
const BULK_CONCURRENCY = 8;

// Dùng lại đúng các thao tác lẻ để giữ nguyên quy tắc nghiệp vụ và audit log của từng icon.
function actionFor(service: IconService, request: BulkIconRequest, actor: string): (id: string) => Promise<unknown> {
  const runners: Record<BulkIconAction, (id: string) => Promise<unknown>> = {
    [BULK_ICON_ACTION.publish]: (id) => service.publishIcon(id, actor),
    [BULK_ICON_ACTION.archive]: (id) => service.archiveIcon(id, actor),
    [BULK_ICON_ACTION.restore]: (id) => service.restoreIcon(id, actor),
    [BULK_ICON_ACTION.delete]: (id) => service.deleteIcon(id, actor),
    [BULK_ICON_ACTION.setCategory]: (id) => service.updateIcon(id, { categoryId: request.categoryId ?? null }, actor),
  };
  return runners[request.action];
}

export async function runBulkIconAction(service: IconService, request: BulkIconRequest, actor: string): Promise<BulkIconResponse> {
  if (request.action === BULK_ICON_ACTION.setCategory && request.categoryId === undefined) {
    throw new HttpError(HTTP_STATUS.unprocessable, ERROR_CODE.validationFailed, 'categoryId is required for setCategory (null removes the category)');
  }

  const run = actionFor(service, request, actor);
  const queue = Array.from(new Set(request.ids));
  const failed: BulkIconResponse['failed'] = [];
  let succeeded = 0;

  // Icon không áp dụng được (sai trạng thái, không tồn tại…) được ghi lại và bỏ qua, không làm hỏng cả lô.
  async function worker(): Promise<void> {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        await run(id);
        succeeded += 1;
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        failed.push({ id, code: error.code, message: error.message });
      }
    }
  }

  await Promise.all(Array.from({ length: BULK_CONCURRENCY }, worker));
  return { succeeded, failed };
}
