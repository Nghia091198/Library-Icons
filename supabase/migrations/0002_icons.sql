create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.icon_sets (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  name          text not null,
  description   text not null default '',
  style         text not null check (style in ('outline', 'solid', 'brand')),
  stroke_width  numeric(3, 2) check (stroke_width > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((style = 'outline') = (stroke_width is not null))
);

create table public.icons (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references public.icon_sets (id) on delete restrict,
  slug           text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  name           text not null,
  description    text not null default '',
  svg            text not null,
  source_svg     text not null,
  content_hash   text not null,
  tags           text[] not null default '{}',
  use_cases      text[] not null default '{}',
  aliases        text[] not null default '{}',
  is_multicolor  boolean not null default false,
  status         text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (set_id, slug),
  unique (set_id, content_hash),
  check (status = 'draft' or published_at is not null)
);

create table public.audit_logs (
  id           bigint generated always as identity primary key,
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,
  actor        text not null,
  changes      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index icons_set_status_idx on public.icons (set_id, status);
create index icons_tags_idx on public.icons using gin (tags);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create trigger icon_sets_set_updated_at
  before update on public.icon_sets
  for each row execute function public.set_updated_at();

create trigger icons_set_updated_at
  before update on public.icons
  for each row execute function public.set_updated_at();

-- Bật RLS và cố ý KHÔNG tạo policy: chỉ server (secret key, bỏ qua RLS) đọc ghi được.
alter table public.icon_sets enable row level security;
alter table public.icons enable row level security;
alter table public.audit_logs enable row level security;

insert into public.icon_sets (slug, name, description, style, stroke_width) values
  ('outline', 'Outline', 'Icon nét, độ dày 1.5 trên lưới 24', 'outline', 1.5),
  ('solid', 'Solid', 'Icon khối một màu', 'solid', null),
  ('brand', 'Brand', 'Logo thương hiệu và mạng xã hội', 'brand', null);
