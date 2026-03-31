-- Persistencia de overrides normativos por atleta
-- Ejecutar en Supabase SQL Editor o mediante migracion

alter table public.atletas
  add column if not exists normativos_overrides jsonb not null default '{}'::jsonb;