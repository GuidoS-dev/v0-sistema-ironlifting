-- Create profiles table for users (coaches and athletes)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  email text,
  tipo text not null default 'atleta' check (tipo in ('atleta', 'coach')),
  telefono text,
  fecha_nacimiento date,
  notas text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
-- Users can view their own profile
create policy "profiles_select_own" on public.profiles 
  for select using (auth.uid() = id);

-- Users can insert their own profile
create policy "profiles_insert_own" on public.profiles 
  for insert with check (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles 
  for update using (auth.uid() = id);

-- Coaches can view profiles of athletes they manage (for future use)
create policy "coaches_view_athletes" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles coach 
      where coach.id = auth.uid() 
      and coach.tipo = 'coach'
    )
  );
