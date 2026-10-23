import { describe, expect, it } from 'vitest';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { AdminIconStatsResponse, CreateIconsResponse } from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient, createTestApp } from '../testApp';

const STROKED = (d: string) => `<svg viewBox="0 0 24 24"><path d="${d}" stroke="currentColor"/></svg>`;

describe('admin icon stats', () => {
  it('counts icons by status and active icons by set', async () => {
    const { send, iconRepository } = await createSignedInClient();
    const outlineId = iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
    const create = async (slug: string, d: string, status: string) => {
      const body = (await (
        await send('POST', API_ROUTE.adminIcons, { status, items: [{ source: { text: STROKED(d) }, candidateIndex: 0, setId: outlineId, slug }] })
      ).json()) as CreateIconsResponse;
      const [result] = body.results;
      if (!result?.ok) throw new Error(`Could not create ${slug}`);
      return result.icon.id;
    };

    await create('arrow-down', 'M12 4v16', ICON_STATUS.draft);
    await create('arrow-up', 'M12 20V4', ICON_STATUS.published);
    const archivedId = await create('arrow-left', 'M20 12H4', ICON_STATUS.published);
    await send('POST', fillRoute(API_ROUTE_TEMPLATE.adminIconArchive, { id: archivedId }));

    const stats = (await (await send('GET', API_ROUTE.adminIconStats)).json()) as AdminIconStatsResponse;

    expect(stats.total).toBe(3);
    expect(stats.byStatus).toEqual({ draft: 1, published: 1, archived: 1 });
    expect(stats.bySet.find((entry) => entry.setId === outlineId)?.count).toBe(2);
  });

  it('requires an admin session', async () => {
    const response = await createTestApp().request(API_ROUTE.adminIconStats);

    expect(response.status).toBe(401);
  });
});
