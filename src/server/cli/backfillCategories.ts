import { loadConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import { categorizeIcon } from '@/server/icons/categorizeIcon';
import type { IconSummaryRecord } from '@/server/icons/iconRepository';
import { createIconService } from '@/server/icons/iconService';

const PAGE_SIZE = 100;
const BACKFILL_ACTOR = 'backfill:categories';

const config = loadConfig(process.env);
const repository = createSupabaseIconRepository(createSupabaseAdminClient(config));
const service = createIconService({ repository });

const setStyleById = new Map((await repository.listSets()).map((set) => [set.id, set.style]));
const categories = await repository.listCategories();
const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

const uncategorized: IconSummaryRecord[] = [];
for (let offset = 0; ; offset += PAGE_SIZE) {
  const page = await repository.listIcons({ offset, limit: PAGE_SIZE });
  uncategorized.push(...page.items.filter((icon) => icon.categoryId === null));
  if (offset + PAGE_SIZE >= page.total) break;
}

const assigned = new Map<string, number>();
for (const icon of uncategorized) {
  const setStyle = setStyleById.get(icon.setId);
  if (!setStyle) continue;
  // Icon import từ Figma mang tên nhóm Figma ở tag đầu tiên.
  const slug = categorizeIcon({ slug: icon.slug, setStyle, sourceGroup: icon.tags[0] ?? null });
  const categoryId = categoryIdBySlug.get(slug);
  if (!categoryId) continue;
  await service.updateIcon(icon.id, { categoryId }, BACKFILL_ACTOR);
  const name = categoryNameById.get(categoryId) ?? slug;
  assigned.set(name, (assigned.get(name) ?? 0) + 1);
}

console.log(`Icon chưa có nhóm: ${uncategorized.length}`);
console.log('Đã xếp vào:', Object.fromEntries(assigned));
