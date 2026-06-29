-- Los co-miembros de un grupo pueden ver los check-ins de los demás miembros
-- (para el feed de cada grupo y el feed general de Comunidades).

create or replace function public.shares_group(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.group_members g1
    join public.group_members g2 on g1.group_id = g2.group_id
    where g1.user_id = a and g2.user_id = b
  )
$$;

drop policy if exists "gp_select" on public.group_posts;
create policy "gp_select" on public.group_posts for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
    or public.are_friends(auth.uid(), user_id)
    or public.shares_group(auth.uid(), user_id)
  );

drop policy if exists "pl_select" on public.post_likes;
create policy "pl_select" on public.post_likes for select to authenticated
  using (exists (
    select 1 from public.group_posts gp
    where gp.id = post_id
      and (gp.user_id = auth.uid() or public.is_group_member(gp.group_id) or public.are_friends(auth.uid(), gp.user_id) or public.shares_group(auth.uid(), gp.user_id))
  ));

drop policy if exists "pc_select" on public.post_comments;
create policy "pc_select" on public.post_comments for select to authenticated
  using (exists (
    select 1 from public.group_posts gp
    where gp.id = post_id
      and (gp.user_id = auth.uid() or public.is_group_member(gp.group_id) or public.are_friends(auth.uid(), gp.user_id) or public.shares_group(auth.uid(), gp.user_id))
  ));
