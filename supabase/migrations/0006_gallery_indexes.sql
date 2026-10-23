-- Chỉ mục cho các truy vấn của gallery và admin trên thư viện lớn (hơn 10 nghìn icon).

-- Gallery: chỉ icon đã publish, sắp theo slug, lọc thêm theo nhóm hoặc bộ.
create index if not exists icons_status_slug_idx on public.icons (status, slug, id);
create index if not exists icons_status_category_slug_idx on public.icons (status, category_id, slug, id);
create index if not exists icons_status_set_slug_idx on public.icons (status, set_id, slug, id);

-- Admin: sắp theo thời gian cập nhật gần nhất.
create index if not exists icons_status_updated_idx on public.icons (status, updated_at desc, id);

-- Tìm kiếm chuỗi con (ilike '%...%') theo slug và tên; pg_trgm nằm trong schema extensions (migration 0001).
create index if not exists icons_slug_trgm_idx on public.icons using gin (slug extensions.gin_trgm_ops);
create index if not exists icons_name_trgm_idx on public.icons using gin (name extensions.gin_trgm_ops);
