import { Alert, Checkbox, Empty, Flex, Input, List, Select, Tag, theme, Typography } from 'antd';
import { describeDetectedStyle, describeIssue } from '@/client/admin/icons/iconTexts';
import type { CandidateChoice, CandidateRow } from '@/client/admin/upload/useCandidateSelection';
import { DARK_COLOR, previewColors } from '@/client/common/darkTheme';
import { toSvgDataUri } from '@/client/common/svgFiles';
import { isValidSlug, SVG_ISSUE_SEVERITY } from '@/shared/constants/icons';
import type { IconSetDto, PreviewCandidate, SvgIssue } from '@/shared/types/icons';

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PREVIEW_SIZE = 32;

const colors = (candidate: PreviewCandidate) => previewColors(candidate.isMulticolor);

interface CandidateListProps {
  rows: CandidateRow[];
  sets: IconSetDto[];
  choices: Record<string, CandidateChoice>;
  saveErrors: Record<string, string>;
  sourceIssues: SvgIssue[];
  onToggle: (key: string, checked: boolean) => void;
  onSlugChange: (key: string, slug: string) => void;
  onSetChange: (key: string, setId: string) => void;
}

function CandidateStatus({ candidate, slug }: { candidate: PreviewCandidate; slug: string }) {
  if (!candidate.isValid) return <Tag color="error">Lỗi</Tag>;
  if (candidate.duplicateOf) return <Tag color="warning">Trùng hình với {candidate.duplicateOf.slug}</Tag>;
  if (candidate.slugTakenBy && candidate.slugTakenBy.slug === slug) return <Tag color="warning">Trùng tên</Tag>;
  if (candidate.issues.some((issue) => issue.severity === SVG_ISSUE_SEVERITY.warning)) return <Tag color="gold">Cảnh báo</Tag>;
  return <Tag color="success">Sẵn sàng</Tag>;
}

function IssueLines({ issues }: { issues: SvgIssue[] }) {
  const important = issues.filter((issue) => issue.severity !== SVG_ISSUE_SEVERITY.info);
  const notes = issues.filter((issue) => issue.severity === SVG_ISSUE_SEVERITY.info);
  return (
    <Flex vertical gap={2}>
      {important.map((issue, index) => (
        <Typography.Text key={`${issue.code}-${index}`} type={issue.severity === SVG_ISSUE_SEVERITY.error ? 'danger' : 'warning'} style={{ fontSize: 13 }}>
          {describeIssue(issue)}
        </Typography.Text>
      ))}
      {notes.length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {notes.map(describeIssue).join(' · ')}
        </Typography.Text>
      )}
    </Flex>
  );
}

export function CandidateList({
  rows,
  sets,
  choices,
  saveErrors,
  sourceIssues,
  onToggle,
  onSlugChange,
  onSetChange,
}: CandidateListProps) {
  const { token } = theme.useToken();
  const setOptions = sets.map((set) => ({ value: set.id, label: set.name }));

  return (
    <Flex vertical gap={12}>
      {sourceIssues.map((issue, index) => (
        <Alert key={`${issue.code}-${index}`} type={issue.severity === SVG_ISSUE_SEVERITY.error ? 'error' : 'warning'} showIcon message={describeIssue(issue)} />
      ))}
      <List
        dataSource={rows}
        locale={{ emptyText: <Empty description="Dán mã hoặc thả file để bắt đầu" /> }}
        renderItem={({ key, source, candidate }) => {
          const choice = choices[key];
          const slug = choice?.slug ?? candidate.suggestedSlug;
          const isSlugValid = isValidSlug(slug);
          return (
            <List.Item key={key} style={{ alignItems: 'flex-start', gap: 16 }}>
              <Checkbox
                checked={choice?.checked ?? false}
                disabled={!candidate.isValid}
                onChange={(event) => onToggle(key, event.target.checked)}
                aria-label={`Lưu icon ${slug}`}
                style={{ marginTop: 20 }}
              />
              <Flex
                align="center"
                justify="center"
                style={{
                  width: 60,
                  height: 60,
                  flex: 'none',
                  borderRadius: 10,
                  border: `1px solid ${DARK_COLOR.cardBorder}`,
                  background: candidate.isValid ? (candidate.isMulticolor ? colors(candidate).surface : DARK_COLOR.card) : token.colorErrorBg,
                }}
              >
                {candidate.svg ? (
                  <img src={toSvgDataUri(candidate.svg, colors(candidate).icon)} width={PREVIEW_SIZE} height={PREVIEW_SIZE} alt={`Xem trước ${slug}`} />
                ) : (
                  <Typography.Text type="danger">!</Typography.Text>
                )}
              </Flex>
              <Flex vertical gap={6} style={{ flex: 1, minWidth: 0 }}>
                <Flex wrap align="center" gap={8}>
                  <Input
                    aria-label="Slug"
                    addonBefore="Slug"
                    value={slug}
                    status={isSlugValid ? undefined : 'error'}
                    disabled={!candidate.isValid}
                    onChange={(event) => onSlugChange(key, event.target.value.trim().toLowerCase())}
                    style={{ flex: '1 1 200px', fontFamily: MONOSPACE }}
                  />
                  <CandidateStatus candidate={candidate} slug={slug} />
                </Flex>
                {candidate.detectedStyle && (
                  <Flex wrap align="center" gap={8}>
                    <Select
                      aria-label={`Bộ icon cho ${slug}`}
                      size="small"
                      value={candidate.setId ?? undefined}
                      placeholder="Chọn bộ"
                      options={setOptions}
                      onChange={(setId: string) => onSetChange(key, setId)}
                      style={{ minWidth: 140 }}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {describeDetectedStyle(candidate.detectedStyle, candidate.styleReason)}
                    </Typography.Text>
                  </Flex>
                )}
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {candidate.sourceId ? <>Từ <Typography.Text code>{candidate.sourceId}</Typography.Text></> : source.name ?? 'Mã dán vào'}
                  {candidate.line ? ` · dòng ${candidate.line}` : ''}
                </Typography.Text>
                {!isSlugValid && (
                  <Typography.Text type="danger" style={{ fontSize: 13 }}>
                    Slug chỉ gồm chữ thường, số và dấu gạch ngang
                  </Typography.Text>
                )}
                {saveErrors[key] && (
                  <Typography.Text type="danger" style={{ fontSize: 13 }}>
                    Chưa lưu được: {saveErrors[key]}
                  </Typography.Text>
                )}
                <IssueLines issues={candidate.issues} />
              </Flex>
            </List.Item>
          );
        }}
      />
    </Flex>
  );
}
