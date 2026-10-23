import { describe, expect, it } from 'vitest';
import { categorizeIcon, ICON_CATEGORY_SLUG as C } from '@/server/icons/categorizeIcon';
import { ICON_SET_STYLE } from '@/shared/constants/icons';

const outline = (slug: string, sourceGroup?: string) =>
  categorizeIcon({ slug, setStyle: ICON_SET_STYLE.outline, sourceGroup });

describe('categorizeIcon', () => {
  it.each([
    ['arrow-down', C.arrows],
    ['arrow-90deg-down', C.arrows],
    ['chevron-right', C.chevrons],
    ['keyboard-arrow-down', C.arrows],
    ['caret-up', C.chevrons],
    ['shopping-cart', C.commerce],
    ['add-shopping-cart', C.commerce],
    ['local-shipping', C.shipping],
    ['credit-card', C.payment],
    ['mail', C.communication],
    ['person-add', C.users],
    ['calendar-today', C.dateTime],
    ['map-pin', C.maps],
    ['play-circle', C.media],
    ['cloud-upload', C.files],
    ['bluetooth', C.devices],
    ['lock', C.security],
    ['search', C.navigation],
    ['delete', C.actions],
    ['something-unknown', C.other],
  ])('puts %s in %s', (slug, expected) => {
    expect(outline(slug)).toBe(expected);
  });

  it('prefers a chevron keyword over the Figma "Arrow" group', () => {
    expect(outline('chevron-left', 'Arrow')).toBe(C.chevrons);
  });

  it('falls back to the Figma group when the name gives no hint', () => {
    expect(outline('alternate-email', 'Communication')).toBe(C.communication);
    expect(outline('xyz', 'Arrow')).toBe(C.arrows);
  });

  it.each([
    ['3d-rotation', 'Action', C.actions],
    ['crop-portrait', 'Image', C.editor],
    ['local-cafe', 'Maps', C.maps],
    ['sports-soccer', 'Social', C.users],
    ['memory', 'Hardware', C.devices],
    ['add-alert', 'Alert', C.alerts],
    ['mode-standby', 'Device', C.devices],
  ])('uses the Material topic for archived icon %s (%s)', (slug, topic, expected) => {
    expect(outline(slug, topic)).toBe(expected);
  });

  it('sends social logos to social and other brand icons to brands', () => {
    expect(categorizeIcon({ slug: 'zalo', setStyle: ICON_SET_STYLE.brand })).toBe(C.social);
    expect(categorizeIcon({ slug: 'figma', setStyle: ICON_SET_STYLE.brand })).toBe(C.brands);
    expect(categorizeIcon({ slug: 'visa', setStyle: ICON_SET_STYLE.brand })).toBe(C.payment);
    expect(categorizeIcon({ slug: 'vn', setStyle: ICON_SET_STYLE.brand, sourceGroup: 'Country icons' })).toBe(C.countries);
  });
});
