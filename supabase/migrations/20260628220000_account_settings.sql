-- Configuración de cuenta: visibilidad del perfil y permiso para ser agregado a comunidades.

alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists allow_community_add boolean not null default true;

-- Un admin solo puede agregar a alguien si ese usuario lo permite (allow_community_add).
-- El dueño del grupo siempre puede auto-agregarse al crearlo.
drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members for insert to authenticated
  with check (
    (public.is_group_admin(group_id) and exists (select 1 from public.profiles p where p.id = user_id and p.allow_community_add))
    or (user_id = auth.uid() and exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  );
