import { loadConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import { AUDIT_ACTION } from '@/server/icons/iconService';
import { ICON_STATUS } from '@/shared/constants/icons';

const ACTOR = 'publish:all-drafts';
const LIST_PAGE_SIZE = 100;
const WRITE_CONCURRENCY = 8;
const PROGRESS_EVERY = 500;

const config = loadConfig(process.env);
const repository = createSupabaseIconRepository(createSupabaseAdminClient(config));

// Gom đủ danh sách trước khi ghi, vì publish làm thay đổi kết quả của truy vấn lọc theo bản nháp.
const draftIds: string[] = [];
for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
  const page = await repository.listIcons({ status: ICON_STATUS.draft, offset, limit: LIST_PAGE_SIZE });
  draftIds.push(...page.items.map((icon) => icon.id));
  if (offset + LIST_PAGE_SIZE >= page.total) break;
}
console.log(`Bản nháp cần publish: ${draftIds.length}`);

const publishedAt = new Date().toISOString();
const queue = [...draftIds];
let published = 0;
let failed = 0;

async function worker(): Promise<void> {
  for (let id = queue.shift(); id; id = queue.shift()) {
    try {
      await repository.updateIcon(id, { status: ICON_STATUS.published, publishedAt });
      await repository.appendAuditLog({
        entityType: 'icon',
        entityId: id,
        action: AUDIT_ACTION.publish,
        actor: ACTOR,
        changes: { from: ICON_STATUS.draft, to: ICON_STATUS.published },
      });
      published += 1;
    } catch (error) {
      failed += 1;
      console.log(`Lỗi khi publish ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if ((published + failed) % PROGRESS_EVERY === 0) console.log(`Đã xử lý ${published + failed}/${draftIds.length}`);
  }
}

await Promise.all(Array.from({ length: WRITE_CONCURRENCY }, worker));
console.log(`Đã publish ${published} icon · lỗi ${failed}`);
console.log('PUBLISH_DONE');
