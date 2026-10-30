-- Jalankan sekali di Supabase SQL Editor. Jangan hapus data produksi saat migrasi.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null,
  category text not null,
  tech_stack text not null default '',
  price bigint not null default 0 check (price >= 0),
  image_url text not null default '',
  demo_url text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'VanStore',
  whatsapp text not null default '6285725065630',
  welcome text not null default 'Temukan website siap pakai untuk bisnis Anda.'
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;
-- Isi nomor toko hanya jika belum ada nomor; jangan menimpa pengaturan yang sudah ada.
update public.store_settings set whatsapp = '6285725065630' where id = 1 and trim(whatsapp) = '';
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
-- Hanya admin dapat membaca baris keanggotaan dirinya sendiri.
drop policy if exists "admins read own membership" on public.admin_users;
create policy "admins read own membership" on public.admin_users for select to authenticated using (user_id = auth.uid());
drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select to anon, authenticated using (published = true);
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products for all to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "admin manage store settings" on public.store_settings;
create policy "admin manage store settings" on public.store_settings for all to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
-- Setelah membuat user melalui Authentication > Users, jalankan perintah berikut
-- dengan mengganti email sesuai akun admin Anda:
-- insert into public.admin_users (user_id) select id from auth.users where email = 'EMAIL_ADMIN_ANDA' on conflict do nothing;

-- Gambar katalog publik. Hanya akun admin dapat mengunggah/menghapus gambar.
-- Jangan gunakan bucket ini untuk source code atau file rahasia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = auth.uid()));
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = auth.uid()));
