-- Sistema de amistades (solicitud -> aceptación).

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
create index if not exists friendships_requester_idx on public.friendships(requester_id);

alter table public.friendships enable row level security;

-- Veo las amistades donde participo (como solicitante o destinatario).
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Solo puedo crear solicitudes a mi nombre.
drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());

-- El destinatario puede aceptar (update).
drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

-- Cualquiera de los dos puede borrar (rechazar / cancelar / eliminar amistad).
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ¿Son amigos (aceptados) los dos usuarios dados? (para visibilidad de datos)
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  )
$$;
