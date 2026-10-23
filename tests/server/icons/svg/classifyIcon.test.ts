import { describe, expect, it } from 'vitest';
import { processSvgSource } from '@/server/icons/svg/processSvgSource';
import { ICON_SET_STYLE, STYLE_REASON } from '@/shared/constants/icons';
import { autoSet } from './setChoices';

function classify(source: string, sourceName: string | null = null) {
  const [candidate] = processSvgSource(source, { ...autoSet(), sourceName }).candidates;
  return { style: candidate?.detectedStyle, reason: candidate?.styleReason, setId: candidate?.setId };
}

describe('icon style classification', () => {
  it.each([
    [
      'a stroked path relying on CSS for fill: none (theme ic-search)',
      '<svg><symbol id="ic-search" viewBox="0 0 192 192"><path d="M87 150c35 0 63-28 63-63S122 24 87 24 24 52 24 87s28 63 63 63ZM131 131l37 37" stroke="currentColor" stroke-linecap="round"/></symbol></svg>',
    ],
    [
      'stroked paths under fill="none" (theme ic-gift)',
      '<svg><symbol id="ic-gift" viewBox="0 0 28 28" fill="none"><path d="M14 7v18M4 14h20v8H4z" stroke="currentColor" stroke-width="2"/></symbol></svg>',
    ],
    [
      'stroke given through a style attribute (theme ic-store)',
      '<svg><symbol id="ic-store" viewBox="0 0 64 64"><g style="fill:none;stroke:currentColor;stroke-width:2"><path d="m36 36h12v22h-12z"/><path d="m56 30v28h-48v-28"/></g></symbol></svg>',
    ],
    [
      'mostly strokes with one small filled dot',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/></svg>',
    ],
    [
      'an id of "x" (close icon), which must not be mistaken for the X brand',
      '<svg><symbol id="ic-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor"/></symbol></svg>',
    ],
  ])('detects outline for %s', (_label, source) => {
    expect(classify(source)).toEqual({ style: ICON_SET_STYLE.outline, reason: STYLE_REASON.strokes, setId: 'set-outline' });
  });

  it.each([
    [
      'filled paths under fill="none" on the symbol (theme ic-cart-plus)',
      '<svg><symbol id="ic-cart-plus" viewBox="0 0 28 28" fill="none"><path d="M3 2h4l2 12h12l3-8H7z" fill="currentColor"/><circle cx="9" cy="24" r="2" fill="currentColor"/></symbol></svg>',
    ],
    ['a path without any paint attributes', '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>'],
  ])('detects solid for %s', (_label, source) => {
    expect(classify(source)).toEqual({ style: ICON_SET_STYLE.solid, reason: STYLE_REASON.fills, setId: 'set-solid' });
  });

  it('sends a multicolor icon without a brand name to Multi Color (theme ic-play-video)', () => {
    const source =
      '<svg><symbol id="ic-play-video" viewBox="0 0 50 50"><circle cx="25" cy="25" r="25" fill="#404040"/><path d="M19 13v24l19-12z" fill="white"/></symbol></svg>';

    expect(classify(source)).toEqual({
      style: ICON_SET_STYLE.multicolor,
      reason: STYLE_REASON.multicolor,
      setId: 'set-multicolor',
    });
  });

  it('sends a multicolor logo to Multi Color even though its name is a brand', () => {
    const source =
      '<svg><symbol id="ic-youtube" viewBox="0 0 24 24"><rect width="24" height="18" y="3" rx="4" fill="#ff0000"/><path d="M10 8v8l6-4z" fill="#ffffff"/></symbol></svg>';

    expect(classify(source)).toEqual({
      style: ICON_SET_STYLE.multicolor,
      reason: STYLE_REASON.multicolor,
      setId: 'set-multicolor',
    });
  });

  it('keeps a monochrome logo in Brand when its single color is neutral (GitHub black, white variants)', () => {
    const black = '<svg viewBox="0 0 24 24" id="ic-github"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="#000000"/></svg>';
    const white = '<svg viewBox="0 0 24 24" id="ic-facebook"><path d="M4 4h16v16H4z" fill="#FFF"/></svg>';
    const nearGray = '<svg viewBox="0 0 24 24" id="ic-figma"><path d="M4 4h16v16H4z" fill="rgb(120, 122, 125)"/></svg>';

    for (const source of [black, white, nearGray]) {
      expect(classify(source)).toMatchObject({ style: ICON_SET_STYLE.brand, setId: 'set-brand' });
    }
  });

  it('sends a logo with its own single brand color to Multi Color (Facebook blue)', () => {
    const source = '<svg viewBox="0 0 24 24" id="ic-facebook"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="#1877F2"/></svg>';

    expect(classify(source)).toEqual({
      style: ICON_SET_STYLE.multicolor,
      reason: STYLE_REASON.brandName,
      setId: 'set-multicolor',
    });
  });

  it.each([
    ['ic-zalo', null],
    ['ic-facebook', null],
    [null, 'Tiktok Logo.svg'],
  ])('detects brand from the name (id %s, file %s)', (sourceId, fileName) => {
    const idAttribute = sourceId ? ` id="${sourceId}"` : '';
    const source = `<svg viewBox="0 0 24 24"${idAttribute}><path d="M4 4h16v16H4z" fill="currentColor"/></svg>`;

    expect(classify(source, fileName)).toMatchObject({ style: ICON_SET_STYLE.brand, reason: STYLE_REASON.brandName });
  });

  it('normalizes each icon of a mixed sprite for its own detected set', () => {
    const sprite = `<svg>
<symbol id="ic-search" viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" stroke="currentColor"/></symbol>
<symbol id="ic-cart-plus" viewBox="0 0 24 24"><path d="M3 4h18l-2 9H6z" fill="currentColor"/></symbol>
</svg>`;
    const [outline, solid] = processSvgSource(sprite, autoSet()).candidates;

    expect(outline?.svg).toMatch(/^<svg[^>]*fill="none"[^>]*stroke="currentColor"/);
    expect(solid?.svg).toMatch(/^<svg[^>]*fill="currentColor"/);
    expect(solid?.svg).not.toMatch(/stroke-width/);
  });

  it('reports when no set accepts the detected style', () => {
    const [candidate] = processSvgSource('<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>', {
      chooseSet: () => null,
    }).candidates;

    expect(candidate?.isValid).toBe(false);
    expect(candidate?.detectedStyle).toBe(ICON_SET_STYLE.solid);
    expect(candidate?.issues.map((issue) => issue.code)).toContain('NO_MATCHING_SET');
  });
});
