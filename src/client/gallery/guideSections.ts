export interface GuideSection {
  id: string;
  title: string;
}

export const GUIDE_SECTION = {
  find: { id: 'find', title: 'Tìm và chọn icon' },
  paste: { id: 'paste', title: 'Dán SVG vào theme Haravan' },
  snippet: { id: 'snippet', title: 'Tạo snippet dùng lại' },
  style: { id: 'style', title: 'Đổi màu và kích thước' },
  image: { id: 'image', title: 'Dùng ảnh PNG, JPG' },
  react: { id: 'react', title: 'Dùng trong React' },
  api: { id: 'api', title: 'API cho developer' },
} as const satisfies Record<string, GuideSection>;

export const GUIDE_SECTIONS: GuideSection[] = Object.values(GUIDE_SECTION);
