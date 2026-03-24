-- ═══════════════════════════════════════════════════════════════
-- Tablas principales de la aplicación IronLifting
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── ATLETAS ─────────────────────────────────────────────────────────────────
create table if not exists public.atletas (
  id            text        primary key,
  coach_id      uuid        not null references auth.users(id) on delete cascade,
  data          jsonb       not null default '{}',
  pct_overrides jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.atletas enable row level security;

create policy "atletas_coach_all" on public.atletas
  using  (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ─── MESOCICLOS ──────────────────────────────────────────────────────────────
create table if not exists public.mesociclos (
  id         text        primary key,
  coach_id   uuid        not null references auth.users(id) on delete cascade,
  atleta_id  text,
  data       jsonb       not null default '{}',
  overrides  jsonb       not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mesociclos enable row level security;

create policy "mesociclos_coach_all" on public.mesociclos
  using  (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ─── PLANTILLAS ──────────────────────────────────────────────────────────────
create table if not exists public.plantillas (
  id         text        primary key,
  coach_id   uuid        not null references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plantillas enable row level security;

create policy "plantillas_coach_all" on public.plantillas
  using  (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────
create index if not exists atletas_coach_idx    on public.atletas    (coach_id);
create index if not exists mesociclos_coach_idx on public.mesociclos (coach_id);
create index if not exists mesociclos_atleta_idx on public.mesociclos (atleta_id);
create index if not exists plantillas_coach_idx on public.plantillas (coach_id);
