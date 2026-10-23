import { useEffect, useState } from 'react';
import { previewIcons } from '@/client/admin/icons/iconAdminService';
import { describeApiError } from '@/client/admin/icons/iconTexts';
import type { PreviewIconsResponse, PreviewSourceInput } from '@/shared/types/icons';

export interface IconPreviewState {
  result: PreviewIconsResponse | null;
  previewedSources: PreviewSourceInput[];
  loading: boolean;
  error: string | null;
}

const EMPTY_PREVIEW: IconPreviewState = { result: null, previewedSources: [], loading: false, error: null };

export function useIconPreview(sources: PreviewSourceInput[], refreshKey: number): IconPreviewState {
  const [state, setState] = useState<IconPreviewState>(EMPTY_PREVIEW);

  useEffect(() => {
    if (sources.length === 0) {
      setState(EMPTY_PREVIEW);
      return;
    }

    let isActive = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    previewIcons({ sources })
      .then((result) => {
        if (isActive) setState({ result, previewedSources: sources, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (isActive) setState({ ...EMPTY_PREVIEW, error: describeApiError(error) });
      });
    return () => {
      isActive = false;
    };
  }, [sources, refreshKey]);

  return state;
}
