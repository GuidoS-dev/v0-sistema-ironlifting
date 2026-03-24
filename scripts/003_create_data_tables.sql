-- Tabla: atletas (vinculada al coach que los creó)
create table if not exists public.atletas (
  id text primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  nombre text,
  email text,
  telefono text,
  fecha_nacimiento date,
  notas text,
  tipo text default 'atleta',
  genero text,
  ciclo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla: mesociclos (con semanas anidadas en JSONB)
create table if not exists public.mesociclos (
  id text primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  atleta_id text,
  nombre text,
  descripcion text,
  fecha_inicio date,
  modo text,
  volumen_total integer,
  irm_arranque text,
  irm_envion text,
  semanas jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla: plantillas (objeto completo en JSONB)
create table if not exists public.plantillas (
  id text primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  nombre text,
  tipo text,
  creado date,
  data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.atletas enable row level security;
alter table public.mesociclos enable row level security;
alter table public.plantillas enable row level security;

-- Políticas: cada coach solo ve y modifica sus propios datos
create policy "atletas_own" on public.atletas
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "mesociclos_own" on public.mesociclos
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "plantillas_own" on public.plantillas
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
