import { Button, Card, Col, Flex, Row, Spin, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { createIcons } from '@/client/admin/icons/iconAdminService';
import { API_ERROR_TEXT, describeApiError } from '@/client/admin/icons/iconTexts';
import { useAdminSets } from '@/client/admin/icons/adminData';
import { CandidateList } from '@/client/admin/upload/CandidateList';
import { SourceInput } from '@/client/admin/upload/SourceInput';
import { toCandidateRows, useCandidateSelection, type CandidateRow } from '@/client/admin/upload/useCandidateSelection';
import { useIconPreview } from '@/client/admin/upload/useIconPreview';
import { useMessage } from '@/client/common/MessageProvider';
import { useDebouncedValue } from '@/client/common/useDebouncedValue';
import { ICON_STATUS, type CreatableIconStatus } from '@/shared/constants/icons';
import type { IconSetDto, PreviewSourceInput, SvgSourceInput } from '@/shared/types/icons';

const PREVIEW_DEBOUNCE_MS = 400;

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
  const { token } = theme.useToken();
  const message = useMessage();
  const { sets } = useAdminSets();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<SvgSourceInput[]>([]);
  const [setOverrides, setSetOverrides] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<CreatableIconStatus | null>(null);

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

      if (savedCount > 0) void message.success(`Đã lưu ${savedCount} icon`);
      if (Object.keys(failures).length === 0) {
        clearSources();
      } else {
        setSaveErrors(failures);
        setRefreshKey((key) => key + 1);
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

  return (
    <Flex vertical gap={16} style={{ minHeight: '100%' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Upload icon
        </Typography.Title>
        <Typography.Text type="secondary">
          Dán mã SVG hoặc thả file. Mỗi icon được tự nhận dạng và xếp vào bộ phù hợp; đổi bộ ở từng dòng nếu cần.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={12}>
          <Card title="Nguồn">
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
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title={rows.length > 0 ? `Phát hiện ${rows.length} icon` : 'Kết quả'}
            extra={rows.length > 0 && <Typography.Text type="secondary">{validCount} hợp lệ · {rows.length - validCount} lỗi</Typography.Text>}
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
        </Col>
      </Row>

      <Flex
        wrap
        align="center"
        gap={12}
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 'auto',
          padding: '12px 24px',
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <Typography.Text type="secondary">
          {selectedCount > 0
            ? `Sẽ lưu ${selectedCount} icon: ${summarizeBySet(selection.selectedRows, sets)}`
            : 'Chưa chọn icon nào'}
        </Typography.Text>
        <Button
          style={{ marginLeft: 'auto' }}
          disabled={!canSave}
          loading={savingStatus === ICON_STATUS.draft}
          onClick={() => void save(ICON_STATUS.draft)}
        >
          Lưu nháp
        </Button>
        <Button
          type="primary"
          disabled={!canSave}
          loading={savingStatus === ICON_STATUS.published}
          onClick={() => void save(ICON_STATUS.published)}
        >
          Lưu và publish
        </Button>
      </Flex>
    </Flex>
  );
}
