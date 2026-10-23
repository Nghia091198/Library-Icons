import { describe, expect, it } from 'vitest';
import { createIconService } from '@/server/icons/iconService';
import { createIconCatalog, MCP_GET_ICONS_MAX, McpCatalogError } from '@/server/mcp/iconCatalog';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { CreateIconsRequest } from '@/shared/types/icons';
import { createInMemoryIconRepository, SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';

const ACTOR = 'test';

async function setupCatalog() {
  const repository = createInMemoryIconRepository();
  const service = createIconService({ repository });
  const outlineId = repository.setIdBySlug(SEEDED_SET_SLUG.outline);

  async function addIcon(slug: string, d: string, status: CreateIconsRequest['status']) {
    const response = await service.createIcons(
      {
        status,
        items: [{ source: { text: `<svg viewBox="0 0 24 24"><path d="${d}" stroke="currentColor"/></svg>` }, candidateIndex: 0, setId: outlineId, slug }],
      },
      ACTOR,
    );
    if (!response.results[0]?.ok) throw new Error(`Could not create ${slug}`);
  }

  await addIcon('shopping-cart', 'M3 4h2l2 11h11l2-7H6', ICON_STATUS.published);
  await addIcon('arrow-down', 'M12 4v16M6 14l6 6 6-6', ICON_STATUS.published);
  await addIcon('chevron-right', 'M9 6l6 6-6 6', ICON_STATUS.draft);
  return createIconCatalog({ service, repository });
}

describe('MCP icon catalog', () => {
  it('lists sets by slug with published counts and usage hints', async () => {
    const catalog = await setupCatalog();
    const outline = (await catalog.listSets()).find((set) => set.slug === SEEDED_SET_SLUG.outline);

    expect(outline).toMatchObject({ slug: 'outline', iconCount: 2 });
    expect(outline?.usage).toMatch(/default/i);
  });

  it('lists only categories that have published icons', async () => {
    const catalog = await setupCatalog();
    const slugs = (await catalog.listCategories()).map((category) => category.slug);

    expect(slugs).toEqual(expect.arrayContaining(['commerce', 'arrows']));
    expect(slugs).not.toContain('chevrons');
  });

  it('searches published icons by keyword and set slug, without SVG', async () => {
    const catalog = await setupCatalog();
    const result = await catalog.searchIcons({ query: 'cart', set: 'outline' });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual({ slug: 'shopping-cart', name: expect.any(String), set: 'outline', category: 'commerce', tags: [] });
  });

  it('explains an unknown set by listing the valid ones', async () => {
    const catalog = await setupCatalog();

    await expect(catalog.searchIcons({ set: 'neon' })).rejects.toThrow(McpCatalogError);
    await expect(catalog.searchIcons({ set: 'neon' })).rejects.toThrow(/Available sets: .*outline/);
  });

  it('returns SVG for found icons and suggestions for missing or unpublished ones', async () => {
    const catalog = await setupCatalog();
    const result = await catalog.getIcons('outline', ['shopping-cart', 'cart-bag', 'chevron-right', 'SHOPPING-CART']);

    expect(result.icons.map((icon) => icon.slug)).toEqual(['shopping-cart']);
    expect(result.icons[0]?.svg).toMatch(/^<svg/);
    expect(result.icons[0]?.keepsOriginalColors).toBe(false);
    expect(result.missing).toEqual([
      { slug: 'cart-bag', suggestions: ['shopping-cart'] },
      { slug: 'chevron-right', suggestions: [] },
    ]);
  });

  it('refuses empty and oversized requests with a clear message', async () => {
    const catalog = await setupCatalog();
    const tooMany = Array.from({ length: MCP_GET_ICONS_MAX + 1 }, (_unused, index) => `icon-${index}`);

    await expect(catalog.getIcons('outline', [' '])).rejects.toThrow(/at least one/);
    await expect(catalog.getIcons('outline', tooMany)).rejects.toThrow(/at most 30/);
  });
});
