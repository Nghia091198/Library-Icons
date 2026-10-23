import { describe, expect, it } from 'vitest';
import { API_ROUTE, API_ROUTE_TEMPLATE, fillRoute } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { CreateIconsResponse, IconDetailDto } from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient } from '../testApp';

const TWO_COLOR_ICON =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#404040"/><path d="M10 8v8l6-4z" fill="#ffffff"/></svg>';

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

async function setupMergedIcon() {
  const client = await createSignedInClient();
  const solidId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.solid);
  const multicolorId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.multicolor);
  const created = await json<CreateIconsResponse>(
    await client.send('POST', API_ROUTE.adminIcons, {
      status: ICON_STATUS.published,
      items: [{ source: { text: TWO_COLOR_ICON }, candidateIndex: 0, setId: solidId, slug: 'play-circle' }],
    }),
  );
  const [result] = created.results;
  if (!result?.ok) throw new Error('Setup failed');
  const movePath = fillRoute(API_ROUTE_TEMPLATE.adminIconMoveSet, { id: result.icon.id });
  return { ...client, solidId, multicolorId, icon: result.icon, movePath };
}

describe('move an icon to another set', () => {
  it('restores original colors when moving a merged icon to Multi Color', async () => {
    const { send, icon, movePath, multicolorId } = await setupMergedIcon();
    const moved = await json<IconDetailDto>(await send('POST', movePath, { setId: multicolorId }));

    expect(icon.svg).not.toMatch(/#404040/i);
    expect(moved.setId).toBe(multicolorId);
    expect(moved.svg).toMatch(/#404040/i);
    expect(moved.isMulticolor).toBe(true);
    expect(moved.status).toBe(ICON_STATUS.published);
  });

  it('keeps slug, category and status, and records the move', async () => {
    const { send, icon, movePath, multicolorId, iconRepository } = await setupMergedIcon();
    const moved = await json<IconDetailDto>(await send('POST', movePath, { setId: multicolorId }));

    expect(moved).toMatchObject({ slug: icon.slug, categoryId: icon.categoryId, status: icon.status });
    expect(iconRepository.auditLog.at(-1)).toMatchObject({ action: 'move_set' });
  });

  it('refuses a move when the slug is already used in the target set', async () => {
    const { send, movePath, multicolorId } = await setupMergedIcon();
    await send('POST', API_ROUTE.adminIcons, {
      status: ICON_STATUS.draft,
      items: [
        {
          source: { text: '<svg viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="#16a34a"/></svg>' },
          candidateIndex: 0,
          setId: multicolorId,
          slug: 'play-circle',
        },
      ],
    });
    const response = await send('POST', movePath, { setId: multicolorId });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: ERROR_CODE.slugTaken } });
  });

  it('returns 404 for an unknown target set', async () => {
    const { send, movePath } = await setupMergedIcon();
    const response = await send('POST', movePath, { setId: '00000000-0000-4000-8000-000000000000' });

    expect(response.status).toBe(404);
  });
});
