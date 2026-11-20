-- Jalankan seluruh SQL ini di Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.is_school_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()); $$;

create table if not exists public.ppdb_applications (
  id uuid primary key default gen_random_uuid(), nama text not null, asal_sekolah text not null,
  jurusan text not null, no_hp text not null, alamat text,
  status text not null default 'Baru' check(status in ('Baru','Diverifikasi','Diterima','Ditolak')),
  created_at timestamptz not null default now()
);
create table if not exists public.bkk_applications (
  id uuid primary key default gen_random_uuid(), nama text not null, no_wa text not null,
  jurusan text not null, tahun_lulus text not null, posisi text not null, catatan text,
  status text not null default 'Baru' check(status in ('Baru','Diproses','Selesai')),
  created_at timestamptz not null default now()
);
create table if not exists public.bkk_vacancies (
  id uuid primary key default gen_random_uuid(), posisi text not null, perusahaan text not null,
  lokasi text not null, jurusan text not null, tipe text not null, ringkasan text not null,
  aktif boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.school_news (
  id uuid primary key default gen_random_uuid(), judul text not null, kategori text not null,
  tanggal date not null default current_date, gambar text, ringkasan text not null,
  aktif boolean not null default true, created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.ppdb_applications enable row level security;
alter table public.bkk_applications enable row level security;
alter table public.bkk_vacancies enable row level security;
alter table public.school_news enable row level security;

-- Hapus policy lama bernama sama sebelum menjalankan ulang script.
drop policy if exists "admin users read own" on public.admin_users;
create policy "admin users read own" on public.admin_users for select to authenticated using (user_id = auth.uid());
drop policy if exists "public submit ppdb" on public.ppdb_applications;
create policy "public submit ppdb" on public.ppdb_applications for insert to anon, authenticated with check (true);
drop policy if exists "admin manage ppdb" on public.ppdb_applications;
create policy "admin manage ppdb" on public.ppdb_applications for all to authenticated using (public.is_school_admin()) with check (public.is_school_admin());
drop policy if exists "public submit bkk" on public.bkk_applications;
create policy "public submit bkk" on public.bkk_applications for insert to anon, authenticated with check (true);
drop policy if exists "admin manage bkk" on public.bkk_applications;
create policy "admin manage bkk" on public.bkk_applications for all to authenticated using (public.is_school_admin()) with check (public.is_school_admin());
drop policy if exists "public read active vacancies" on public.bkk_vacancies;
create policy "public read active vacancies" on public.bkk_vacancies for select to anon, authenticated using (aktif = true);
drop policy if exists "admin manage vacancies" on public.bkk_vacancies;
create policy "admin manage vacancies" on public.bkk_vacancies for all to authenticated using (public.is_school_admin()) with check (public.is_school_admin());
drop policy if exists "public read published news" on public.school_news;
create policy "public read published news" on public.school_news for select to anon, authenticated using (aktif = true);
drop policy if exists "admin manage news" on public.school_news;
create policy "admin manage news" on public.school_news for all to authenticated using (public.is_school_admin()) with check (public.is_school_admin());

-- Setelah membuat akun admin melalui Authentication > Users, jalankan:
-- insert into public.admin_users(user_id) values ('UUID_USER_ADMIN');
