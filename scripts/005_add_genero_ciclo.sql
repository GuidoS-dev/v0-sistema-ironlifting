-- ═══════════════════════════════════════════════════════════════
-- Agrega columnas genero y ciclo a la tabla atletas si no existen
-- Ejecutar en Supabase SQL Editor si la tabla fue creada sin esas columnas
-- ═══════════════════════════════════════════════════════════════

alter table public.atletas
  add column if not exists genero text default 'm',
  add column if not exists ciclo  text;  -- stored as JSON string
