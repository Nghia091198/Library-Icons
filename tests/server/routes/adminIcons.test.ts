import { describe, expect, it } from 'vitest';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { ICON_SET_STYLE, ICON_STATUS } from '@/shared/constants/icons';
import type {
  CreateIconsResponse,
  IconDetailDto,
  IconListResponse,
  IconSetDto,
  IconSetListResponse,
  IconSummaryDto,
  PreviewIconsResponse,
} from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient, createTestApp } from '../testApp';

const SPRITE = `<svg>
  <symbol id="ic-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="currentColor" fill="none"/><path d="M20 20l-4-4" stroke="currentColor"/></symbol>
  <symbol id="ic-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.4 11h10.2L20 8H6.2" stroke="currentColor"/></symbol>
  <symbol id="ic-broken" viewBox="0 0 24 24"><title>nothing to draw</title></symbol>
</svg>`;

const MIXED_SPRITE = `<svg>
  <symbol id="ic-search" viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" stroke="currentColor"/></symbol>
  <symbol id="ic-cart-plus" viewBox="0 0 24 24"><path d="M3 4h18l-2 9H6z" fill="currentColor"/></symbol>
  <symbol id="ic-zalo" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="currentColor"/></symbol>
</svg>`;

const SINGLE_ICON = '<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="currentColor"/></svg>';
const OTHER_ICON = '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke="currentColor"/></svg>';
const iconPath = (id: string) => fillRoute(API_ROUTE_TEMPLATE.adminIcon, { id });

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

async function setupWithIcon(status: 'draft' | 'published' = 'draft') {
  const client = await createSignedInClient();
  const setId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
  const created = await json<CreateIconsResponse>(
    await client.send('POST', API_ROUTE.adminIcons, {
      status,
      items: [{ source: { text: SINGLE_ICON }, candidateIndex: 0, setId, slug: 'minus' }],
    }),
  );
  const [result] = created.results;
  if (!result?.ok) throw new Error('Setup failed to create icon');
  return { ...client, setId, icon: result.icon };
}

describe('admin icon API — access', () => {
  it('requires an admin session', async () => {
    const response = await createTestApp().request(API_ROUTE.adminIcons);

    expect(response.status).toBe(401);
  });

  it('validates path ids', async () => {
    const { send } = await createSignedInClient();

    expect((await send('GET', iconPath('not-a-uuid'))).status).toBe(422);
  });

  it('returns 404 for an unknown icon', async () => {
    const { send } = await createSignedInClient();
    const response = await send('GET', iconPath('00000000-0000-4000-8000-000000000000'));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.notFound } });
  });
});

describe('icon sets', () => {
  it('lists the seeded sets', async () => {
    const { send } = await createSignedInClient();
    const body = await json<IconSetListResponse>(await send('GET', API_ROUTE.adminIconSets));

    expect(body.items.map((set) => set.slug)).toEqual([
      SEEDED_SET_SLUG.outline,
      SEEDED_SET_SLUG.solid,
      SEEDED_SET_SLUG.brand,
      SEEDED_SET_SLUG.multicolor,
    ]);
  });

  it('defaults the stroke width of a new outline set and rejects a duplicate slug', async () => {
    const { send } = await createSignedInClient();
    const created = await send('POST', API_ROUTE.adminIconSets, { slug: 'thin', name: 'Thin', style: 'outline' });
    const duplicate = await send('POST', API_ROUTE.adminIconSets, { slug: 'thin', name: 'Again', style: 'solid' });

    expect(created.status).toBe(201);
    expect((await json<IconSetDto>(created)).strokeWidth).toBe(1.5);
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: ERROR_CODE.slugTaken } });
  });

  it('renames a set', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const id = iconRepository.setIdBySlug(SEEDED_SET_SLUG.brand);
    const response = await send('PATCH', fillRoute(API_ROUTE_TEMPLATE.adminIconSet, { id }), { name: 'Thương hiệu' });

    expect((await json<IconSetDto>(response)).name).toBe('Thương hiệu');
  });
});

describe('preview and create', () => {
  it('previews a sprite without saving anything', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const body = await json<PreviewIconsResponse>(await send('POST', API_ROUTE.adminIconsPreview, { sources: [{ text: SPRITE }] }));
    const candidates = body.sources[0]?.candidates ?? [];

    expect(candidates.map((candidate) => [candidate.suggestedSlug, candidate.isValid])).toEqual([
      ['search', true],
      ['cart', true],
      ['broken', false],
    ]);
    expect(iconRepository.icons.size).toBe(0);
  });

  it('places each icon in the set matching its detected style', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const body = await json<PreviewIconsResponse>(
      await send('POST', API_ROUTE.adminIconsPreview, { sources: [{ text: MIXED_SPRITE }] }),
    );
    const candidates = body.sources[0]?.candidates ?? [];

    expect(candidates.map((candidate) => candidate.detectedStyle)).toEqual([
      ICON_SET_STYLE.outline,
      ICON_SET_STYLE.solid,
      ICON_SET_STYLE.brand,
    ]);
    expect(candidates.map((candidate) => candidate.setId)).toEqual([
      iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline),
      iconRepository.setIdBySlug(SEEDED_SET_SLUG.solid),
      iconRepository.setIdBySlug(SEEDED_SET_SLUG.brand),
    ]);
  });

  it('uses the set chosen by the admin instead of the detected one', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const brandId = iconRepository.setIdBySlug(SEEDED_SET_SLUG.brand);
    const body = await json<PreviewIconsResponse>(
      await send('POST', API_ROUTE.adminIconsPreview, { sources: [{ text: MIXED_SPRITE, setOverrides: { '0': brandId } }] }),
    );
    const [first] = body.sources[0]?.candidates ?? [];

    expect(first?.detectedStyle).toBe(ICON_SET_STYLE.outline);
    expect(first?.setId).toBe(brandId);
    expect(first?.svg).toMatch(/^<svg[^>]*fill="currentColor"/);
  });

  it('flags slug and drawing conflicts with icons already in the set', async () => {
    const { send, icon } = await setupWithIcon();
    const body = await json<PreviewIconsResponse>(
      await send('POST', API_ROUTE.adminIconsPreview, {
        sources: [{ name: 'minus.svg', text: OTHER_ICON }, { text: SINGLE_ICON }],
      }),
    );

    expect(body.sources[0]?.candidates[0]?.slugTakenBy).toEqual({ iconId: icon.id, slug: 'minus' });
    expect(body.sources[1]?.candidates[0]?.duplicateOf).toEqual({ iconId: icon.id, slug: 'minus' });
  });

  it('saves each item into its own set and reports failures per item', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const outlineId = iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
    const solidId = iconRepository.setIdBySlug(SEEDED_SET_SLUG.solid);
    const source = { text: SPRITE };
    const body = await json<CreateIconsResponse>(
      await send('POST', API_ROUTE.adminIcons, {
        status: ICON_STATUS.draft,
        items: [
          { source, candidateIndex: 0, setId: outlineId, slug: 'search', tags: ['tìm kiếm', ' Tìm kiếm ', 'search'] },
          { source, candidateIndex: 1, setId: outlineId, slug: 'search' },
          { source, candidateIndex: 1, setId: solidId, slug: 'search' },
          { source, candidateIndex: 2, setId: outlineId, slug: 'broken' },
          { source, candidateIndex: 9, setId: outlineId, slug: 'missing' },
          { source, candidateIndex: 0, setId: '00000000-0000-4000-8000-000000000000', slug: 'orphan' },
        ],
      }),
    );

    expect(body.results.map((result) => (result.ok ? 'ok' : result.error.code))).toEqual([
      'ok',
      ERROR_CODE.slugTaken,
      'ok',
      ERROR_CODE.invalidIcon,
      ERROR_CODE.invalidIcon,
      ERROR_CODE.notFound,
    ]);
    const [first, , third] = body.results;
    expect(first?.ok && first.icon.tags).toEqual(['tìm kiếm', 'search']);
    expect(first?.ok && first.icon.name).toBe('Search');
    expect(third?.ok && third.icon.setId).toBe(solidId);
    expect(iconRepository.auditLog).toHaveLength(2);
  });

  it('rejects the same drawing twice in one set', async () => {
    const { send, setId } = await setupWithIcon();
    const body = await json<CreateIconsResponse>(
      await send('POST', API_ROUTE.adminIcons, {
        status: ICON_STATUS.draft,
        items: [{ source: { text: SINGLE_ICON }, candidateIndex: 0, setId, slug: 'minus-copy' }],
      }),
    );

    expect(body.results[0]).toMatchObject({ ok: false, error: { code: ERROR_CODE.duplicateIcon } });
  });

  it('stores only the sanitized drawing and keeps the original source for admins', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const setId = iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
    const malicious = '<svg viewBox="0 0 24 24" onload="alert(1)"><script>alert(2)</script><path d="M4 4h16" stroke="currentColor"/></svg>';
    const created = await json<CreateIconsResponse>(
      await send('POST', API_ROUTE.adminIcons, {
        status: ICON_STATUS.draft,
        items: [{ source: { text: malicious }, candidateIndex: 0, setId, slug: 'line' }],
      }),
    );
    const [result] = created.results;
    if (!result?.ok) throw new Error('Expected icon to be created');
    const detail = await json<IconDetailDto>(await send('GET', iconPath(result.icon.id)));

    expect(detail.svg).not.toMatch(/alert|script|onload/);
    expect(detail.sourceSvg).toMatch(/onload/);
  });

  it('publishes immediately when asked to', async () => {
    const { icon } = await setupWithIcon(ICON_STATUS.published);

    expect(icon.status).toBe(ICON_STATUS.published);
    expect(icon.publishedAt).not.toBeNull();
  });
});

describe('listing', () => {
  it('filters by status and search text and paginates', async () => {
    const { send, setId } = await setupWithIcon();
    await send('POST', API_ROUTE.adminIcons, {
      status: ICON_STATUS.published,
      items: [{ source: { text: OTHER_ICON }, candidateIndex: 0, setId, slug: 'plus-line' }],
    });

    const drafts = await json<IconListResponse>(await send('GET', `${API_ROUTE.adminIcons}?status=draft`));
    const search = await json<IconListResponse>(await send('GET', `${API_ROUTE.adminIcons}?q=plus`));
    const firstPage = await json<IconListResponse>(await send('GET', `${API_ROUTE.adminIcons}?pageSize=1`));

    expect(drafts.items.map((icon: IconSummaryDto) => icon.slug)).toEqual(['minus']);
    expect(search.items.map((icon: IconSummaryDto) => icon.slug)).toEqual(['plus-line']);
    expect(firstPage).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(firstPage.items).toHaveLength(1);
  });
});

describe('editing', () => {
  it('lets a draft change its slug but not a published icon', async () => {
    const { send, icon } = await setupWithIcon();
    const renamed = await send('PATCH', iconPath(icon.id), { slug: 'dash', aliases: ['minus'] });
    await send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconPublish, { id: icon.id }));
    const blocked = await send('PATCH', iconPath(icon.id), { slug: 'hyphen' });

    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({ slug: 'dash', aliases: ['minus'] });
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toMatchObject({ error: { code: ERROR_CODE.invalidState } });
  });

  it('rejects an invalid slug', async () => {
    const { send, icon } = await setupWithIcon();

    expect((await send('PATCH', iconPath(icon.id), { slug: 'Not A Slug' })).status).toBe(422);
  });

  it('replaces the drawing and refuses a drawing used by another icon', async () => {
    const { send, setId, icon } = await setupWithIcon();
    const replaced = await json<IconDetailDto>(
      await send('PUT', fillRoute(API_ROUTE_TEMPLATE.adminIconSvg, { id: icon.id }), { source: { text: OTHER_ICON } }),
    );
    await send('POST', API_ROUTE.adminIcons, {
      status: ICON_STATUS.draft,
      items: [{ source: { text: SINGLE_ICON }, candidateIndex: 0, setId, slug: 'minus-again' }],
    });
    const conflict = await send('PUT', fillRoute(API_ROUTE_TEMPLATE.adminIconSvg, { id: icon.id }), {
      source: { text: SINGLE_ICON },
    });

    expect(replaced.contentHash).not.toBe(icon.contentHash);
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: { code: ERROR_CODE.duplicateIcon } });
  });
});

describe('status transitions', () => {
  it('moves draft → published → archived → published and keeps the first publish date', async () => {
    const { send, icon, iconRepository } = await setupWithIcon();
    const at = (template: string) => fillRoute(template, { id: icon.id });

    const published = await json<IconDetailDto>(await send('POST', at(API_ROUTE_TEMPLATE.adminIconPublish)));
    const archived = await json<IconDetailDto>(await send('POST', at(API_ROUTE_TEMPLATE.adminIconArchive)));
    const restored = await json<IconDetailDto>(await send('POST', at(API_ROUTE_TEMPLATE.adminIconRestore)));

    expect([published.status, archived.status, restored.status]).toEqual([
      ICON_STATUS.published,
      ICON_STATUS.archived,
      ICON_STATUS.published,
    ]);
    expect(restored.publishedAt).toBe(published.publishedAt);
    expect(iconRepository.auditLog.map((entry) => entry.action)).toEqual(['create', 'publish', 'archive', 'restore']);
  });

  it('rejects transitions from the wrong status', async () => {
    const { send, icon } = await setupWithIcon();

    const archiveDraft = await send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconArchive, { id: icon.id }));
    const restoreDraft = await send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconRestore, { id: icon.id }));

    expect(archiveDraft.status).toBe(409);
    expect(restoreDraft.status).toBe(409);
  });

  it('deletes a never-published draft but not a published icon', async () => {
    const draft = await setupWithIcon();
    const published = await setupWithIcon(ICON_STATUS.published);

    expect((await draft.send('DELETE', iconPath(draft.icon.id))).status).toBe(204);
    expect(draft.iconRepository.icons.size).toBe(0);
    expect((await published.send('DELETE', iconPath(published.icon.id))).status).toBe(409);
  });
});
