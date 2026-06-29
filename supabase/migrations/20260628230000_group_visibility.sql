-- Visibilidad de comunidades: pública (buscable, auto-join) o privada (solo invitación).

alter table public.groups add column if not exists visibility text not null default 'private'
  check (visibility in ('public', 'private'));

-- Las comunidades públicas son visibles para cualquier autenticado (para el buscador).
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups for select to authenticated
  using (visibility = 'public' or owner_id = auth.uid() or public.is_group_member(id));

-- Cualquiera puede unirse a un grupo público (auto-join); en privados sigue mandando el admin.
drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members for insert to authenticated
  with check (
    (public.is_group_admin(group_id) and exists (select 1 from public.profiles p where p.id = user_id and p.allow_community_add))
    or (user_id = auth.uid() and exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
    or (user_id = auth.uid() and exists (select 1 from public.groups g where g.id = group_id and g.visibility = 'public'))
  );
