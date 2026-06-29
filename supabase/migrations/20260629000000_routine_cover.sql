-- Portada y descripción de rutinas.

alter table public.routines add column if not exists description text;
alter table public.routines add column if not exists cover_url text;

insert into storage.buckets (id, name, public)
values ('routine-covers', 'routine-covers', true)
on conflict (id) do nothing;

drop policy if exists "routine_covers_read_all" on storage.objects;
create policy "routine_covers_read_all" on storage.objects for select to public
  using (bucket_id = 'routine-covers');

drop policy if exists "routine_covers_insert_own" on storage.objects;
create policy "routine_covers_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'routine-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "routine_covers_update_own" on storage.objects;
create policy "routine_covers_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'routine-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "routine_covers_delete_own" on storage.objects;
create policy "routine_covers_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'routine-covers' and (storage.foldername(name))[1] = auth.uid()::text);
