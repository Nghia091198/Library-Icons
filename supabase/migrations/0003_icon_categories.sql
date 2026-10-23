create table public.icon_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.icon_categories enable row level security;

alter table public.icons
  add column category_id uuid references public.icon_categories (id) on delete set null;

create index icons_category_idx on public.icons (category_id);

-- Đếm icon theo nhóm (bỏ icon đã lưu trữ) để hiện số lượng trên menu.
create or replace function public.icon_category_counts()
returns table (category_id uuid, icon_count bigint)
language sql
stable
set search_path = ''
as $$
  select category_id, count(*)
  from public.icons
  where status <> 'archived'
  group by category_id;
$$;

insert into public.icon_categories (slug, name, sort_order) values
  ('arrows', 'Arrows', 10),
  ('chevrons', 'Chevrons', 20),
  ('navigation', 'Navigation', 30),
  ('actions', 'Actions', 40),
  ('alerts', 'Alerts & Status', 50),
  ('commerce', 'Commerce', 60),
  ('payment', 'Payment', 70),
  ('shipping', 'Shipping', 80),
  ('communication', 'Communication', 90),
  ('social', 'Social', 100),
  ('brands', 'Brands', 110),
  ('users', 'Users', 120),
  ('media', 'Media', 130),
  ('files', 'Files', 140),
  ('editor', 'Editor', 150),
  ('layout', 'Layout', 160),
  ('date-time', 'Date & Time', 170),
  ('devices', 'Devices', 180),
  ('maps', 'Maps & Location', 190),
  ('security', 'Security', 200),
  ('data', 'Data & Charts', 210),
  ('development', 'Development', 220),
  ('weather', 'Weather', 230),
  ('education', 'Education', 240),
  ('countries', 'Countries', 250),
  ('other', 'Other', 1000);
