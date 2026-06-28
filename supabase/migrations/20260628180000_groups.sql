-- Grupos (comunidad): creación, miembros, feed y eventos/desafíos.

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);

create table if not exists public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  summary text,
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists group_posts_group_idx on public.group_posts(group_id);

create table if not exists public.group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists group_events_group_idx on public.group_events(group_id);

create table if not exists public.group_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.group_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (event_id, user_id)
);

-- Helpers security definer (evitan recursión de RLS sobre group_members).
create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid())
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role = 'admin')
$$;

-- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.group_events enable row level security;
alter table public.group_event_participants enable row level security;

drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));
drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "gm_select" on public.group_members;
create policy "gm_select" on public.group_members for select to authenticated
  using (public.is_group_member(group_id));
drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members for insert to authenticated
  with check (
    public.is_group_admin(group_id)
    or (user_id = auth.uid() and exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  );
drop policy if exists "gm_delete" on public.group_members;
create policy "gm_delete" on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists "gp_select" on public.group_posts;
create policy "gp_select" on public.group_posts for select to authenticated
  using (public.is_group_member(group_id));
drop policy if exists "gp_insert" on public.group_posts;
create policy "gp_insert" on public.group_posts for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));
drop policy if exists "gp_delete" on public.group_posts;
create policy "gp_delete" on public.group_posts for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists "ge_select" on public.group_events;
create policy "ge_select" on public.group_events for select to authenticated
  using (public.is_group_member(group_id));
drop policy if exists "ge_write_admin" on public.group_events;
create policy "ge_write_admin" on public.group_events for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

drop policy if exists "gep_select" on public.group_event_participants;
create policy "gep_select" on public.group_event_participants for select to authenticated
  using (exists (select 1 from public.group_events e where e.id = event_id and public.is_group_member(e.group_id)));
drop policy if exists "gep_insert" on public.group_event_participants;
create policy "gep_insert" on public.group_event_participants for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.group_events e where e.id = event_id and public.is_group_member(e.group_id)));
drop policy if exists "gep_delete" on public.group_event_participants;
create policy "gep_delete" on public.group_event_participants for delete to authenticated
  using (user_id = auth.uid());
