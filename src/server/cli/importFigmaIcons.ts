import { parseArgs } from 'node:util';
import {
  ARCHIVED_GROUP,
  cleanSlug,
  figmaGroupOf,
  figmaVariantOf,
  readFigmaExport,
  tagsFor,
  targetSetOf,
  topicGroupOf,
  type ManifestIcon,
  type SetSpec,
} from '@/server/cli/figmaManifest';
import { loadConfig } from '@/server/config';
import { createSupabaseAdminClient } from '@/server/db/supabase';
import { createSupabaseIconRepository } from '@/server/db/supabaseIconRepository';
import { categorizeIcon } from '@/server/icons/categorizeIcon';
import type { IconSetRecord } from '@/server/icons/iconRepository';
import { createIconService } from '@/server/icons/iconService';
import { processSvgSource, type SetChoice } from '@/server/icons/svg/processSvgSource';
import { toSlug } from '@/server/icons/svg/suggestSlug';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { ICON_SET_STYLE, ICON_STATUS, type IconSetStyle } from '@/shared/constants/icons';
import type { CreateIconItem } from '@/shared/types/icons';

const IMPORT_ACTOR = 'import:figma-manifest';
const CREATE_BATCH_SIZE = 100;
const LIST_PAGE_SIZE = 100;
const REPORT_EXAMPLES = 12;
const MAX_SLUG_ATTEMPTS = 3;

interface ImportCandidate {
  icon: ManifestIcon;
  group: string;
  topic: string;
  targetSet: SetSpec | null;
  slug: string;
  name: string;
  text: string;
}

function readOptions() {
  const { values } = parseArgs({
    options: {
      source: { type: 'string' },
      groups: { type: 'string', default: '' },
      limit: { type: 'string', default: '200' },
      'per-group': { type: 'string', default: '40' },
      apply: { type: 'boolean', default: false },
      'include-archived': { type: 'boolean', default: false },
    },
  });
  if (!values.source) throw new Error('Missing --source <folder containing the manifest and zip>');
  return {
    source: values.source,
    groups: new Set(values.groups.split(',').map((group) => group.trim()).filter(Boolean)),
    limit: Number(values.limit),
    perGroup: Number(values['per-group']),
    apply: values.apply,
    includeArchived: values['include-archived'],
  };
}

function humanize(slug: string): string {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function count(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function slugAttempt(baseSlug: string, groupSlug: string, attempt: number): string | null {
  if (attempt > MAX_SLUG_ATTEMPTS) return null;
  return attempt === 1 ? `${baseSlug}-${groupSlug}` : `${baseSlug}-${groupSlug}-${attempt}`;
}

function selectCandidates(options: ReturnType<typeof readOptions>) {
  const { icons, archive } = readFigmaExport(options.source);
  const skipped = new Map<string, number>();
  const takenPerGroup = new Map<string, number>();
  const candidates: ImportCandidate[] = [];

  for (const icon of icons) {
    const group = figmaGroupOf(icon);
    if (!icon.file) { count(skipped, 'không có file SVG'); continue; }
    if (group === ARCHIVED_GROUP && !options.includeArchived) { count(skipped, 'nhóm Archived'); continue; }
    if (options.groups.size > 0 && !options.groups.has(group)) { count(skipped, 'ngoài các nhóm đã chọn'); continue; }

    const targetSet = targetSetOf(icon);
    if (targetSet === undefined) { count(skipped, `biến thể ${figmaVariantOf(icon) ?? '?'} (chưa có bộ)`); continue; }
    if (options.perGroup > 0 && (takenPerGroup.get(group) ?? 0) >= options.perGroup) { count(skipped, 'vượt số lượng mỗi nhóm'); continue; }
    if (options.limit > 0 && candidates.length >= options.limit) { count(skipped, 'vượt giới hạn tổng'); continue; }

    const slug = cleanSlug(icon.icon_name);
    const entry = archive.get(icon.file);
    if (!slug) { count(skipped, 'tên không tạo được slug'); continue; }
    if (!entry) { count(skipped, 'không thấy file trong zip'); continue; }

    count(takenPerGroup, group);
    candidates.push({
      icon,
      group,
      topic: topicGroupOf(icon),
      targetSet,
      slug,
      name: humanize(slug),
      text: entry().toString('utf8'),
    });
  }
  return { candidates, skipped, total: icons.length };
}

function printSelection(selection: ReturnType<typeof selectCandidates>): void {
  console.log(`Manifest: ${selection.total} icon · chọn ${selection.candidates.length}`);
  console.log('Bỏ qua:', Object.fromEntries(selection.skipped));
  const byGroup = new Map<string, number>();
  for (const candidate of selection.candidates) count(byGroup, candidate.group);
  console.log('Theo nhóm Figma:', Object.fromEntries(byGroup));
}

function dryRun(candidates: ImportCandidate[]): void {
  const bySet = new Map<string, number>();
  const invalid: string[] = [];

  for (const candidate of candidates) {
    const result = processSvgSource(candidate.text, {
      sourceName: candidate.icon.file,
      chooseSet: ({ detectedStyle }): SetChoice => {
        const style = candidate.targetSet?.style ?? detectedStyle;
        return { setId: candidate.targetSet?.slug ?? style, style, strokeWidth: style === ICON_SET_STYLE.outline ? 1.5 : null };
      },
    });
    const icon = result.candidates[0];
    if (!icon?.isValid || !icon.setId) {
      const reason = [...result.issues, ...(icon?.issues ?? [])].find((issue) => issue.severity === 'error')?.message;
      invalid.push(`${candidate.group}/${candidate.slug}: ${reason ?? 'không hợp lệ'}`);
      continue;
    }
    count(bySet, icon.setId);
  }

  console.log('Sẽ vào bộ:', Object.fromEntries(bySet));
  console.log(`Không hợp lệ: ${invalid.length}`, invalid.slice(0, REPORT_EXAMPLES));
}

async function apply(candidates: ImportCandidate[]): Promise<void> {
  const config = loadConfig(process.env);
  const repository = createSupabaseIconRepository(createSupabaseAdminClient(config));
  const service = createIconService({ repository });

  const setsBySlug = new Map((await repository.listSets()).map((set) => [set.slug, set]));
  const neededSpecs = new Map(candidates.flatMap((candidate) => (candidate.targetSet ? [[candidate.targetSet.slug, candidate.targetSet]] : [])));
  for (const spec of neededSpecs.values()) {
    if (setsBySlug.has(spec.slug)) continue;
    const created = await service.createSet({ slug: spec.slug, name: spec.name, style: spec.style, description: 'Import từ Figma' }, IMPORT_ACTOR);
    setsBySlug.set(created.slug, created);
    console.log(`Đã tạo bộ mới: ${created.name}`);
  }
  const sets = Array.from(setsBySlug.values()).sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  const defaultSetForStyle = (style: IconSetStyle): IconSetRecord | undefined => sets.find((set) => set.style === style);
  const categoryIdBySlug = new Map((await repository.listCategories()).map((category) => [category.slug, category.id]));

  // Hình đã có trong từng bộ: bỏ qua trước khi ghi để chạy lại không tốn công.
  const existing = new Set<string>();
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const page = await repository.listIcons({ offset, limit: LIST_PAGE_SIZE });
    for (const icon of page.items) existing.add(`${icon.setId}:${icon.contentHash}`);
    if (offset + LIST_PAGE_SIZE >= page.total) break;
  }
  console.log(`Đã có sẵn ${existing.size} icon trong thư viện`);

  const items: CreateIconItem[] = [];
  const groupOfItem: string[] = [];
  let invalidCount = 0;
  let alreadyCount = 0;
  for (const [index, candidate] of candidates.entries()) {
    const result = processSvgSource(candidate.text, {
      sourceName: candidate.icon.file,
      chooseSet: ({ detectedStyle }) => {
        const set = candidate.targetSet ? setsBySlug.get(candidate.targetSet.slug) : defaultSetForStyle(detectedStyle);
        return set ? { setId: set.id, style: set.style, strokeWidth: set.strokeWidth } : null;
      },
    });
    const icon = result.candidates[0];
    if (!icon?.isValid || !icon.setId || !icon.contentHash) {
      invalidCount += 1;
      continue;
    }
    const key = `${icon.setId}:${icon.contentHash}`;
    if (existing.has(key)) {
      alreadyCount += 1;
      continue;
    }
    existing.add(key);

    const setStyle = sets.find((set) => set.id === icon.setId)?.style ?? ICON_SET_STYLE.solid;
    items.push({
      source: { name: candidate.icon.file, text: candidate.text },
      candidateIndex: 0,
      setId: icon.setId,
      categoryId: categoryIdBySlug.get(categorizeIcon({ slug: candidate.slug, setStyle, sourceGroup: candidate.topic })) ?? null,
      slug: candidate.slug,
      name: candidate.name,
      tags: tagsFor(candidate.group, candidate.topic),
    });
    groupOfItem.push(candidate.topic);
    if ((index + 1) % 1000 === 0) console.log(`Đã chuẩn bị ${index + 1}/${candidates.length}`);
  }
  console.log(`Cần tạo mới: ${items.length} · đã có (bỏ qua): ${alreadyCount} · không hợp lệ: ${invalidCount}`);

  let created = 0;
  const failures = new Map<string, number>();
  for (let start = 0; start < items.length; start += CREATE_BATCH_SIZE) {
    // Trùng slug (cùng tên, khác hình) thì thử lần lượt: thêm tên nhóm, rồi thêm -2, -3.
    let pending = items.slice(start, start + CREATE_BATCH_SIZE).map((item, offset) => ({
      item,
      baseSlug: item.slug,
      groupSlug: toSlug(groupOfItem[start + offset] ?? '') ?? 'alt',
      attempt: 0,
    }));

    while (pending.length > 0) {
      const response = await service.createIcons({ status: ICON_STATUS.draft, items: pending.map((entry) => entry.item) }, IMPORT_ACTOR);
      const next: typeof pending = [];
      for (const result of response.results) {
        const entry = pending[result.index];
        if (!entry) continue;
        if (result.ok) {
          created += 1;
          continue;
        }
        const attempt = entry.attempt + 1;
        const nextSlug = toSlug(slugAttempt(entry.baseSlug, entry.groupSlug, attempt) ?? '');
        if (result.error.code === ERROR_CODE.slugTaken && nextSlug) {
          next.push({ ...entry, attempt, item: { ...entry.item, slug: nextSlug } });
        } else {
          count(failures, result.error.code);
        }
      }
      pending = next;
    }
    console.log(`Đã xử lý ${Math.min(start + CREATE_BATCH_SIZE, items.length)}/${items.length}`);
  }

  console.log(`Đã tạo ${created} icon (bản nháp) · đã có ${alreadyCount} · không hợp lệ ${invalidCount}`);
  console.log('Không tạo được:', Object.fromEntries(failures));
  console.log('IMPORT_DONE');
}

const options = readOptions();
const selection = selectCandidates(options);
printSelection(selection);
if (options.apply) await apply(selection.candidates);
else dryRun(selection.candidates);
