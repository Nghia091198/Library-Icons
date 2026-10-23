import { UploadOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Tag, theme, Typography, Upload } from 'antd';
import { useState, type DragEvent } from 'react';
import { useMessage } from '@/client/common/MessageProvider';
import { isSvgFile, readSvgFile } from '@/client/common/svgFiles';
import type { SvgSourceInput } from '@/shared/types/icons';

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

interface SourceInputProps {
  text: string;
  files: SvgSourceInput[];
  onTextChange: (text: string) => void;
  onAddFiles: (files: SvgSourceInput[]) => void;
  onRemoveFile: (index: number) => void;
  onClear: () => void;
}

export function SourceInput({ text, files, onTextChange, onAddFiles, onRemoveFile, onClear }: SourceInputProps) {
  const { token } = theme.useToken();
  const message = useMessage();
  const [isDragging, setDragging] = useState(false);

  async function addFiles(candidates: File[]) {
    const svgFiles = candidates.filter(isSvgFile);
    if (svgFiles.length < candidates.length) void message.warning('Chỉ nhận file .svg, các file khác đã được bỏ qua');
    if (svgFiles.length > 0) onAddFiles(await Promise.all(svgFiles.map(readSvgFile)));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <Flex vertical gap={12}>
      <label htmlFor="svg-source" style={{ fontWeight: 500 }}>
        Mã SVG
      </label>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          borderRadius: token.borderRadiusLG,
          outline: isDragging ? `2px dashed ${token.colorPrimary}` : 'none',
          outlineOffset: 2,
        }}
      >
        <Input.TextArea
          id="svg-source"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={'<svg viewBox="0 0 24 24">…</svg>\n\nDán một icon, nhiều icon hoặc cả sprite <symbol>.\nCó thể kéo thả file .svg vào đây.'}
          spellCheck={false}
          autoSize={{ minRows: 14, maxRows: 28 }}
          style={{
            fontFamily: MONOSPACE,
            fontSize: 12.5,
            background: isDragging ? token.colorPrimaryBg : token.colorFillQuaternary,
          }}
        />
      </div>

      {files.length > 0 && (
        <Flex wrap gap={6}>
          {files.map((file, index) => (
            <Tag key={`${file.name ?? 'file'}-${index}`} closable onClose={() => onRemoveFile(index)}>
              {file.name}
            </Tag>
          ))}
        </Flex>
      )}

      <Flex wrap align="center" gap={12}>
        <Typography.Text type="secondary">
          Kéo thả file <Typography.Text code>.svg</Typography.Text> vào ô trên, hoặc
        </Typography.Text>
        <Upload
          accept=".svg,image/svg+xml"
          multiple
          showUploadList={false}
          beforeUpload={(file, fileList) => {
            if (file === fileList[0]) void addFiles(fileList);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>Chọn file</Button>
        </Upload>
        <Button type="text" onClick={onClear} disabled={text.length === 0 && files.length === 0} style={{ marginLeft: 'auto' }}>
          Xoá nội dung
        </Button>
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        Script, sự kiện <Typography.Text code>on*</Typography.Text> và link ngoài luôn bị gỡ trước khi lưu.
      </Typography.Text>
    </Flex>
  );
}
