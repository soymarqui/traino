-- Perfiles certificados (profesores/entrenadores) + solicitudes de certificación.

alter table public.profiles add column if not exists is_certified boolean not null default false;

create table if not exists public.certification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_url text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists certification_requests_status_idx on public.certification_requests(status);
create index if not exists certification_requests_user_idx on public.certification_requests(user_id);

alter table public.certification_requests enable row level security;

drop policy if exists "cr_select" on public.certification_requests;
create policy "cr_select" on public.certification_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "cr_insert_own" on public.certification_requests;
create policy "cr_insert_own" on public.certification_requests for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "cr_update_admin" on public.certification_requests;
create policy "cr_update_admin" on public.certification_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- El admin puede marcar a un usuario como certificado.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bucket privado para la documentación (lo lee el dueño y el admin).
insert into storage.buckets (id, name, public)
values ('certifications', 'certifications', false)
on conflict (id) do nothing;

drop policy if exists "cert_docs_read" on storage.objects;
create policy "cert_docs_read" on storage.objects for select to authenticated
  using (bucket_id = 'certifications' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "cert_docs_insert_own" on storage.objects;
create policy "cert_docs_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'certifications' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cert_docs_delete_own" on storage.objects;
create policy "cert_docs_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'certifications' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
