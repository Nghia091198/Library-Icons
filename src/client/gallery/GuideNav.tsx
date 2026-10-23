import { Typography } from 'antd';
import { useState } from 'react';
import { scrollToSection, useActiveSection } from '@/client/common/useActiveSection';
import { GALLERY_COLOR } from '@/client/gallery/galleryTheme';
import { GUIDE_SECTIONS, type GuideSection } from '@/client/gallery/guideSections';

const SECTION_IDS = GUIDE_SECTIONS.map((section) => section.id);

interface TocButtonProps {
  section: GuideSection;
  index: number;
  isActive: boolean;
}

function TocButton({ section, index, isActive }: TocButtonProps) {
  const [isHovered, setHovered] = useState(false);
  const background = isActive ? GALLERY_COLOR.surfaceRaised : isHovered ? GALLERY_COLOR.surface : 'transparent';

  return (
    <button
      type="button"
      aria-current={isActive ? 'location' : undefined}
      onClick={() => scrollToSection(section.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 10px',
        borderRadius: 10,
        border: `1px solid ${isActive ? GALLERY_COLOR.primary : 'transparent'}`,
        background,
        color: isActive ? GALLERY_COLOR.text : GALLERY_COLOR.textMuted,
        font: 'inherit',
        fontWeight: isActive ? 600 : 400,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: 'none',
          width: 24,
          height: 24,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: isActive ? '#ffffff' : GALLERY_COLOR.textMuted,
          background: isActive ? GALLERY_COLOR.primary : GALLERY_COLOR.surfaceRaised,
          border: `1px solid ${isActive ? GALLERY_COLOR.primary : GALLERY_COLOR.border}`,
        }}
      >
        {index}
      </span>
      <span style={{ lineHeight: 1.35 }}>{section.title}</span>
    </button>
  );
}

export function GuideNav({ topOffset }: { topOffset: number }) {
  const activeId = useActiveSection(SECTION_IDS, topOffset);

  return (
    <nav aria-label="Mục lục hướng dẫn" style={{ padding: '20px 12px' }}>
      <Typography.Text
        type="secondary"
        style={{ display: 'block', fontSize: 12, letterSpacing: 0.6, margin: '0 0 10px 10px' }}
      >
        HƯỚNG DẪN
      </Typography.Text>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {GUIDE_SECTIONS.map((section, index) => (
          <li key={section.id}>
            <TocButton section={section} index={index + 1} isActive={section.id === activeId} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
