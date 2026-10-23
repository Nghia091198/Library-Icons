import { describe, expect, it } from 'vitest';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { BULK_ICON_ACTION, BULK_ICON_LIMIT, ICON_STATUS } from '@/shared/constants/icons';
import type { BulkIconResponse, CreateIconsResponse } from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient } from '../testApp';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function setup() {
  const client = await createSignedInClient();
  const setId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
  const create = async (slug: string, d: string, status: string) => {
    const body = (await (
      await client.send('POST', API_ROUTE.adminIcons, {
        status,
        items: [{ source: { text: `<svg viewBox="0 0 24 24"><path d="${d}" stroke="currentColor"/></svg>` }, candidateIndex: 0, setId, slug }],
      })
    ).json()) as CreateIconsResponse;
    const [result] = body.results;
    if (!result?.ok) throw new Error(`Could not create ${slug}`);
    return result.icon.id;
  };
  const ids = {
    draftA: await create('arrow-down', 'M12 4v16', ICON_STATUS.draft),
    draftB: await create('arrow-up', 'M12 20V4', ICON_STATUS.draft),
    published: await create('arrow-left', 'M20 12H4', ICON_STATUS.published),
  };
  const bulk = async (body: Record<string, unknown>) => {
    const response = await client.send('POST', API_ROUTE.adminIconsBulk, body);
    return { status: response.status, body: (await response.json()) as BulkIconResponse };
  };
  return { ...client, ids, bulk };
}

describe('bulk icon actions', () => {
  it('publishes the drafts and skips icons the action does not apply to', async () => {
    const { ids, bulk, iconRepository } = await setup();
    const { body } = await bulk({ action: BULK_ICON_ACTION.publish, ids: [ids.draftA, ids.draftB, ids.published, MISSING_ID] });

    expect(body.succeeded).toBe(2);
    expect(body.failed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ids.published, code: ERROR_CODE.invalidState }),
        expect.objectContaining({ id: MISSING_ID, code: ERROR_CODE.notFound }),
      ]),
    );
    expect((await iconRepository.getIcon(ids.draftA))?.status).toBe(ICON_STATUS.published);
  });

  it('sets and clears the category of every selected icon', async () => {
    const { ids, bulk, iconRepository } = await setup();
    const commerceId = iconRepository.categoryIdBySlug('commerce');

    await bulk({ action: BULK_ICON_ACTION.setCategory, ids: [ids.draftA, ids.published], categoryId: commerceId });
    expect((await iconRepository.getIcon(ids.published))?.categoryId).toBe(commerceId);

    await bulk({ action: BULK_ICON_ACTION.setCategory, ids: [ids.draftA], categoryId: null });
    expect((await iconRepository.getIcon(ids.draftA))?.categoryId).toBeNull();
  });

  it('deletes only drafts that were never published', async () => {
    const { ids, bulk, iconRepository } = await setup();
    const { body } = await bulk({ action: BULK_ICON_ACTION.delete, ids: [ids.draftA, ids.published] });

    expect(body.succeeded).toBe(1);
    expect(await iconRepository.getIcon(ids.draftA)).toBeNull();
    expect(await iconRepository.getIcon(ids.published)).not.toBeNull();
  });

  it('rejects a category change without categoryId, and too many icons at once', async () => {
    const { ids, bulk } = await setup();
    const tooMany = Array.from({ length: BULK_ICON_LIMIT + 1 }, () => ids.draftA);

    expect((await bulk({ action: BULK_ICON_ACTION.setCategory, ids: [ids.draftA] })).status).toBe(422);
    expect((await bulk({ action: BULK_ICON_ACTION.publish, ids: tooMany })).status).toBe(422);
  });

  it('records an audit entry for each icon changed', async () => {
    const { ids, bulk, iconRepository } = await setup();
    const before = iconRepository.auditLog.length;
    await bulk({ action: BULK_ICON_ACTION.publish, ids: [ids.draftA, ids.draftB] });

    expect(iconRepository.auditLog.length - before).toBe(2);
  });
});
