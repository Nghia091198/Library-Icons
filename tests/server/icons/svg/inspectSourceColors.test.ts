import { describe, expect, it } from 'vitest';
import { hasOwnColors, inspectSourceColors } from '@/server/icons/svg/inspectSourceColors';
import { isAchromaticColor } from '@/server/icons/svg/svgPaint';

describe('isAchromaticColor', () => {
  it.each(['#000', '#ffffff', 'white', 'Black', 'grey', '#808080', '#7a7b7d', 'rgb(200, 200, 205)'])('treats %s as neutral', (color) => {
    expect(isAchromaticColor(color)).toBe(true);
  });

  it.each(['#1877f2', '#ff0000', 'red', '#16a34a', 'rgb(37, 99, 235)', 'not-a-color'])('treats %s as a real color', (color) => {
    expect(isAchromaticColor(color)).toBe(false);
  });
});

describe('inspectSourceColors', () => {
  it('flags a single chromatic color as the icon’s own color', () => {
    const colors = inspectSourceColors('<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="#1877F2"/></svg>');

    expect(colors).toEqual({ colorCount: 1, hasChromaticColor: true });
    expect(hasOwnColors(colors)).toBe(true);
  });

  it('does not flag a white-only logo variant', () => {
    expect(hasOwnColors(inspectSourceColors('<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="#fff"/></svg>'))).toBe(false);
  });

  it('flags several colors even when they are all neutral', () => {
    const source = '<svg viewBox="0 0 24 24"><path d="M4 4h8v8H4z" fill="#000"/><path d="M12 12h8v8h-8z" fill="#fff"/></svg>';

    expect(hasOwnColors(inspectSourceColors(source))).toBe(true);
  });

  it('returns null when the source has no icon', () => {
    expect(inspectSourceColors('hello')).toBeNull();
  });
});
