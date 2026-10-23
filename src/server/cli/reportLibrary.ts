import { loadConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import { createIconService } from '@/server/icons/iconService';

const config = loadConfig(process.env);
const repository = createSupabaseIconRepository(createSupabaseAdminClient(config));
const service = createIconService({ repository });

const categories = await service.listCategories();
console.log(`Tổng icon (nháp + đã publish): ${categories.totalCount} · chưa có nhóm: ${categories.uncategorizedCount}`);
console.log('Theo nhóm:');
for (const category of [...categories.items].sort((first, second) => second.iconCount - first.iconCount)) {
  if (category.iconCount > 0) console.log(`  ${category.name}: ${category.iconCount}`);
}

console.log('Theo bộ:');
for (const set of await repository.listSets()) {
  const { total } = await repository.listIcons({ setId: set.id, activeOnly: true, offset: 0, limit: 1 });
  console.log(`  ${set.name}: ${total}`);
}
