import {
  SVG_ISSUE_CODE,
  SVG_ISSUE_SEVERITY,
  type SvgIssueCode,
  type SvgIssueSeverity,
} from '@/shared/constants/icons';
import type { SvgIssue } from '@/shared/types/icons';

const SEVERITY_BY_CODE: Record<SvgIssueCode, SvgIssueSeverity> = {
  [SVG_ISSUE_CODE.sourceTooLarge]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.parseError]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.parseWarning]: SVG_ISSUE_SEVERITY.warning,
  [SVG_ISSUE_CODE.noIconFound]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.tooManyIcons]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.iconTooLarge]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.missingViewBox]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.emptyIcon]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.noMatchingSet]: SVG_ISSUE_SEVERITY.error,
  [SVG_ISSUE_CODE.removedUnsafeContent]: SVG_ISSUE_SEVERITY.warning,
  [SVG_ISSUE_CODE.removedUnsupportedContent]: SVG_ISSUE_SEVERITY.info,
  [SVG_ISSUE_CODE.rescaledToGrid]: SVG_ISSUE_SEVERITY.info,
  [SVG_ISSUE_CODE.recoloredToCurrentColor]: SVG_ISSUE_SEVERITY.info,
  [SVG_ISSUE_CODE.mergedMultipleColors]: SVG_ISSUE_SEVERITY.warning,
  [SVG_ISSUE_CODE.multicolorKept]: SVG_ISSUE_SEVERITY.info,
  [SVG_ISSUE_CODE.strokeStyleNormalized]: SVG_ISSUE_SEVERITY.info,
  [SVG_ISSUE_CODE.transformNotBaked]: SVG_ISSUE_SEVERITY.warning,
};

export function createIssue(
  code: SvgIssueCode,
  message: string,
  extra: { detail?: string; line?: number } = {},
): SvgIssue {
  return { code, severity: SEVERITY_BY_CODE[code], message, ...extra };
}

export function hasBlockingIssue(issues: readonly SvgIssue[]): boolean {
  return issues.some((issue) => issue.severity === SVG_ISSUE_SEVERITY.error);
}
