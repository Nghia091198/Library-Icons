import { randomUUID } from 'node:crypto';
import {
  CONFLICT_KIND,
  ICON_LIST_ORDER,
  RepositoryConflictError,
  toSlugSearchTerm,
  type AuditEntry,
  type IconCategoryRecord,
  type IconRecord,
  type IconRepository,
  type IconSetRecord,
} from '@/server/icons/iconRepository';
import { toIconSummary } from '@/server/icons/iconService';
import { ICON_SET_STYLE, ICON_STATUS } from '@/shared/constants/icons';

const FIXED_TIME = '2026-10-22T00:00:00.000Z';

export const SEEDED_SET_SLUG = {
  outline: 'outline',
  solid: 'solid',
  brand: 'brand',
  multicolor: 'multicolor',
} as const;

export interface InMemoryIconRepository extends IconRepository {
  readonly sets: Map<string, IconSetRecord>;
  readonly icons: Map<string, IconRecord>;
  readonly categories: IconCategoryRecord[];
  readonly auditLog: AuditEntry[];
  setIdBySlug(slug: string): string;
  categoryIdBySlug(slug: string): string;
}

const SEEDED_CATEGORIES = ['arrows', 'chevrons', 'commerce', 'social', 'brands', 'actions', 'other'];

export function createInMemoryIconRepository(): InMemoryIconRepository {
  const sets = new Map<string, IconSetRecord>();
  const icons = new Map<string, IconRecord>();
  const auditLog: AuditEntry[] = [];
  const categories: IconCategoryRecord[] = SEEDED_CATEGORIES.map((slug, index) => ({
    id: randomUUID(),
    slug,
    name: slug,
    sortOrder: index,
  }));

  function addSet(input: Omit<IconSetRecord, 'id' | 'createdAt' | 'updatedAt'>): IconSetRecord {
    if (Array.from(sets.values()).some((set) => set.slug === input.slug)) {
      throw new RepositoryConflictError(CONFLICT_KIND.slug);
    }
    const set = { ...input, id: randomUUID(), createdAt: FIXED_TIME, updatedAt: FIXED_TIME };
    sets.set(set.id, set);
    return set;
  }

  function assertUnique(candidate: IconRecord): void {
    for (const other of icons.values()) {
      if (other.id === candidate.id || other.setId !== candidate.setId) continue;
      if (other.slug === candidate.slug) throw new RepositoryConflictError(CONFLICT_KIND.slug);
      if (other.contentHash === candidate.contentHash) throw new RepositoryConflictError(CONFLICT_KIND.contentHash);
    }
  }

  addSet({ slug: SEEDED_SET_SLUG.outline, name: 'Outline', description: '', style: ICON_SET_STYLE.outline, strokeWidth: 1.5 });
  addSet({ slug: SEEDED_SET_SLUG.solid, name: 'Solid', description: '', style: ICON_SET_STYLE.solid, strokeWidth: null });
  addSet({ slug: SEEDED_SET_SLUG.brand, name: 'Brand', description: '', style: ICON_SET_STYLE.brand, strokeWidth: null });
  addSet({
    slug: SEEDED_SET_SLUG.multicolor,
    name: 'Multi Color',
    description: '',
    style: ICON_SET_STYLE.multicolor,
    strokeWidth: null,
  });

  return {
    sets,
    icons,
    categories,
    auditLog,

    setIdBySlug(slug) {
      const set = Array.from(sets.values()).find((candidate) => candidate.slug === slug);
      if (!set) throw new Error(`No seeded set ${slug}`);
      return set.id;
    },

    categoryIdBySlug(slug) {
      const category = categories.find((candidate) => candidate.slug === slug);
      if (!category) throw new Error(`No seeded category ${slug}`);
      return category.id;
    },

    async listCategories() {
      return categories;
    },

    async countIconsByCategory(statuses) {
      const counts = new Map<string | null, number>();
      for (const icon of icons.values()) {
        if (!statuses.includes(icon.status)) continue;
        counts.set(icon.categoryId, (counts.get(icon.categoryId) ?? 0) + 1);
      }
      return counts;
    },

    async listSets() {
      return Array.from(sets.values());
    },

    async getSet(id) {
      return sets.get(id) ?? null;
    },

    async createSet(input) {
      return addSet(input);
    },

    async updateSet(id, patch) {
      const set = sets.get(id);
      if (!set) return null;
      const updated = { ...set, ...patch };
      sets.set(id, updated);
      return updated;
    },

    async listIcons(filter) {
      const terms = [filter.query, ...(filter.alternativeQueries ?? [])]
        .map((term) => term?.trim().toLowerCase() ?? '')
        .filter((term) => term.length > 0);
      const matchesSearch = (icon: IconRecord) =>
        terms.length === 0 ||
        terms.some((term) => icon.slug.includes(toSlugSearchTerm(term)) || icon.name.toLowerCase().includes(term));
      const byName = (first: IconRecord, second: IconRecord) =>
        first.slug.localeCompare(second.slug) || first.id.localeCompare(second.id);
      const byRecent = (first: IconRecord, second: IconRecord) =>
        second.updatedAt.localeCompare(first.updatedAt) || first.id.localeCompare(second.id);
      const matching = Array.from(icons.values())
        .filter((icon) => !filter.setId || icon.setId === filter.setId)
        .filter((icon) => !filter.categoryId || icon.categoryId === filter.categoryId)
        .filter((icon) => !filter.status || icon.status === filter.status)
        .filter((icon) => !filter.activeOnly || icon.status !== ICON_STATUS.archived)
        .filter(matchesSearch)
        .sort(filter.orderBy === ICON_LIST_ORDER.name ? byName : byRecent);
      return {
        items: matching.slice(filter.offset, filter.offset + filter.limit).map(toIconSummary),
        total: matching.length,
      };
    },

    async getIcon(id) {
      return icons.get(id) ?? null;
    },

    async findIconsInSet(setId, { slugs, contentHashes }) {
      return Array.from(icons.values())
        .filter((icon) => icon.setId === setId && (slugs.includes(icon.slug) || contentHashes.includes(icon.contentHash)))
        .map(toIconSummary);
    },

    async insertIcon(input) {
      const icon: IconRecord = { ...input, id: randomUUID(), createdAt: FIXED_TIME, updatedAt: FIXED_TIME };
      assertUnique(icon);
      icons.set(icon.id, icon);
      return icon;
    },

    async updateIcon(id, patch) {
      const icon = icons.get(id);
      if (!icon) return null;
      const definedPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
      const updated: IconRecord = { ...icon, ...definedPatch };
      assertUnique(updated);
      icons.set(id, updated);
      return updated;
    },

    async deleteIcon(id) {
      return icons.delete(id);
    },

    async appendAuditLog(entry) {
      auditLog.push(entry);
    },
  };
}
