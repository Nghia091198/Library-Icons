-- Đếm icon theo nhóm với danh sách trạng thái tuỳ chọn:
-- gallery công khai chỉ đếm 'published', admin đếm cả 'draft'.
create or replace function public.count_icons_by_category(statuses text[])
returns table (category_id uuid, icon_count bigint)
language sql
stable
set search_path = ''
as $$
  select category_id, count(*)
  from public.icons
  where status = any (statuses)
  group by category_id;
$$;

-- Hàm cũ ở 0003 được thay bằng hàm trên.
drop function if exists public.icon_category_counts();
