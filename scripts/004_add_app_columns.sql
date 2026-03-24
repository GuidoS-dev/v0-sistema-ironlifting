-- ═══════════════════════════════════════════════════════════════
-- Agrega columnas para sincronización de la app a las tablas existentes
-- Ejecutar en Supabase SQL Editor ANTES de scripts/003 si ya existe el esquema
-- ═══════════════════════════════════════════════════════════════

-- ─── ATLETAS ─────────────────────────────────────────────────────────────────
alter table public.atletas
  add column if not exists app_id        text unique,
  add column if not exists pct_overrides jsonb not null default '{}';

-- ─── MESOCICLOS ──────────────────────────────────────────────────────────────
alter table public.mesociclos
  add column if not exists app_id         text unique,
  add column if not exists app_atleta_id  text,
  add column if not exists descripcion    text,
  add column if not exists duracion_ciclo integer,
  add column if not exists duracion_mens  integer,
  add column if not exists ultimo_inicio  text,
  add column if not exists overrides      jsonb not null default '{}';

-- ─── PLANTILLAS ──────────────────────────────────────────────────────────────
alter table public.plantillas
  add column if not exists app_id       text unique,
  add column if not exists irm_arranque numeric,
  add column if not exists irm_envion   numeric,
  add column if not exists overrides    jsonb not null default '{}';
