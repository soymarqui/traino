-- Permitir check-ins "personales" (sin grupo): van al feed de Comunidades,
-- visibles para los amigos del autor. group_id pasa a ser opcional.

alter table public.group_posts alter column group_id drop not null;

drop policy if exists "gp_insert" on public.group_posts;
create policy "gp_insert" on public.group_posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
