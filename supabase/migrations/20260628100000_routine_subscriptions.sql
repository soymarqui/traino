-- Suscripciones a rutinas públicas de otros usuarios (lectura viva).
create table if not exists public.routine_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, routine_id)
);
alter table public.routine_subscriptions enable row level security;

drop policy if exists "routine_subscriptions_select_own" on public.routine_subscriptions;
create policy "routine_subscriptions_select_own" on public.routine_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "routine_subscriptions_insert_own" on public.routine_subscriptions;
create policy "routine_subscriptions_insert_own" on public.routine_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "routine_subscriptions_delete_own" on public.routine_subscriptions;
create policy "routine_subscriptions_delete_own" on public.routine_subscriptions for delete to authenticated
  using (user_id = auth.uid());
