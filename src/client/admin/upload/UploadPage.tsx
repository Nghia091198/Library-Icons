import { ArrowRightOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Flex, Grid, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminSets, useRefreshAdminIconLists, useRefreshAdminSummaries } from '@/client/admin/icons/adminData';
import { createIcons } from '@/client/admin/icons/iconAdminService';
import { API_ERROR_TEXT, describeApiError, ICON_STATUS_LABEL } from '@/client/admin/icons/iconTexts';
import { ADMIN_FILTER_PARAM } from '@/client/admin/icons/useAdminFilters';
import { CandidateList } from '@/client/admin/upload/CandidateList';
import { SourceInput } from '@/client/admin/upload/SourceInput';
import { toCandidateRows, useCandidateSelection, type CandidateRow } from '@/client/admin/upload/useCandidateSelection';
import { useIconPreview } from '@/client/admin/upload/useIconPreview';
import { APP_HEADER_HEIGHT } from '@/client/common/AppShell';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { FloatingBar, FLOATING_BAR_CLEARANCE } from '@/client/common/FloatingBar';
import { useMessage } from '@/client/common/MessageProvider';
import { useDebouncedValue } from '@/client/common/useDebouncedValue';
import { ICON_STATUS, type CreatableIconStatus } from '@/shared/constants/icons';
import type { IconSetDto, PreviewSourceInput, SvgSourceInput } from '@/shared/types/icons';

const PREVIEW_DEBOUNCE_MS = 400;
const COLUMN_GAP = 16;
// Cột nguồn dính theo khi cuộn danh sách icon dài, ngay dưới header cố định.
const STICKY_TOP = APP_HEADER_HEIGHT + 24;

interface SavedBatch {
  count: number;
  status: CreatableIconStatus;
}

function overridesForSource(overrides: Record<string, string>, sourceIndex: number): Record<string, string> | undefined {
  const prefix = `${sourceIndex}:`;
  const entries = Object.entries(overrides)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, setId]) => [key.slice(prefix.length), setId]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function summarizeBySet(rows: CandidateRow[], sets: IconSetDto[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = sets.find((set) => set.id === row.candidate.setId)?.name ?? '—';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => `${name} ${count}`).join(' · ');
}

export function UploadPage() {
  const navigate = useNavigate();
  const message = useMessage();
  const screens = Grid.useBreakpoint();
  const isWide = screens.xl === true;
  const { sets } = useAdminSets();
  const refreshSummaries = useRefreshAdminSummaries();
  const refreshIconLists = useRefreshAdminIconLists();

  const [text, setText] = useState('');
  const [files, setFiles] = useState<SvgSourceInput[]>([]);
  const [setOverrides, setSetOverrides] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<CreatableIconStatus | null>(null);
  const [lastSaved, setLastSaved] = useState<SavedBatch | null>(null);

  const sources = useMemo<PreviewSourceInput[]>(() => {
    const plain: SvgSourceInput[] = [...(text.trim() ? [{ text }] : []), ...files];
    return plain.map((source, index) => ({ ...source, setOverrides: overridesForSource(setOverrides, index) }));
  }, [text, files, setOverrides]);
  const debouncedSources = useDebouncedValue(sources, PREVIEW_DEBOUNCE_MS);
  const preview = useIconPreview(debouncedSources, refreshKey);
  const rows = useMemo(() => toCandidateRows(preview.result, preview.previewedSources), [preview.result, preview.previewedSources]);
  const selection = useCandidateSelection(rows);
  const sourceIssues = preview.result?.sources.flatMap((source) => source.issues) ?? [];

  function clearSources() {
    setText('');
    setFiles([]);
    setSetOverrides({});
    setSaveErrors({});
  }

  async function save(status: CreatableIconStatus) {
    const chosen = selection.selectedRows.filter((row) => row.candidate.setId !== null);
    if (chosen.length === 0) return;
    setSavingStatus(status);
    try {
      const response = await createIcons({
        status,
        items: chosen.map((row) => ({
          source: row.source,
          candidateIndex: row.candidate.index,
          setId: row.candidate.setId ?? '',
          slug: selection.choices[row.key]?.slug ?? row.candidate.suggestedSlug,
        })),
      });

      const failures: Record<string, string> = {};
      let savedCount = 0;
      for (const result of response.results) {
        const row = chosen[result.index];
        if (!row) continue;
        if (result.ok) savedCount += 1;
        else failures[row.key] = API_ERROR_TEXT[result.error.code] ?? result.error.message;
      }

      if (savedCount > 0) {
        setLastSaved({ count: savedCount, status });
        refreshSummaries();
        refreshIconLists();
      }
      if (Object.keys(failures).length === 0) {
        clearSources();
      } else {
        setSaveErrors(failures);
        setRefreshKey((key) => key + 1);
        void message.warning(`${Object.keys(failures).length} icon chưa lưu được, xem lý do ở từng dòng`);
      }
    } catch (error) {
      void message.error(describeApiError(error));
    } finally {
      setSavingStatus(null);
    }
  }

  const selectedCount = selection.selectedRows.length;
  const canSave = selectedCount > 0 && !selection.hasInvalidSlug && savingStatus === null;
  const validCount = rows.filter((row) => row.candidate.isValid).length;
  const hasRows = rows.length > 0;

  return (
    <Flex vertical gap={16} style={{ paddingBottom: hasRows ? FLOATING_BAR_CLEARANCE : 0 }}>
      <div>
        <Typography.Title level={1} style={{ margin: 0, fontSize: 24 }}>
          Upload icon
        </Typography.Title>
        <Typography.Text type="secondary">
          Dán mã SVG hoặc thả file. Mỗi icon được tự nhận dạng và xếp vào bộ phù hợp; đổi bộ ở từng dòng nếu cần.
        </Typography.Text>
      </div>

      {lastSaved && (
        <Alert
          type="success"
          showIcon
          closable
          onClose={() => setLastSaved(null)}
          message={`Đã lưu ${lastSaved.count.toLocaleString('en-US')} icon (${ICON_STATUS_LABEL[lastSaved.status].toLowerCase()})`}
          action={
            <Button
              size="small"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate(`${CLIENT_ROUTE.adminIcons}?${ADMIN_FILTER_PARAM.status}=${lastSaved.status}`)}
            >
              Xem trong Quản lý
            </Button>
          }
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isWide ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: COLUMN_GAP,
          alignItems: 'start',
        }}
      >
        <Card title="Nguồn" style={isWide ? { position: 'sticky', top: STICKY_TOP } : undefined}>
          <SourceInput
            text={text}
            files={files}
            onTextChange={setText}
            onAddFiles={(added) => setFiles((current) => [...current, ...added])}
            onRemoveFile={(index) => {
              setFiles((current) => current.filter((_file, position) => position !== index));
              setSetOverrides({});
            }}
            onClear={clearSources}
          />
        </Card>

        <Card
          title={hasRows ? `Phát hiện ${rows.length.toLocaleString('en-US')} icon` : 'Kết quả'}
          extra={
            hasRows && (
              <Typography.Text type="secondary">
                {validCount} hợp lệ · {rows.length - validCount} lỗi
              </Typography.Text>
            )
          }
        >
          {preview.error && <Typography.Text type="danger">{preview.error}</Typography.Text>}
          <Spin spinning={preview.loading}>
            <CandidateList
              rows={rows}
              sets={sets}
              choices={selection.choices}
              saveErrors={saveErrors}
              sourceIssues={sourceIssues}
              onToggle={selection.toggle}
              onSlugChange={selection.setSlug}
              onSetChange={(key, setId) => setSetOverrides((current) => ({ ...current, [key]: setId }))}
            />
          </Spin>
        </Card>
      </div>

      {hasRows && (
        <FloatingBar label="Lưu các icon đã chọn">
          <Flex wrap align="center" gap={12}>
            <Typography.Text style={{ padding: '0 4px' }}>
              {selectedCount > 0 ? (
                <>
                  <Typography.Text strong>Sẽ lưu {selectedCount.toLocaleString('en-US')} icon</Typography.Text>
                  <Typography.Text type="secondary"> · {summarizeBySet(selection.selectedRows, sets)}</Typography.Text>
                </>
              ) : (
                <Typography.Text type="secondary">Chưa chọn icon nào</Typography.Text>
              )}
            </Typography.Text>
            <Button
              size="small"
              disabled={!canSave}
              loading={savingStatus === ICON_STATUS.draft}
              onClick={() => void save(ICON_STATUS.draft)}
            >
              Lưu nháp
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={!canSave}
              loading={savingStatus === ICON_STATUS.published}
              onClick={() => void save(ICON_STATUS.published)}
            >
              Lưu và publish
            </Button>
          </Flex>
        </FloatingBar>
      )}
    </Flex>
  );
}
