import { parseArgs } from 'node:util';
import { ARCHIVED_GROUP, figmaGroupOf, readFigmaExport, tagsFor, targetSetOf, topicGroupOf } from '@/server/cli/figmaManifest';
import { loadConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import { categorizeIcon } from '@/server/icons/categorizeIcon';
import type { IconSetRecord, IconSummaryRecord } from '@/server/icons/iconRepository';
import { AUDIT_ACTION } from '@/server/icons/iconService';
import { processSvgSource } from '@/server/icons/svg/processSvgSource';

const ACTOR = 'recategorize:archived-material-topics';
const LIST_PAGE_SIZE = 100;
const WRITE_CONCURRENCY = 8;

interface PlannedUpdate {
  icon: IconSummaryRecord;
  categoryId: string | null;
  tags: string[];
}

const { values } = parseArgs({ options: { source: { type: 'string' }, apply: { type: 'boolean', default: false } } });
if (!values.source) throw new Error('Missing --source <folder containing the manifest and zip>');

const config = loadConfig(process.env);
const repository = createSupabaseIconRepository(createSupabaseAdminClient(config));

const sets = (await repository.listSets()).sort((first, second) => first.createdAt.localeCompare(second.createdAt));
const setsBySlug = new Map(sets.map((set) => [set.slug, set]));
const categories = await repository.listCategories();
const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

const archivedIcons = new Map<string, IconSummaryRecord>();
for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
  const page = await repository.listIcons({ offset, limit: LIST_PAGE_SIZE });
  for (const icon of page.items) {
    if (icon.tags[0] === ARCHIVED_GROUP) archivedIcons.set(`${icon.setId}:${icon.contentHash}`, icon);
  }
  if (offset + LIST_PAGE_SIZE >= page.total) break;
}
console.log(`Icon Archived trong thư viện: ${archivedIcons.size}`);

const { icons: manifestIcons, archive } = readFigmaExport(values.source);
const updates: PlannedUpdate[] = [];
const plannedIconIds = new Set<string>();
const moves = new Map<string, number>();
for (const manifestIcon of manifestIcons) {
  if (figmaGroupOf(manifestIcon) !== ARCHIVED_GROUP || !manifestIcon.file) continue;
  const spec = targetSetOf(manifestIcon);
  const entry = archive.get(manifestIcon.file);
  if (!spec || !entry) continue;
  const set: IconSetRecord | undefined = setsBySlug.get(spec.slug);
  if (!set) continue;

  const [candidate] = processSvgSource(entry().toString('utf8'), {
    sourceName: manifestIcon.file,
    chooseSet: () => ({ setId: set.id, style: set.style, strokeWidth: set.strokeWidth }),
  }).candidates;
  const icon = candidate?.contentHash ? archivedIcons.get(`${set.id}:${candidate.contentHash}`) : undefined;
  // Nhiều mục manifest có thể trùng hình (cùng một icon trong thư viện): chỉ xử lý icon đó một lần.
  if (!icon || plannedIconIds.has(icon.id)) continue;
  plannedIconIds.add(icon.id);

  const topic = topicGroupOf(manifestIcon);
  const categoryId = categoryIdBySlug.get(categorizeIcon({ slug: icon.slug, setStyle: set.style, sourceGroup: topic })) ?? null;
  const tags = tagsFor(ARCHIVED_GROUP, topic);
  const tagsChanged = tags.join('|') !== icon.tags.join('|');
  if (categoryId === icon.categoryId && !tagsChanged) continue;

  updates.push({ icon, categoryId, tags });
  if (categoryId !== icon.categoryId) {
    const label = `${categoryNameById.get(icon.categoryId ?? '') ?? '—'} → ${categoryNameById.get(categoryId ?? '') ?? '—'}`;
    moves.set(label, (moves.get(label) ?? 0) + 1);
  }
}

console.log(`Cần cập nhật: ${updates.length} icon (đổi nhóm hoặc thêm tag chủ đề)`);
console.log('Đổi nhóm:', Object.fromEntries([...moves].sort((first, second) => second[1] - first[1])));

if (!values.apply) {
  console.log('Chạy thử: chưa thay đổi gì.');
} else {
  let applied = 0;
  const queue = [...updates];
  async function worker(): Promise<void> {
    for (let update = queue.shift(); update; update = queue.shift()) {
      await repository.updateIcon(update.icon.id, { categoryId: update.categoryId, tags: update.tags });
      await repository.appendAuditLog({
        entityType: 'icon',
        entityId: update.icon.id,
        action: AUDIT_ACTION.update,
        actor: ACTOR,
        changes: { categoryId: update.categoryId, tags: update.tags },
      });
      applied += 1;
      if (applied % 500 === 0) console.log(`Đã cập nhật ${applied}/${updates.length}`);
    }
  }
  await Promise.all(Array.from({ length: WRITE_CONCURRENCY }, worker));
  console.log(`Đã cập nhật ${applied}/${updates.length} icon.`);
}
console.log('RECATEGORIZE_DONE');
