-- Etiquetas de usuarios en check-ins (para notificar al etiquetado).

create table if not exists public.post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  tagged_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, tagged_user_id)
);
create index if not exists post_tags_tagged_idx on public.post_tags(tagged_user_id);

alter table public.post_tags enable row level security;

-- Lo ve el etiquetado y el autor del post.
drop policy if exists "ptag_select" on public.post_tags;
create policy "ptag_select" on public.post_tags for select to authenticated
  using (
    tagged_user_id = auth.uid()
    or exists (select 1 from public.group_posts gp where gp.id = post_id and gp.user_id = auth.uid())
  );

-- Solo el autor del post puede etiquetar.
drop policy if exists "ptag_insert" on public.post_tags;
create policy "ptag_insert" on public.post_tags for insert to authenticated
  with check (exists (select 1 from public.group_posts gp where gp.id = post_id and gp.user_id = auth.uid()));

drop policy if exists "ptag_delete" on public.post_tags;
create policy "ptag_delete" on public.post_tags for delete to authenticated
  using (exists (select 1 from public.group_posts gp where gp.id = post_id and gp.user_id = auth.uid()));
