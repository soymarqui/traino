-- Likes (💪) sobre los check-ins / posts de comunidades.

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists post_likes_post_idx on public.post_likes(post_id);

alter table public.post_likes enable row level security;

-- Visible para miembros del grupo del post (misma regla que group_posts).
drop policy if exists "pl_select" on public.post_likes;
create policy "pl_select" on public.post_likes for select to authenticated
  using (exists (select 1 from public.group_posts gp where gp.id = post_id and public.is_group_member(gp.group_id)));

drop policy if exists "pl_insert" on public.post_likes;
create policy "pl_insert" on public.post_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.group_posts gp where gp.id = post_id and public.is_group_member(gp.group_id))
  );

drop policy if exists "pl_delete" on public.post_likes;
create policy "pl_delete" on public.post_likes for delete to authenticated
  using (user_id = auth.uid());
