import type { IconRepository, IconSetRecord, IconSummaryRecord } from '@/server/icons/iconRepository';
import type { IconService } from '@/server/icons/iconService';
import { ICON_SET_STYLE, ICON_STATUS, type IconSetStyle } from '@/shared/constants/icons';

export const MCP_SEARCH_LIMIT = { default: 20, max: 50 } as const;
export const MCP_GET_ICONS_MAX = 30;
const SUGGESTION_COUNT = 3;
const MIN_SUGGESTION_WORD_LENGTH = 3;

// Gợi ý cho AI chọn bộ phù hợp; viết tiếng Anh vì người đọc là agent của nhiều hệ khác nhau.
const USAGE_BY_STYLE: Record<IconSetStyle, string> = {
  [ICON_SET_STYLE.outline]: 'Thin strokes. Default choice for headers, menus, buttons and minimal modern UIs.',
  [ICON_SET_STYLE.solid]: 'Filled shapes. Good for active/selected states, tab bars and primary actions.',
  [ICON_SET_STYLE.brand]: 'Monochrome brand logos that follow the text color. Use for social links in footers.',
  [ICON_SET_STYLE.multicolor]: 'Keeps original colors (colored logos, flags, payment methods). Do not recolor with CSS.',
};

const USAGE_BY_SET_SLUG: Record<string, string> = {
  round: 'Filled shapes with rounded corners. Friendly, soft look.',
  sharp: 'Filled shapes with square corners. Strict, technical look.',
  'two-tone': 'Filled shape plus a lighter layer (opacity) in the same color. Decorative, illustrative look.',
};

export class McpCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpCatalogError';
  }
}

export interface McpIconSet {
  slug: string;
  name: string;
  style: IconSetStyle;
  iconCount: number;
  usage: string;
}

export interface McpIconCategory {
  slug: string;
  name: string;
  iconCount: number;
}

export interface McpIconSummary {
  slug: string;
  name: string;
  set: string;
  category: string | null;
  tags: string[];
}

export interface McpIcon extends McpIconSummary {
  svg: string;
  keepsOriginalColors: boolean;
}

export interface McpSearchInput {
  query?: string;
  category?: string;
  set?: string;
  limit?: number;
}

export interface McpSearchResult {
  total: number;
  items: McpIconSummary[];
}

export interface McpGetIconsResult {
  set: string;
  icons: McpIcon[];
  missing: Array<{ slug: string; suggestions: string[] }>;
}

interface CatalogDeps {
  service: IconService;
  repository: IconRepository;
}

export function createIconCatalog({ service, repository }: CatalogDeps) {
  async function loadSets(): Promise<IconSetRecord[]> {
    return service.listSets();
  }

  async function requireSet(slug: string): Promise<IconSetRecord> {
    const sets = await loadSets();
    const set = sets.find((candidate) => candidate.slug === slug);
    if (!set) {
      throw new McpCatalogError(`Unknown set "${slug}". Available sets: ${sets.map((candidate) => candidate.slug).join(', ')}.`);
    }
    return set;
  }

  async function categorySlugById(): Promise<Map<string, string>> {
    return new Map((await repository.listCategories()).map((category) => [category.id, category.slug]));
  }

  function toSummary(icon: IconSummaryRecord, setSlug: string, categorySlugs: Map<string, string>): McpIconSummary {
    return {
      slug: icon.slug,
      name: icon.name,
      set: setSlug,
      category: icon.categoryId ? (categorySlugs.get(icon.categoryId) ?? null) : null,
      tags: icon.tags,
    };
  }

  // Thử cả slug trước, rồi từng từ trong slug (từ dài trước) để "cart-bag" vẫn gợi ý được các icon "cart".
  async function suggestSimilar(slug: string, setId: string): Promise<string[]> {
    const words = slug.split('-').filter((word) => word.length >= MIN_SUGGESTION_WORD_LENGTH);
    const terms = [slug, ...words.sort((first, second) => second.length - first.length)];
    for (const term of new Set(terms)) {
      const similar = await service.listPublicIcons({ q: term, setId, page: 1, pageSize: SUGGESTION_COUNT });
      if (similar.items.length > 0) return similar.items.map((candidate) => candidate.slug);
    }
    return [];
  }

  return {
    async listSets(): Promise<McpIconSet[]> {
      const sets = await loadSets();
      const counts = await Promise.all(
        sets.map((set) => repository.listIcons({ setId: set.id, status: ICON_STATUS.published, offset: 0, limit: 1 })),
      );
      return sets.map((set, index) => ({
        slug: set.slug,
        name: set.name,
        style: set.style,
        iconCount: counts[index]?.total ?? 0,
        usage: USAGE_BY_SET_SLUG[set.slug] ?? USAGE_BY_STYLE[set.style],
      }));
    },

    async listCategories(): Promise<McpIconCategory[]> {
      const { items } = await service.listCategories([ICON_STATUS.published]);
      return items
        .filter((category) => category.iconCount > 0)
        .map((category) => ({ slug: category.slug, name: category.name, iconCount: category.iconCount }));
    },

    async searchIcons(input: McpSearchInput): Promise<McpSearchResult> {
      const limit = Math.min(Math.max(1, input.limit ?? MCP_SEARCH_LIMIT.default), MCP_SEARCH_LIMIT.max);
      const sets = await loadSets();
      const set = input.set ? await requireSet(input.set) : undefined;
      const result = await service.listPublicIcons({
        q: input.query,
        categorySlug: input.category,
        setId: set?.id,
        page: 1,
        pageSize: limit,
      });
      const setSlugById = new Map(sets.map((candidate) => [candidate.id, candidate.slug]));
      const categorySlugs = await categorySlugById();
      return {
        total: result.total,
        items: result.items.map((icon) => ({
          slug: icon.slug,
          name: icon.name,
          set: setSlugById.get(icon.setId) ?? '',
          category: icon.categoryId ? (categorySlugs.get(icon.categoryId) ?? null) : null,
          tags: icon.tags,
        })),
      };
    },

    async getIcons(setSlug: string, slugs: string[]): Promise<McpGetIconsResult> {
      const requested = Array.from(new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean)));
      if (requested.length === 0) throw new McpCatalogError('Provide at least one icon slug.');
      if (requested.length > MCP_GET_ICONS_MAX) {
        throw new McpCatalogError(`Request at most ${MCP_GET_ICONS_MAX} icons per call; split the list into several calls.`);
      }

      const set = await requireSet(setSlug);
      const categorySlugs = await categorySlugById();
      const found = (await repository.findIconsInSet(set.id, { slugs: requested, contentHashes: [] })).filter(
        (icon) => icon.status === ICON_STATUS.published,
      );
      const foundBySlug = new Map(found.map((icon) => [icon.slug, icon]));

      const icons: McpIcon[] = [];
      const missing: McpGetIconsResult['missing'] = [];
      for (const slug of requested) {
        const icon = foundBySlug.get(slug);
        if (icon) {
          icons.push({ ...toSummary(icon, set.slug, categorySlugs), svg: icon.svg, keepsOriginalColors: icon.isMulticolor });
          continue;
        }
        const suggestions = await suggestSimilar(slug, set.id);
        missing.push({ slug, suggestions });
      }
      return { set: set.slug, icons, missing };
    },
  };
}

export type IconCatalog = ReturnType<typeof createIconCatalog>;
