import { UploadOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Modal, Typography, Upload } from 'antd';
import { useState } from 'react';
import { readSvgFile } from '@/client/common/svgFiles';
import type { SvgSourceInput } from '@/shared/types/icons';

interface ReplaceSvgModalProps {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (source: SvgSourceInput) => void;
}

export function ReplaceSvgModal({ open, submitting, onCancel, onSubmit }: ReplaceSvgModalProps) {
  const [source, setSource] = useState<SvgSourceInput>({ text: '' });

  return (
    <Modal
      title="Thay hình vẽ"
      open={open}
      onCancel={onCancel}
      onOk={() => onSubmit(source)}
      okText="Thay"
      cancelText="Huỷ"
      okButtonProps={{ disabled: source.text.trim().length === 0, loading: submitting }}
      afterClose={() => setSource({ text: '' })}
      destroyOnClose
    >
      <Flex vertical gap={12}>
        <Typography.Text type="secondary">
          Dán mã SVG của một icon hoặc chọn file. Slug, tag và trạng thái được giữ nguyên.
        </Typography.Text>
        <Input.TextArea
          aria-label="Mã SVG mới"
          rows={10}
          spellCheck={false}
          value={source.text}
          onChange={(event) => setSource({ text: event.target.value })}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5 }}
        />
        <Upload
          accept=".svg,image/svg+xml"
          showUploadList={false}
          beforeUpload={(file) => {
            void readSvgFile(file).then(setSource);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>Chọn file</Button>
        </Upload>
      </Flex>
    </Modal>
  );
}
