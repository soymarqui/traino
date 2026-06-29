-- Comentarios en los check-ins / posts de comunidades.

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments(post_id);

alter table public.post_comments enable row level security;

-- Visible para miembros del grupo del post.
drop policy if exists "pc_select" on public.post_comments;
create policy "pc_select" on public.post_comments for select to authenticated
  using (exists (select 1 from public.group_posts gp where gp.id = post_id and public.is_group_member(gp.group_id)));

drop policy if exists "pc_insert" on public.post_comments;
create policy "pc_insert" on public.post_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.group_posts gp where gp.id = post_id and public.is_group_member(gp.group_id))
  );

drop policy if exists "pc_delete" on public.post_comments;
create policy "pc_delete" on public.post_comments for delete to authenticated
  using (user_id = auth.uid());
