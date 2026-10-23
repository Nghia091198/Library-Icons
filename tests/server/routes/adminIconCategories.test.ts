import { describe, expect, it } from 'vitest';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { CreateIconsResponse, IconCategoryListResponse, IconDetailDto, IconListResponse } from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient } from '../testApp';

const STROKED = (d: string) => `<svg viewBox="0 0 24 24"><path d="${d}" stroke="currentColor"/></svg>`;

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

async function setupLibrary() {
  const client = await createSignedInClient();
  const setId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
  const created = await json<CreateIconsResponse>(
    await client.send('POST', API_ROUTE.adminIcons, {
      status: ICON_STATUS.published,
      items: [
        { source: { text: STROKED('M12 4v16M6 14l6 6 6-6') }, candidateIndex: 0, setId, slug: 'arrow-down' },
        { source: { text: STROKED('M9 6l6 6-6 6') }, candidateIndex: 0, setId, slug: 'chevron-right' },
        { source: { text: STROKED('M3 4h2l2 11h11l2-7H6') }, candidateIndex: 0, setId, slug: 'shopping-cart' },
        { source: { text: STROKED('M4 4l16 16') }, candidateIndex: 0, setId, slug: 'mystery', categoryId: null },
      ],
    }),
  );
  const ids = created.results.map((result) => (result.ok ? result.icon.id : ''));
  return { ...client, setId, ids };
}

describe('icon categories', () => {
  it('assigns a category from the slug unless the item sets one explicitly', async () => {
    const { send, iconRepository, ids } = await setupLibrary();
    const categoryOf = async (id: string | undefined) =>
      (await json<IconDetailDto>(await send('GET', fillRoute(API_ROUTE_TEMPLATE.adminIcon, { id: id ?? '' })))).categoryId;

    expect(await categoryOf(ids[0])).toBe(iconRepository.categoryIdBySlug('arrows'));
    expect(await categoryOf(ids[1])).toBe(iconRepository.categoryIdBySlug('chevrons'));
    expect(await categoryOf(ids[2])).toBe(iconRepository.categoryIdBySlug('commerce'));
    expect(await categoryOf(ids[3])).toBeNull();
  });

  it('lists categories with active icon counts', async () => {
    const { send, ids } = await setupLibrary();
    await send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconArchive, { id: ids[2] ?? '' }));
    const body = await json<IconCategoryListResponse>(await send('GET', API_ROUTE.adminIconCategories));
    const countOf = (slug: string) => body.items.find((category) => category.slug === slug)?.iconCount;

    expect(countOf('arrows')).toBe(1);
    expect(countOf('chevrons')).toBe(1);
    expect(countOf('commerce')).toBe(0);
    expect(body).toMatchObject({ totalCount: 3, uncategorizedCount: 1 });
  });

  it('filters icons by category and hides archived icons when asked', async () => {
    const { send, iconRepository, ids } = await setupLibrary();
    await send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconArchive, { id: ids[0] ?? '' }));
    const arrowsId = iconRepository.categoryIdBySlug('arrows');

    const arrows = await json<IconListResponse>(await send('GET', `${API_ROUTE.adminIcons}?categoryId=${arrowsId}`));
    const activeArrows = await json<IconListResponse>(
      await send('GET', `${API_ROUTE.adminIcons}?categoryId=${arrowsId}&active=true`),
    );

    expect(arrows.total).toBe(1);
    expect(activeArrows.total).toBe(0);
  });

  it('moves an icon to another category and rejects an unknown one', async () => {
    const { send, iconRepository, ids } = await setupLibrary();
    const path = fillRoute(API_ROUTE_TEMPLATE.adminIcon, { id: ids[3] ?? '' });
    const moved = await json<IconDetailDto>(await send('PATCH', path, { categoryId: iconRepository.categoryIdBySlug('actions') }));
    const unknown = await send('PATCH', path, { categoryId: '00000000-0000-4000-8000-000000000000' });

    expect(moved.categoryId).toBe(iconRepository.categoryIdBySlug('actions'));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ error: { code: ERROR_CODE.notFound } });
  });
});
