-- Ejercicios favoritos del usuario.
create table if not exists public.exercise_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);
alter table public.exercise_favorites enable row level security;

drop policy if exists "exercise_favorites_select_own" on public.exercise_favorites;
create policy "exercise_favorites_select_own" on public.exercise_favorites for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "exercise_favorites_insert_own" on public.exercise_favorites;
create policy "exercise_favorites_insert_own" on public.exercise_favorites for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "exercise_favorites_delete_own" on public.exercise_favorites;
create policy "exercise_favorites_delete_own" on public.exercise_favorites for delete to authenticated
  using (user_id = auth.uid());
