-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', null),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'tipo', 'atleta')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Drop existing trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
