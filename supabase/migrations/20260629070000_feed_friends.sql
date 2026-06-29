-- El feed de Comunidades mezcla contenido de grupos y de amigos:
-- un check-in (group_post) es visible para miembros del grupo, para amigos del
-- autor, y para el propio autor (perfil).

drop policy if exists "gp_select" on public.group_posts;
create policy "gp_select" on public.group_posts for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
    or public.are_friends(auth.uid(), user_id)
  );

-- Likes y comentarios visibles si podés ver el post.
drop policy if exists "pl_select" on public.post_likes;
create policy "pl_select" on public.post_likes for select to authenticated
  using (exists (
    select 1 from public.group_posts gp
    where gp.id = post_id
      and (gp.user_id = auth.uid() or public.is_group_member(gp.group_id) or public.are_friends(auth.uid(), gp.user_id))
  ));

drop policy if exists "pc_select" on public.post_comments;
create policy "pc_select" on public.post_comments for select to authenticated
  using (exists (
    select 1 from public.group_posts gp
    where gp.id = post_id
      and (gp.user_id = auth.uid() or public.is_group_member(gp.group_id) or public.are_friends(auth.uid(), gp.user_id))
  ));
