-- Foto asociada a una sesión de entrenamiento.
alter table public.workouts add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

drop policy if exists "workout_photos_read_all" on storage.objects;
create policy "workout_photos_read_all" on storage.objects for select to public
  using (bucket_id = 'workout-photos');

drop policy if exists "workout_photos_insert_own" on storage.objects;
create policy "workout_photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "workout_photos_update_own" on storage.objects;
create policy "workout_photos_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "workout_photos_delete_own" on storage.objects;
create policy "workout_photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = auth.uid()::text);
