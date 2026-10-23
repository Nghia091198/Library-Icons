-- Supabase khuyến nghị cài extension vào schema `extensions`, không cài vào `public`.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
