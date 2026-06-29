-- Likes (💪) en rutinas.

create table if not exists public.routine_likes (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (routine_id, user_id)
);
create index if not exists routine_likes_routine_idx on public.routine_likes(routine_id);

alter table public.routine_likes enable row level security;

-- Conteos visibles para cualquier autenticado.
drop policy if exists "rl_select" on public.routine_likes;
create policy "rl_select" on public.routine_likes for select to authenticated using (true);

drop policy if exists "rl_insert" on public.routine_likes;
create policy "rl_insert" on public.routine_likes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "rl_delete" on public.routine_likes;
create policy "rl_delete" on public.routine_likes for delete to authenticated
  using (user_id = auth.uid());
