import { classifyIcon } from '@/server/icons/svg/classifyIcon';
import { normalizeIcon } from '@/server/icons/svg/normalizeIcon';
import { parseSvgSource } from '@/server/icons/svg/parseSvgSource';
import { sanitizeIcon } from '@/server/icons/svg/sanitizeIcon';
import { suggestSlug } from '@/server/icons/svg/suggestSlug';
import { createIssue, hasBlockingIssue } from '@/server/icons/svg/svgIssue';
import { SVG_ISSUE_CODE, SVG_SOURCE_LIMIT, type IconSetStyle } from '@/shared/constants/icons';
import type { IconCandidate, SvgIssue, SvgSourceResult } from '@/shared/types/icons';

export interface SetChoice {
  setId: string;
  style: IconSetStyle;
  strokeWidth: number | null;
}

export type ChooseSet = (candidate: { index: number; detectedStyle: IconSetStyle }) => SetChoice | null;

export interface ProcessSvgSourceOptions {
  chooseSet: ChooseSet;
  sourceName?: string | null;
}

export interface ProcessedCandidate extends IconCandidate {
  sourceSvg: string;
}

export interface ProcessedSource extends Omit<SvgSourceResult, 'candidates'> {
  candidates: ProcessedCandidate[];
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

export function processSvgSource(source: string, options: ProcessSvgSourceOptions): ProcessedSource {
  const sourceName = options.sourceName ?? null;
  const rejected = (issue: SvgIssue): ProcessedSource => ({ sourceName, issues: [issue], candidates: [] });

  if (byteLength(source) > SVG_SOURCE_LIMIT.maxSourceBytes) {
    return rejected(createIssue(SVG_ISSUE_CODE.sourceTooLarge, 'Source is larger than the allowed size'));
  }

  const parsed = parseSvgSource(source);
  if (parsed.candidates.length === 0) {
    const issues = parsed.issues.length > 0
      ? parsed.issues
      : [createIssue(SVG_ISSUE_CODE.noIconFound, 'No <svg> or <symbol> element found')];
    return { sourceName, issues, candidates: [] };
  }
  if (parsed.candidates.length > SVG_SOURCE_LIMIT.maxIconsPerSource) {
    return rejected(createIssue(SVG_ISSUE_CODE.tooManyIcons, 'Source contains too many icons', {
      detail: String(parsed.candidates.length),
    }));
  }

  const isSingleIcon = parsed.candidates.length === 1;
  const candidates = parsed.candidates.map((candidate, index): ProcessedCandidate => {
    const fileName = isSingleIcon ? sourceName : null;
    const base = {
      index,
      sourceId: candidate.sourceId,
      suggestedSlug: suggestSlug(candidate.sourceId, fileName, index),
      line: candidate.line,
      sourceSvg: candidate.sourceSvg,
    };
    const unusable = (issues: SvgIssue[], classified: Pick<IconCandidate, 'detectedStyle' | 'styleReason'>) => ({
      ...base,
      ...classified,
      setId: null,
      svg: null,
      contentHash: null,
      isMulticolor: false,
      isValid: false,
      issues,
    });

    if (byteLength(candidate.sourceSvg) > SVG_SOURCE_LIMIT.maxIconBytes) {
      const issue = createIssue(SVG_ISSUE_CODE.iconTooLarge, 'Icon is larger than the allowed size');
      return unusable([...candidate.issues, issue], { detectedStyle: null, styleReason: null });
    }

    const clean = sanitizeIcon(candidate.element);
    const classification = classifyIcon(clean, [candidate.sourceId, fileName]);
    const classified = { detectedStyle: classification.style, styleReason: classification.reason };
    const set = options.chooseSet({ index, detectedStyle: classification.style });
    if (!set) {
      const issue = createIssue(SVG_ISSUE_CODE.noMatchingSet, 'No icon set accepts this kind of icon', {
        detail: classification.style,
      });
      return unusable([...candidate.issues, ...clean.issues, issue], classified);
    }

    const normalized = normalizeIcon(clean, { style: set.style, strokeWidth: set.strokeWidth });
    const issues = [...candidate.issues, ...clean.issues, ...normalized.issues];
    return {
      ...base,
      ...classified,
      setId: set.setId,
      svg: normalized.svg,
      contentHash: normalized.contentHash,
      isMulticolor: normalized.isMulticolor,
      isValid: normalized.svg !== null && !hasBlockingIssue(issues),
      issues,
    };
  });

  return { sourceName, issues: parsed.issues, candidates };
}

function toPublicCandidate(candidate: ProcessedCandidate): IconCandidate {
  const {
    index, sourceId, suggestedSlug, line, detectedStyle, styleReason, setId, svg, contentHash, isMulticolor, isValid, issues,
  } = candidate;
  return {
    index, sourceId, suggestedSlug, line, detectedStyle, styleReason, setId, svg, contentHash, isMulticolor, isValid, issues,
  };
}

export function toPublicSourceResult(processed: ProcessedSource): SvgSourceResult {
  return { ...processed, candidates: processed.candidates.map(toPublicCandidate) };
}
