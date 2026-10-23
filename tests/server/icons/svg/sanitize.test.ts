import { describe, expect, it } from 'vitest';
import { processSvgSource } from '@/server/icons/svg/processSvgSource';
import { ICON_SET_STYLE, SVG_ISSUE_CODE } from '@/shared/constants/icons';
import { fixedSet } from './setChoices';

const OUTLINE = fixedSet(ICON_SET_STYLE.outline);
const SAFE_PATH = '<path d="M4 4L20 20"/>';

function processSingle(source: string) {
  const result = processSvgSource(source, OUTLINE);
  const [candidate] = result.candidates;
  if (!candidate) throw new Error(`Expected one candidate, got ${JSON.stringify(result.issues)}`);
  return candidate;
}

function issueCodes(issues: ReadonlyArray<{ code: string }>): string[] {
  return issues.map((issue) => issue.code);
}

describe('SVG sanitizer — unsafe content', () => {
  it.each([
    ['a <script> element', `<svg viewBox="0 0 24 24"><script>alert(1)</script>${SAFE_PATH}</svg>`],
    ['an event handler attribute', '<svg viewBox="0 0 24 24"><path d="M4 4L20 20" onclick="alert(1)"/></svg>'],
    ['an onload handler on the root', `<svg viewBox="0 0 24 24" onload="alert(1)">${SAFE_PATH}</svg>`],
    ['a javascript: link', `<svg viewBox="0 0 24 24"><a href="javascript:alert(1)"><path d="M1 1h2"/></a>${SAFE_PATH}</svg>`],
    ['a foreignObject with HTML', `<svg viewBox="0 0 24 24"><foreignObject><img src="x" onerror="alert(1)"/></foreignObject>${SAFE_PATH}</svg>`],
    ['an external <use> reference', `<svg viewBox="0 0 24 24"><use href="https://evil.example/sprite.svg#x"/>${SAFE_PATH}</svg>`],
    ['an xlink:href image', `<svg viewBox="0 0 24 24" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="https://evil.example/a.png"/>${SAFE_PATH}</svg>`],
    ['a <style> element with @import', `<svg viewBox="0 0 24 24"><style>@import url(https://evil.example/x.css);</style>${SAFE_PATH}</svg>`],
    ['an external url() in a style attribute', '<svg viewBox="0 0 24 24"><path d="M4 4L20 20" style="fill: url(https://evil.example/x)"/></svg>'],
    ['an animation that rewrites attributes', `<svg viewBox="0 0 24 24"><set attributeName="onmouseover" to="alert(1)"/>${SAFE_PATH}</svg>`],
  ])('removes %s and reports it', (_label, source) => {
    const candidate = processSingle(source);

    expect(candidate.isValid).toBe(true);
    expect(candidate.svg).not.toMatch(/script|alert|javascript|onclick|onload|onerror|evil\.example|foreignObject|<use|<image|<style|<set/i);
    expect(issueCodes(candidate.issues)).toContain(SVG_ISSUE_CODE.removedUnsafeContent);
  });

  it('does not expand external entities declared in a DOCTYPE', () => {
    const source = `<?xml version="1.0"?>
<!DOCTYPE svg [<!ENTITY secret SYSTEM "file:///etc/passwd">]>
<svg viewBox="0 0 24 24"><title>&secret;</title>${SAFE_PATH}</svg>`;

    const result = processSvgSource(source, OUTLINE);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/root:|passwd/);
  });

  it('keeps local url(#id) references used by gradients', () => {
    const source = `<svg viewBox="0 0 24 24">
<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs>
<path d="M4 4H20V20H4Z" fill="url(#g)"/></svg>`;

    const result = processSvgSource(source, fixedSet(ICON_SET_STYLE.brand));

    expect(result.candidates[0]?.svg).toMatch(/fill="url\(#[\w-]+\)"/);
  });
});

describe('SVG sanitizer — unsupported content', () => {
  it('drops class, data and editor attributes as informational issues', () => {
    const candidate = processSingle(
      '<svg viewBox="0 0 24 24" class="svg-icon" data-name="x" aria-hidden="true"><path class="p" d="M4 4L20 20"/></svg>',
    );

    expect(candidate.svg).not.toMatch(/class=|data-name|aria-hidden/);
    expect(issueCodes(candidate.issues)).toContain(SVG_ISSUE_CODE.removedUnsupportedContent);
    expect(issueCodes(candidate.issues)).not.toContain(SVG_ISSUE_CODE.removedUnsafeContent);
  });

  it('drops <title> and <desc> silently', () => {
    const candidate = processSingle(`<svg viewBox="0 0 24 24"><title>Cart</title><desc>x</desc>${SAFE_PATH}</svg>`);

    expect(candidate.svg).not.toMatch(/<title|<desc/);
    expect(issueCodes(candidate.issues)).not.toContain(SVG_ISSUE_CODE.removedUnsupportedContent);
  });
});
