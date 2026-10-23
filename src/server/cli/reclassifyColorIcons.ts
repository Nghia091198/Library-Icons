import { parseArgs } from 'node:util';
import { loadConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import type { IconSetRecord, IconSummaryRecord } from '@/server/icons/iconRepository';
import { createIconService } from '@/server/icons/iconService';
import { hasOwnColors, inspectSourceColors } from '@/server/icons/svg/inspectSourceColors';
import { processSvgSource } from '@/server/icons/svg/processSvgSource';
import { HttpError } from '@/server/lib/httpError';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { ICON_SET_STYLE, type IconSetStyle } from '@/shared/constants/icons';

const PAGE_SIZE = 100;
const ACTOR = 'reclassify:color-icons';

interface PlannedChange {
  icon: IconSummaryRecord;
  from: IconSetRecord;
  to: IconSetRecord;
}

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    // Chỉ quét icon thuộc một bộ (theo slug), ví dụ "brand", thay vì toàn bộ thư viện.
    set: { type: 'string' },
  },
});

const config = loadConfig(process.env);
const repository = createSupabaseIconRepository(createSupabaseAdminClient(config));
const service = createIconService({ repository });

const sets = await repository.listSets();
const setsById = new Map(sets.map((set) => [set.id, set]));
const defaultSetByStyle = new Map<IconSetStyle, IconSetRecord>();
for (const set of [...sets].sort((first, second) => first.createdAt.localeCompare(second.createdAt))) {
  if (!defaultSetByStyle.has(set.style)) defaultSetByStyle.set(set.style, set);
}
if (!defaultSetByStyle.has(ICON_SET_STYLE.multicolor)) {
  throw new Error('Chưa có bộ Multi Color: chạy migration 0005_multicolor_set.sql trước.');
}

const onlySetId = values.set ? sets.find((set) => set.slug === values.set)?.id : undefined;
if (values.set && !onlySetId) throw new Error(`Không có bộ "${values.set}"`);

const icons: IconSummaryRecord[] = [];
for (let offset = 0; ; offset += PAGE_SIZE) {
  const page = await repository.listIcons({ setId: onlySetId, offset, limit: PAGE_SIZE });
  icons.push(...page.items);
  if (offset + PAGE_SIZE >= page.total) break;
}

const toChoice = (set: IconSetRecord) => ({ setId: set.id, style: set.style, strokeWidth: set.strokeWidth });
const changes: PlannedChange[] = [];
for (const summary of icons) {
  const icon = await repository.getIcon(summary.id);
  const from = setsById.get(summary.setId);
  if (!icon || !from) continue;

  const [detected] = processSvgSource(icon.sourceSvg, {
    sourceName: icon.slug,
    chooseSet: ({ detectedStyle }) => {
      const set = defaultSetByStyle.get(detectedStyle);
      return set ? toChoice(set) : null;
    },
  }).candidates;
  if (!detected?.detectedStyle) continue;

  // Chỉ đổi bộ cho icon có màu cố định; icon một màu giữ bộ đã chọn (ví dụ theo biến thể Figma).
  // Icon đang ở Brand mà mang màu riêng (bản màu của logo) cũng là icon có màu, dù tên không nằm trong từ khoá.
  const keepsOwnColor = from.style === ICON_SET_STYLE.brand && hasOwnColors(inspectSourceColors(icon.sourceSvg));
  const isColored =
    keepsOwnColor ||
    detected.detectedStyle === ICON_SET_STYLE.multicolor ||
    (detected.detectedStyle === ICON_SET_STYLE.brand && detected.isMulticolor);
  const targetStyle = keepsOwnColor ? ICON_SET_STYLE.multicolor : detected.detectedStyle;
  const to = (isColored ? defaultSetByStyle.get(targetStyle) : undefined) ?? from;

  const [normalized] = processSvgSource(icon.sourceSvg, { sourceName: icon.slug, chooseSet: () => toChoice(to) }).candidates;
  if (to.id !== from.id || (normalized?.contentHash && normalized.contentHash !== icon.contentHash)) {
    changes.push({ icon: summary, from, to });
  }
}

const moves = changes.filter((change) => change.from.id !== change.to.id);
const refreshes = changes.filter((change) => change.from.id === change.to.id);
console.log(`Tổng icon: ${icons.length} · chuyển bộ: ${moves.length} · chuẩn hoá lại tại chỗ: ${refreshes.length}`);
for (const move of moves) console.log(`  chuyển ${move.icon.slug}: ${move.from.name} → ${move.to.name}`);
for (const refresh of refreshes) console.log(`  làm mới ${refresh.icon.slug} (${refresh.from.name})`);

if (!values.apply) {
  console.log('Chạy thử: chưa thay đổi gì. Chạy bản apply để áp dụng.');
} else {
  let applied = 0;
  let removedDuplicates = 0;

  // Bộ đích đã có đúng hình này chưa (Postgres có thể báo trùng slug thay vì trùng hình khi cả hai cùng vi phạm).
  async function hasSameDrawingInTarget(change: PlannedChange): Promise<boolean> {
    const icon = await repository.getIcon(change.icon.id);
    if (!icon) return false;
    const [normalized] = processSvgSource(icon.sourceSvg, { sourceName: icon.slug, chooseSet: () => toChoice(change.to) }).candidates;
    if (!normalized?.contentHash) return false;
    const matches = await repository.findIconsInSet(change.to.id, { slugs: [], contentHashes: [normalized.contentHash] });
    return matches.length > 0;
  }

  for (const change of changes) {
    try {
      await service.moveIconToSet(change.icon.id, change.to.id, ACTOR);
      applied += 1;
    } catch (error) {
      const isConflict =
        error instanceof HttpError && (error.code === ERROR_CODE.duplicateIcon || error.code === ERROR_CODE.slugTaken);
      // Bộ đích đã có đúng hình này (thường do import lại): bản nháp ở bộ cũ là bản thừa.
      if (isConflict && (error.code === ERROR_CODE.duplicateIcon || (await hasSameDrawingInTarget(change)))) {
        try {
          await service.deleteIcon(change.icon.id, ACTOR);
          removedDuplicates += 1;
          continue;
        } catch (deleteError) {
          const reason = deleteError instanceof HttpError ? deleteError.message : String(deleteError);
          console.log(`  Trùng nhưng không xoá được ${change.icon.slug}: ${reason}`);
          continue;
        }
      }
      const reason = error instanceof HttpError ? `${error.code}: ${error.message}` : String(error);
      console.log(`  Không xử lý được ${change.icon.slug}: ${reason}`);
    }
  }
  console.log(`Đã áp dụng ${applied}/${changes.length} thay đổi · xoá ${removedDuplicates} bản nháp trùng hình.`);
}
console.log('RECLASSIFY_DONE');
