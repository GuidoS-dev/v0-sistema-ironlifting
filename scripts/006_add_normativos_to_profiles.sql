-- ═══════════════════════════════════════════════════════════════
-- Agrega columna normativos a profiles para persistir
-- la tabla de ejercicios customizada por coach
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists normativos jsonb default null;
