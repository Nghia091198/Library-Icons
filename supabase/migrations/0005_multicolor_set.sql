-- Thêm kiểu bộ 'multicolor': icon nhiều màu không phải logo thương hiệu, giữ nguyên màu gốc.
alter table public.icon_sets drop constraint if exists icon_sets_style_check;
alter table public.icon_sets
  add constraint icon_sets_style_check check (style in ('outline', 'solid', 'brand', 'multicolor'));

insert into public.icon_sets (slug, name, description, style, stroke_width) values
  ('multicolor', 'Multi Color', 'Icon nhiều màu, giữ nguyên màu gốc', 'multicolor', null)
on conflict (slug) do nothing;
