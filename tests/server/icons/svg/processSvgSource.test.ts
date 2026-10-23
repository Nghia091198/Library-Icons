import { describe, expect, it } from 'vitest';
import { processSvgSource } from '@/server/icons/svg/processSvgSource';
import { suggestSlug, toSlug } from '@/server/icons/svg/suggestSlug';
import { ICON_SET_STYLE, SVG_ISSUE_CODE } from '@/shared/constants/icons';
import { fixedSet } from './setChoices';

const OUTLINE = fixedSet(ICON_SET_STYLE.outline);
const SOLID = fixedSet(ICON_SET_STYLE.solid);
const BRAND = fixedSet(ICON_SET_STYLE.brand);

const THEME_SPRITE = `<svg style="display: none;">
  <defs>
    <symbol class="svg-icon" id="ic-search" style="--stroke-width: 12px;" aria-hidden="true" viewBox="0 0 192 192">
      <path d="M87 150c34.794 0 63-28.206 63-63s-28.206-63-63-63-63 28.206-63 63 28.206 63 63 63ZM131.55 131.55 168 168" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
    </symbol>
  </defs>
  <defs>
    <symbol class="svg-icon" id="ic-account" viewBox="0 0 192 192">
      <path d="M96 168c39.765 0 72-32.235 72-72 0-39.764-32.235-72-72-72-39.764 0-72 32.236-72 72 0 39.765 32.236 72 72 72Z" stroke="currentColor"></path>
    </symbol>
  </defs>
  <defs>
    <symbol class="svg-icon" id="ic-cart-bag" viewBox="0 0 192 192">
      <path d="M66 78V54a30 30 0 1 1 60 0v24" stroke="currentColor" stroke-width="12"></path>
    </symbol>
  </defs>
</svg>`;

function codes(issues: ReadonlyArray<{ code: string }>): string[] {
  return issues.map((issue) => issue.code);
}

describe('processSvgSource — parsing', () => {
  it('splits a sprite into one candidate per <symbol> with slugs from their ids', () => {
    const result = processSvgSource(THEME_SPRITE, OUTLINE);

    expect(result.candidates.map((candidate) => candidate.suggestedSlug)).toEqual(['search', 'account', 'cart-bag']);
    expect(result.candidates.every((candidate) => candidate.isValid)).toBe(true);
    expect(result.candidates[0]?.line).toBe(3);
  });

  it('treats several top-level <svg> elements as separate icons', () => {
    const source = '<svg viewBox="0 0 24 24"><path d="M1 1h4"/></svg>\n<svg viewBox="0 0 24 24"><path d="M2 2h4"/></svg>';

    expect(processSvgSource(source, OUTLINE).candidates).toHaveLength(2);
  });

  it('uses the file name for the slug of a single icon without an id', () => {
    const result = processSvgSource('<svg viewBox="0 0 24 24"><path d="M1 1h4"/></svg>', {
      ...OUTLINE,
      sourceName: 'Giỏ Hàng.svg',
    });

    expect(result.candidates[0]?.suggestedSlug).toBe('gio-hang');
  });

  it('reports a fatal syntax error with its line number', () => {
    const result = processSvgSource('<svg viewBox="0 0 24 24">\n<path d="M1 1h4">\n</svg>', OUTLINE);

    expect(result.candidates).toHaveLength(0);
    expect(codes(result.issues)).toContain(SVG_ISSUE_CODE.parseError);
    expect(result.issues[0]?.line).toBeGreaterThan(0);
  });

  it('reports when nothing looks like an icon', () => {
    const result = processSvgSource('hello world', OUTLINE);

    expect(codes(result.issues)).toContain(SVG_ISSUE_CODE.noIconFound);
  });

  it('accepts an attribute missing its leading whitespace but warns with the line number', () => {
    const source = '<svg>\n<symbol id="ic-zalo" x="0px" y="0px"viewBox="0 0 50 50"><path d="M9 4h32v42H9z"/></symbol>\n</svg>';
    const [candidate] = processSvgSource(source, BRAND).candidates;
    const warning = candidate?.issues.find((issue) => issue.code === SVG_ISSUE_CODE.parseWarning);

    expect(candidate?.isValid).toBe(true);
    expect(candidate?.suggestedSlug).toBe('zalo');
    expect(warning?.line).toBe(2);
  });
});

describe('processSvgSource — normalization', () => {
  it('rescales a 192 grid to 24 and bakes the transform into the path data', () => {
    const [candidate] = processSvgSource(THEME_SPRITE, OUTLINE).candidates;

    expect(candidate?.svg).toMatch(/viewBox="0 0 24 24"/);
    expect(candidate?.svg).not.toMatch(/transform=/);
    expect(codes(candidate?.issues ?? [])).toContain(SVG_ISSUE_CODE.rescaledToGrid);
  });

  it('gives outline icons a uniform stroke on the root element only', () => {
    const cartBag = processSvgSource(THEME_SPRITE, OUTLINE).candidates[2];

    expect(cartBag?.svg).toMatch(/^<svg[^>]*fill="none"[^>]*stroke="currentColor"[^>]*stroke-width="1.5"/);
    expect(cartBag?.svg?.match(/stroke-width=/g)).toHaveLength(1);
    expect(codes(cartBag?.issues ?? [])).toContain(SVG_ISSUE_CODE.strokeStyleNormalized);
  });

  it('replaces a single hard-coded color with currentColor', () => {
    const [candidate] = processSvgSource('<svg viewBox="0 0 24 24"><path d="M4 4H20V20H4Z" fill="#404040"/></svg>', SOLID).candidates;

    expect(candidate?.svg).not.toMatch(/#404040/i);
    expect(codes(candidate?.issues ?? [])).toContain(SVG_ISSUE_CODE.recoloredToCurrentColor);
  });

  it('keeps several colors in the brand set and marks the icon as multicolor', () => {
    const source = '<svg viewBox="0 0 24 24"><path d="M4 4H12V12H4Z" fill="#ff0000"/><path d="M12 12H20V20H12Z" fill="#0000ff"/></svg>';
    const [candidate] = processSvgSource(source, BRAND).candidates;

    expect(candidate?.isMulticolor).toBe(true);
    expect(candidate?.svg).toMatch(/fill="(red|#f00|#ff0000)"/i);
    expect(candidate?.svg).toMatch(/fill="(blue|#00f|#0000ff)"/i);
  });

  it('merges several colors outside the brand set and warns about it', () => {
    const source = '<svg viewBox="0 0 24 24"><path d="M4 4H12V12H4Z" fill="#ff0000"/><path d="M12 12H20V20H12Z" fill="#0000ff"/></svg>';
    const [candidate] = processSvgSource(source, SOLID).candidates;

    expect(candidate?.isMulticolor).toBe(false);
    expect(codes(candidate?.issues ?? [])).toContain(SVG_ISSUE_CODE.mergedMultipleColors);
  });

  it('makes a single-color logo monochrome in the Brand set', () => {
    const [candidate] = processSvgSource(
      '<svg viewBox="0 0 24 24" id="ic-facebook"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="#1877F2"/></svg>',
      BRAND,
    ).candidates;

    expect(candidate?.svg).not.toMatch(/#1877f2/i);
    expect(candidate?.isMulticolor).toBe(false);
  });

  it('still lets a currentColor logo follow the text color in the Brand set', () => {
    const [candidate] = processSvgSource('<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="currentColor"/></svg>', BRAND)
      .candidates;

    expect(candidate?.isMulticolor).toBe(false);
    expect(candidate?.svg).toMatch(/currentColor/);
  });

  it('always keeps original colors in the Multi Color set, even a single one', () => {
    const multicolor = fixedSet(ICON_SET_STYLE.multicolor);
    const single = processSvgSource('<svg viewBox="0 0 24 24"><path d="M4 4H20V20H4Z" fill="#16a34a"/></svg>', multicolor);
    const several = processSvgSource(
      '<svg viewBox="0 0 24 24"><path d="M4 4H12V12H4Z" fill="#ff0000"/><path d="M12 12H20V20H12Z" fill="#0000ff"/></svg>',
      multicolor,
    );

    expect(single.candidates[0]?.svg).toMatch(/#16a34a/i);
    expect(single.candidates[0]?.isMulticolor).toBe(true);
    expect(codes(several.candidates[0]?.issues ?? [])).toContain(SVG_ISSUE_CODE.multicolorKept);
  });

  it('falls back to width and height when viewBox is missing', () => {
    const [candidate] = processSvgSource('<svg width="48" height="48"><path d="M8 8H40V40H8Z"/></svg>', SOLID).candidates;

    expect(candidate?.isValid).toBe(true);
    expect(candidate?.svg).toMatch(/viewBox="0 0 24 24"/);
  });

  it('rejects an icon without any size information', () => {
    const [candidate] = processSvgSource('<svg><path d="M8 8H40V40H8Z"/></svg>', SOLID).candidates;

    expect(candidate?.isValid).toBe(false);
    expect(codes(candidate?.issues ?? [])).toContain(SVG_ISSUE_CODE.missingViewBox);
  });

  it('rejects an icon with nothing to draw', () => {
    const [candidate] = processSvgSource('<svg viewBox="0 0 24 24"><title>empty</title></svg>', SOLID).candidates;

    expect(candidate?.isValid).toBe(false);
    expect(codes(candidate?.issues ?? [])).toContain(SVG_ISSUE_CODE.emptyIcon);
  });

  it('produces the same hash for the same icon written as a symbol or a standalone svg', () => {
    const asSymbol = '<svg><symbol id="ic-x" viewBox="0 0 24 24"><path d="M4 4L20 20"/></symbol></svg>';
    const asSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="x" viewBox="0 0 24 24">\n  <path d="M4 4 L20 20" />\n</svg>';

    const fromSymbol = processSvgSource(asSymbol, OUTLINE).candidates[0]?.contentHash;
    const fromSvg = processSvgSource(asSvg, OUTLINE).candidates[0]?.contentHash;

    expect(fromSymbol).toBeTruthy();
    expect(fromSymbol).toBe(fromSvg);
  });

  it('converts rounded rectangles so rescaling leaves no transform behind', () => {
    const [candidate] = processSvgSource('<svg viewBox="0 0 48 48"><rect x="10" y="10" width="28" height="28" rx="4"/></svg>', OUTLINE).candidates;

    expect(candidate?.svg).not.toMatch(/transform=|<rect/);
  });
});

describe('slug suggestions', () => {
  it.each([
    ['ic-search', 'search'],
    ['icon-cart-bag', 'cart-bag'],
    ['ic-mail-envolope', 'mail-envolope'],
    ['IC_Arrow Right', 'arrow-right'],
  ])('turns id %s into %s', (sourceId, expected) => {
    expect(suggestSlug(sourceId, null, 0)).toBe(expected);
  });

  it('falls back to a numbered slug', () => {
    expect(suggestSlug(null, null, 4)).toBe('icon-5');
  });

  it('removes Vietnamese diacritics', () => {
    expect(toSlug('Đơn hàng mới')).toBe('don-hang-moi');
  });
});
