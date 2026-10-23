import { CopyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useCopyToClipboard } from '@/client/common/useCopyToClipboard';
import { GALLERY_COLOR } from '@/client/gallery/galleryTheme';

const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

interface CodeBlockProps {
  code: string;
  label: string;
}

export function CodeBlock({ code, label }: CodeBlockProps) {
  const copy = useCopyToClipboard();
  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          top: 10,
          left: 16,
          fontSize: 12,
          color: GALLERY_COLOR.textMuted,
          fontFamily: MONOSPACE,
        }}
      >
        {label}
      </span>
      <pre
        style={{
          margin: 0,
          padding: '34px 56px 16px 16px',
          overflowX: 'auto',
          borderRadius: 10,
          border: `1px solid ${GALLERY_COLOR.border}`,
          background: GALLERY_COLOR.background,
          color: GALLERY_COLOR.text,
          fontFamily: MONOSPACE,
          fontSize: 13,
          lineHeight: 1.65,
        }}
      >
        <code>{code}</code>
      </pre>
      <Button
        icon={<CopyOutlined />}
        aria-label={`Copy ${label}`}
        onClick={() => void copy(code, 'Đã copy')}
        style={{ position: 'absolute', top: 8, right: 8 }}
      />
    </div>
  );
}
