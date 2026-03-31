-- Espacio compartido entre coaches
-- Permite que varios usuarios autenticados lean/escriban en el mismo coach_id de datos

create table if not exists public.coach_shared_workspace (
	coach_id uuid primary key references auth.users(id) on delete cascade,
	workspace_owner_id uuid not null references auth.users(id) on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists coach_shared_workspace_owner_idx
	on public.coach_shared_workspace (workspace_owner_id);

alter table public.coach_shared_workspace enable row level security;

drop policy if exists "coach_shared_workspace_select_own" on public.coach_shared_workspace;
create policy "coach_shared_workspace_select_own"
	on public.coach_shared_workspace
	for select
	using (auth.uid() = coach_id);

-- Solo el dueño del espacio puede agregar miembros a su workspace
drop policy if exists "coach_shared_workspace_owner_insert" on public.coach_shared_workspace;
create policy "coach_shared_workspace_owner_insert"
	on public.coach_shared_workspace
	for insert
	with check (auth.uid() = workspace_owner_id);

-- El dueño puede editar membresias de su espacio
drop policy if exists "coach_shared_workspace_owner_update" on public.coach_shared_workspace;
create policy "coach_shared_workspace_owner_update"
	on public.coach_shared_workspace
	for update
	using (auth.uid() = workspace_owner_id)
	with check (auth.uid() = workspace_owner_id);

-- El dueño puede quitar miembros de su espacio
drop policy if exists "coach_shared_workspace_owner_delete" on public.coach_shared_workspace;
create policy "coach_shared_workspace_owner_delete"
	on public.coach_shared_workspace
	for delete
	using (auth.uid() = workspace_owner_id);

create or replace function public.app_effective_coach_id(request_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		(
			select csw.workspace_owner_id
			from public.coach_shared_workspace csw
			where csw.coach_id = request_user_id
			limit 1
		),
		request_user_id
	);
$$;

grant execute on function public.app_effective_coach_id(uuid) to authenticated;

do $$
begin
	if to_regclass('public.atletas') is not null then
		execute 'drop policy if exists "atletas_coach_all" on public.atletas';
		execute 'create policy "atletas_coach_all" on public.atletas using (coach_id = public.app_effective_coach_id(auth.uid())) with check (coach_id = public.app_effective_coach_id(auth.uid()))';
	end if;

	if to_regclass('public.mesociclos') is not null then
		execute 'drop policy if exists "mesociclos_coach_all" on public.mesociclos';
		execute 'create policy "mesociclos_coach_all" on public.mesociclos using (coach_id = public.app_effective_coach_id(auth.uid())) with check (coach_id = public.app_effective_coach_id(auth.uid()))';
	end if;

	if to_regclass('public.plantillas') is not null then
		execute 'drop policy if exists "plantillas_coach_all" on public.plantillas';
		execute 'create policy "plantillas_coach_all" on public.plantillas using (coach_id = public.app_effective_coach_id(auth.uid())) with check (coach_id = public.app_effective_coach_id(auth.uid()))';
	end if;

	if to_regclass('public.coach_settings') is not null then
		execute 'drop policy if exists "coach_settings_owner_all" on public.coach_settings';
		execute 'create policy "coach_settings_owner_all" on public.coach_settings using (coach_id = public.app_effective_coach_id(auth.uid())) with check (coach_id = public.app_effective_coach_id(auth.uid()))';
	end if;
end $$;
