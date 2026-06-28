-- Desafíos (challenges): crear, asignar a comunidad (con aprobación) o invitar individuos.

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  duration_days int,
  objective text,
  group_id uuid references public.groups(id) on delete set null,
  status text not null default 'active' check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists challenges_group_idx on public.challenges(group_id);
create index if not exists challenges_creator_idx on public.challenges(creator_id);

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index if not exists challenge_participants_user_idx on public.challenge_participants(user_id);

-- Helper security definer: ¿puede el usuario actual ver este desafío?
create or replace function public.can_see_challenge(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.challenges c
    where c.id = cid
      and (
        c.status = 'active'
        or c.creator_id = auth.uid()
        or (c.group_id is not null and public.is_group_member(c.group_id))
        or exists (
          select 1 from public.challenge_participants p
          where p.challenge_id = c.id and p.user_id = auth.uid()
        )
      )
  )
$$;

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

drop policy if exists "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges for select to authenticated
  using (public.can_see_challenge(id));

drop policy if exists "challenges_insert" on public.challenges;
create policy "challenges_insert" on public.challenges for insert to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "challenges_update" on public.challenges;
create policy "challenges_update" on public.challenges for update to authenticated
  using (creator_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)))
  with check (creator_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)));

drop policy if exists "challenges_delete" on public.challenges;
create policy "challenges_delete" on public.challenges for delete to authenticated
  using (creator_id = auth.uid());

drop policy if exists "cp_select" on public.challenge_participants;
create policy "cp_select" on public.challenge_participants for select to authenticated
  using (public.can_see_challenge(challenge_id));

drop policy if exists "cp_insert" on public.challenge_participants;
create policy "cp_insert" on public.challenge_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
  );

drop policy if exists "cp_update" on public.challenge_participants;
create policy "cp_update" on public.challenge_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cp_delete" on public.challenge_participants;
create policy "cp_delete" on public.challenge_participants for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
  );
