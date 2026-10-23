import { Button, Flex, Typography } from 'antd';
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { scrollToSection } from '@/client/common/useActiveSection';
import { CodeBlock } from '@/client/gallery/CodeBlock';
import { GALLERY_COLOR } from '@/client/gallery/galleryTheme';
import { GUIDE_SECTION, GUIDE_SECTIONS, type GuideSection } from '@/client/gallery/guideSections';
import { API_ROUTE } from '@/shared/constants/apiRoutes';

const EXAMPLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';

const INLINE_EXAMPLE = `<a href="/cart" class="header__cart" aria-label="Giỏ hàng">
  ${EXAMPLE_SVG}
</a>`;

const SNIPPET_FILE = `{%- comment -%} snippets/icon-cart.liquid {%- endcomment -%}
${EXAMPLE_SVG.replace('<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ')}`;

const SNIPPET_USAGE = `<a href="/cart" class="header__cart" aria-label="Giỏ hàng">
  {% include 'icon-cart' %}
</a>`;

const ICON_CSS = `.icon {
  width: 1.25em;
  height: 1.25em;
  vertical-align: middle;
  flex-shrink: 0;
}

/* Icon lấy màu chữ của phần tử chứa nó */
.header__cart { color: #0f172a; }
.header__cart:hover { color: #2563eb; }`;

const REACT_USAGE = `import { ShoppingCartIcon } from './icons/ShoppingCartIcon';

export function CartButton() {
  return (
    <button aria-label="Giỏ hàng">
      <ShoppingCartIcon width={20} height={20} className="text-slate-700" />
    </button>
  );
}`;

const API_EXAMPLE = `GET ${API_ROUTE.publicIconCategories}
GET ${API_ROUTE.publicIcons}?categorySlug=arrows&q=down&page=1&pageSize=50`;

interface StepProps {
  section: GuideSection;
  children: ReactNode;
}

// Chừa chỗ cho header cố định khi cuộn tới mục (bấm menu hoặc mở link có #id).
const SECTION_SCROLL_MARGIN = 88;
const GUIDE_MAX_WIDTH = 1100;

function Step({ section, children }: StepProps) {
  const { id, title } = section;
  const index = GUIDE_SECTIONS.findIndex((candidate) => candidate.id === id) + 1;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px minmax(0, 1fr)',
        gap: 16,
        padding: 24,
        borderRadius: 14,
        border: `1px solid ${GALLERY_COLOR.border}`,
        background: GALLERY_COLOR.surface,
        scrollMarginTop: SECTION_SCROLL_MARGIN,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          color: GALLERY_COLOR.link,
          background: GALLERY_COLOR.surfaceRaised,
          border: `1px solid ${GALLERY_COLOR.border}`,
        }}
      >
        {index}
      </span>
      <Flex vertical gap={12} style={{ minWidth: 0 }}>
        <Typography.Title id={`${id}-title`} level={2} style={{ margin: 0, fontSize: 20 }}>
          {title}
        </Typography.Title>
        {children}
      </Flex>
    </section>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <Typography.Paragraph style={{ margin: 0, color: GALLERY_COLOR.textMuted }}>{children}</Typography.Paragraph>;
}

export function GuidePage() {
  const navigate = useNavigate();
  const initialHash = useRef(useLocation().hash);

  // Mở trang bằng link có #mục thì cuộn tới mục đó sau khi nội dung đã hiện.
  useEffect(() => {
    const sectionId = initialHash.current.replace(/^#/, '');
    if (sectionId) scrollToSection(sectionId);
  }, []);

  return (
    <Flex vertical gap={20} style={{ width: '100%', maxWidth: GUIDE_MAX_WIDTH, margin: '0 auto' }}>
      <Flex vertical gap={10}>
        <Typography.Title level={1} style={{ margin: 0, fontSize: 'clamp(26px, 3.5vw, 34px)' }}>
          Hướng dẫn cài đặt icon
        </Typography.Title>
        <Muted>
          Mọi icon trong thư viện là SVG đã chuẩn hoá trên lưới 24px và dùng <Typography.Text code>currentColor</Typography.Text>,
          nên dán vào đâu cũng tự lấy màu chữ ở đó. Chọn cách phù hợp bên dưới.
        </Muted>
      </Flex>

      <Step section={GUIDE_SECTION.find}>
        <Muted>
          Lọc theo nhóm ở menu bên trái, gõ tên vào ô tìm kiếm (tiếng Anh, ví dụ cart, arrow, phone) và chọn kiểu vẽ: Outline
          (nét), Solid (khối) hoặc Brand (logo). Bấm vào một icon để mở bảng chi tiết: chọn màu, cỡ, rồi copy hoặc tải về.
        </Muted>
        <Button type="primary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(CLIENT_ROUTE.gallery)}>
          Mở thư viện icon
        </Button>
      </Step>

      <Step section={GUIDE_SECTION.paste}>
        <Muted>
          Bấm <strong>Copy SVG</strong>, mở trình chỉnh sửa code của theme và dán thẳng vào file <Typography.Text code>.liquid</Typography.Text> ở
          vị trí cần hiện icon, ví dụ trong header:
        </Muted>
        <CodeBlock label="sections/header.liquid" code={INLINE_EXAMPLE} />
        <Muted>Hợp với icon chỉ dùng ở một chỗ. Nếu một icon xuất hiện nhiều nơi, dùng snippet ở bước 3 cho gọn.</Muted>
      </Step>

      <Step section={GUIDE_SECTION.snippet}>
        <Muted>
          Trong thư mục <Typography.Text code>snippets</Typography.Text> của theme, tạo file mới đặt theo tên icon và dán SVG vào:
        </Muted>
        <CodeBlock label="snippets/icon-cart.liquid" code={SNIPPET_FILE} />
        <Muted>Sau đó gọi icon ở bất cứ đâu bằng một dòng:</Muted>
        <CodeBlock label="Liquid" code={SNIPPET_USAGE} />
        <Muted>Muốn sửa icon, chỉ cần sửa một file snippet, mọi chỗ dùng sẽ đổi theo.</Muted>
      </Step>

      <Step section={GUIDE_SECTION.style}>
        <Muted>
          Thêm đoạn CSS sau vào file CSS của theme. Icon cao bằng 1,25 lần cỡ chữ và lấy màu theo thuộc tính{' '}
          <Typography.Text code>color</Typography.Text> của phần tử chứa nó, nên đổi màu khi hover rất đơn giản:
        </Muted>
        <CodeBlock label="CSS" code={ICON_CSS} />
        <Muted>
          Cần một màu cố định không đổi theo theme? Chọn màu trong bảng chi tiết icon trước khi copy, màu sẽ được ghi thẳng vào SVG.
        </Muted>
      </Step>

      <Step section={GUIDE_SECTION.image}>
        <Muted>
          Ở chỗ chỉ nhận ảnh (banner, ảnh menu, bài viết), chọn màu và cỡ trong bảng chi tiết rồi bấm <strong>PNG</strong> (nền trong suốt)
          hoặc <strong>JPG</strong> (nền trắng). Tải ảnh lên mục quản lý hình ảnh của Haravan và chèn như ảnh bình thường. Nên chọn cỡ gấp đôi
          cỡ hiển thị để ảnh sắc nét trên màn hình độ phân giải cao.
        </Muted>
      </Step>

      <Step section={GUIDE_SECTION.react}>
        <Muted>
          Trong bảng chi tiết, chọn tab <strong>React</strong> và copy. Đoạn mã là một component TypeScript nhận mọi thuộc tính của thẻ{' '}
          <Typography.Text code>{'<svg>'}</Typography.Text>. Lưu thành file trong dự án rồi dùng:
        </Muted>
        <CodeBlock label="CartButton.tsx" code={REACT_USAGE} />
      </Step>

      <Step section={GUIDE_SECTION.api}>
        <Muted>
          Danh sách nhóm và icon có thể lấy qua API, không cần đăng nhập. Mỗi icon trả về kèm mã SVG, nên agent dựng theme có thể lấy
          đúng icon cần dùng mà không phải tải thủ công.
        </Muted>
        <CodeBlock label="HTTP" code={API_EXAMPLE} />
        <Button href={API_ROUTE.docs} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}>
          Xem tài liệu API đầy đủ
        </Button>
      </Step>
    </Flex>
  );
}
