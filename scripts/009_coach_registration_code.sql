-- ═══════════════════════════════════════════════════════════════
-- Código de autorización para registro de coaches
-- Solo coaches autorizados por el admin pueden registrarse
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Tabla de configuración global del sistema
create table if not exists public.system_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- Insertar código de registro de coach por defecto
-- El admin puede cambiarlo con: UPDATE system_config SET value = 'NUEVO_CODIGO' WHERE key = 'coach_registration_code';
insert into public.system_config (key, value)
values ('coach_registration_code', 'IRON2026')
on conflict (key) do nothing;

-- RLS: nadie puede leer system_config directamente desde el cliente
alter table public.system_config enable row level security;
-- Sin políticas de SELECT = inaccesible desde el cliente

-- Función RPC para verificar el código (security definer = corre como admin)
-- Solo devuelve true/false, nunca expone el código real
create or replace function public.verify_coach_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.system_config
    where key = 'coach_registration_code'
    and value = input_code
  );
end;
$$;
