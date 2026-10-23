import { useCallback, useEffect, useMemo, useState } from 'react';
import { isValidSlug } from '@/shared/constants/icons';
import type { PreviewCandidate, PreviewIconsResponse, PreviewSourceInput, SvgSourceInput } from '@/shared/types/icons';

export interface CandidateRow {
  key: string;
  source: SvgSourceInput;
  candidate: PreviewCandidate;
}

export interface CandidateChoice {
  checked: boolean;
  slug: string;
  fingerprint: string;
}

function fingerprintOf(candidate: PreviewCandidate): string {
  return [
    candidate.contentHash ?? 'invalid',
    candidate.setId ?? '',
    candidate.duplicateOf?.iconId ?? '',
    candidate.slugTakenBy?.iconId ?? '',
  ].join('|');
}

function isSelectableByDefault(candidate: PreviewCandidate): boolean {
  return candidate.isValid && candidate.duplicateOf === null && candidate.slugTakenBy === null;
}

export function toCandidateRows(result: PreviewIconsResponse | null, sources: PreviewSourceInput[]): CandidateRow[] {
  if (!result) return [];
  return result.sources.flatMap((sourceResult, sourceIndex) => {
    const previewed = sources[sourceIndex];
    if (!previewed) return [];
    const source: SvgSourceInput = { name: previewed.name ?? null, text: previewed.text };
    return sourceResult.candidates.map((candidate) => ({ key: candidateKey(sourceIndex, candidate.index), source, candidate }));
  });
}

export function candidateKey(sourceIndex: number, candidateIndex: number): string {
  return `${sourceIndex}:${candidateIndex}`;
}

// Giữ slug người dùng đã sửa; lựa chọn chỉ đặt lại khi hình vẽ, bộ hoặc xung đột của dòng đó thay đổi.
export function useCandidateSelection(rows: CandidateRow[]) {
  const [choices, setChoices] = useState<Record<string, CandidateChoice>>({});

  useEffect(() => {
    setChoices((previous) => {
      const next: Record<string, CandidateChoice> = {};
      for (const { key, candidate } of rows) {
        const fingerprint = fingerprintOf(candidate);
        const existing = previous[key];
        if (existing && existing.fingerprint === fingerprint) next[key] = existing;
        else {
          next[key] = {
            checked: isSelectableByDefault(candidate),
            slug: existing?.slug ?? candidate.suggestedSlug,
            fingerprint,
          };
        }
      }
      return next;
    });
  }, [rows]);

  const toggle = useCallback((key: string, checked: boolean) => {
    setChoices((previous) => {
      const choice = previous[key];
      return choice ? { ...previous, [key]: { ...choice, checked } } : previous;
    });
  }, []);

  const setSlug = useCallback((key: string, slug: string) => {
    setChoices((previous) => {
      const choice = previous[key];
      return choice ? { ...previous, [key]: { ...choice, slug } } : previous;
    });
  }, []);

  const selectedRows = useMemo(
    () => rows.filter((row) => row.candidate.isValid && choices[row.key]?.checked),
    [rows, choices],
  );
  const hasInvalidSlug = selectedRows.some((row) => !isValidSlug(choices[row.key]?.slug ?? ''));

  return { choices, toggle, setSlug, selectedRows, hasInvalidSlug };
}
