import { describe, expect, it } from 'vitest';
import { createPublicRateLimiter, PUBLIC_RATE_LIMIT } from '@/server/middleware/publicApiGuard';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { ICON_STATUS } from '@/shared/constants/icons';
import type {
  CreateIconsResponse,
  IconCategoryListResponse,
  PublicIconListResponse,
  PublishDraftsResponse,
} from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient, createTestApp } from '../testApp';

const STROKED = (d: string) => `<svg viewBox="0 0 24 24"><path d="${d}" stroke="currentColor"/></svg>`;

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

async function createIcon(send: Awaited<ReturnType<typeof createSignedInClient>>['send'], setId: string, slug: string, d: string, status: string) {
  const body = await json<CreateIconsResponse>(
    await send('POST', API_ROUTE.adminIcons, {
      status,
      items: [{ source: { text: STROKED(d) }, candidateIndex: 0, setId, slug }],
    }),
  );
  const [result] = body.results;
  if (!result?.ok) throw new Error(`Could not create ${slug}`);
  return result.icon.id;
}

async function setupLibrary() {
  const client = await createSignedInClient();
  const setId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
  await createIcon(client.send, setId, 'arrow-down', 'M12 4v16M6 14l6 6 6-6', ICON_STATUS.published);
  await createIcon(client.send, setId, 'chevron-right', 'M9 6l6 6-6 6', ICON_STATUS.draft);
  const cartId = await createIcon(client.send, setId, 'shopping-cart', 'M3 4h2l2 11h11l2-7H6', ICON_STATUS.published);
  await client.send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconArchive, { id: cartId }));
  return { ...client, setId };
}

describe('public icon API', () => {
  it('lists only published icons, without admin-only fields, and needs no login', async () => {
    const { app } = await setupLibrary();
    const response = await app.request(API_ROUTE.publicIcons);
    const body = await json<PublicIconListResponse>(response);

    expect(response.status).toBe(200);
    expect(body.items.map((icon) => icon.slug)).toEqual(['arrow-down']);
    expect(Object.keys(body.items[0] ?? {})).not.toEqual(expect.arrayContaining(['sourceSvg', 'status', 'contentHash']));
  });

  it('filters by category slug and returns nothing for an unknown category', async () => {
    const { app } = await setupLibrary();
    const totalFor = async (slug: string) =>
      (await json<PublicIconListResponse>(await app.request(`${API_ROUTE.publicIcons}?categorySlug=${slug}`))).total;

    expect(await totalFor('arrows')).toBe(1);
    expect(await totalFor('chevrons')).toBe(0);
    expect(await totalFor('no-such-category')).toBe(0);
  });

  it('counts only published icons per category', async () => {
    const { app } = await setupLibrary();
    const body = await json<IconCategoryListResponse>(await app.request(API_ROUTE.publicIconCategories));
    const countOf = (slug: string) => body.items.find((category) => category.slug === slug)?.iconCount;

    expect(countOf('arrows')).toBe(1);
    expect(countOf('chevrons')).toBe(0);
    expect(countOf('commerce')).toBe(0);
    expect(body.totalCount).toBe(1);
  });

  it('lets browsers and the CDN cache successful reads', async () => {
    const response = await createTestApp().request(API_ROUTE.publicIconSets);

    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  });

  it('sorts icons alphabetically by slug in All Icons', async () => {
    const { app, send, setId } = await setupLibrary();
    await createIcon(send, setId, 'bell', 'M6 16v-5a6 6 0 0 1 12 0v5', ICON_STATUS.published);
    await createIcon(send, setId, 'zoom-in', 'M11 18a7 7 0 1 0 0-14', ICON_STATUS.published);
    const body = await json<PublicIconListResponse>(await app.request(API_ROUTE.publicIcons));

    expect(body.items.map((icon) => icon.slug)).toEqual(['arrow-down', 'bell', 'zoom-in']);
  });

  it('searches the whole library, not only the loaded page, and accepts spaces for dashes', async () => {
    const { app, send, setId } = await setupLibrary();
    await createIcon(send, setId, 'bell', 'M6 16v-5a6 6 0 0 1 12 0v5', ICON_STATUS.published);
    await createIcon(send, setId, 'zoom-in', 'M11 18a7 7 0 1 0 0-14', ICON_STATUS.published);

    const firstPageOnly = await json<PublicIconListResponse>(await app.request(`${API_ROUTE.publicIcons}?pageSize=1`));
    const searchLastIcon = await json<PublicIconListResponse>(await app.request(`${API_ROUTE.publicIcons}?pageSize=1&q=zoom`));
    const searchWithSpace = await json<PublicIconListResponse>(await app.request(`${API_ROUTE.publicIcons}?q=Arrow%20Down`));

    expect(firstPageOnly.items.map((icon) => icon.slug)).toEqual(['arrow-down']);
    expect(searchLastIcon.items.map((icon) => icon.slug)).toEqual(['zoom-in']);
    expect(searchWithSpace.items.map((icon) => icon.slug)).toEqual(['arrow-down']);
  });

  it('pages through the full list without repeating or skipping icons', async () => {
    const { app, send, setId } = await setupLibrary();
    await createIcon(send, setId, 'bell', 'M6 16v-5a6 6 0 0 1 12 0v5', ICON_STATUS.published);
    await createIcon(send, setId, 'zoom-in', 'M11 18a7 7 0 1 0 0-14', ICON_STATUS.published);
    const pageOf = async (page: number) =>
      (await json<PublicIconListResponse>(await app.request(`${API_ROUTE.publicIcons}?pageSize=1&page=${page}`))).items;

    const slugs = [...(await pageOf(1)), ...(await pageOf(2)), ...(await pageOf(3))].map((icon) => icon.slug);

    expect(slugs).toEqual(['arrow-down', 'bell', 'zoom-in']);
  });

  it('answers 429 when the rate limiter refuses the client', async () => {
    const response = await createTestApp({ publicRateLimiter: { allow: () => false } }).request(API_ROUTE.publicIcons);

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.tooManyRequests } });
  });
});

describe('public rate limiter', () => {
  it('allows the configured number of requests per window and then recovers', () => {
    let now = 0;
    const limiter = createPublicRateLimiter(() => now);

    for (let index = 0; index < PUBLIC_RATE_LIMIT.maxRequests; index += 1) {
      expect(limiter.allow('client-a')).toBe(true);
    }
    expect(limiter.allow('client-a')).toBe(false);
    expect(limiter.allow('client-b')).toBe(true);

    now += PUBLIC_RATE_LIMIT.windowMs + 1;
    expect(limiter.allow('client-a')).toBe(true);
  });
});

describe('publish drafts', () => {
  it('publishes every draft so it becomes visible publicly', async () => {
    const { app, send } = await setupLibrary();
    const result = await json<PublishDraftsResponse>(await send('POST', API_ROUTE.adminIconsPublishDrafts, {}));
    const publicList = await json<PublicIconListResponse>(await app.request(API_ROUTE.publicIcons));

    expect(result.published).toBe(1);
    expect(publicList.items.map((icon) => icon.slug).sort()).toEqual(['arrow-down', 'chevron-right']);
  });

  it('only publishes drafts in the requested category', async () => {
    const { send, iconRepository } = await setupLibrary();
    const result = await json<PublishDraftsResponse>(
      await send('POST', API_ROUTE.adminIconsPublishDrafts, { categoryId: iconRepository.categoryIdBySlug('arrows') }),
    );

    expect(result.published).toBe(0);
  });
});
