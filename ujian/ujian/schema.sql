-- Jalankan di Supabase SQL Editor pada proyek sekolah.
-- Skema awal ujian online SMK Bina Mandiri Pamarayan.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  student_number text unique,
  class_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  class_name text not null default 'XII',
  duration_minutes integer not null check (duration_minutes > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  instructions text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_option integer not null check (correct_option >= 0),
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique(exam_id, student_id)
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option integer not null check (selected_option >= 0),
  updated_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;

-- Helper: role admin dari profil pengguna yang sedang login.
create or replace function public.is_exam_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

create policy "profile read self or admin" on public.profiles for select
using (id=auth.uid() or public.is_exam_admin());
create policy "admin manage profiles" on public.profiles for all
using (public.is_exam_admin()) with check (public.is_exam_admin());

create policy "student read published exams" on public.exams for select
using (is_published=true or public.is_exam_admin());
create policy "admin manage exams" on public.exams for all
using (public.is_exam_admin()) with check (public.is_exam_admin());

-- Catatan keamanan penting:
-- Pada versi produksi, jangan pernah mengirim correct_option ke browser siswa.
-- Kebijakan baca soal di bawah ini perlu diganti dengan VIEW/RPC aman yang
-- hanya mengembalikan teks soal dan opsi tanpa kunci jawaban.
-- Untuk prototipe awal, batasi baca soal pada ujian terbit; admin dapat mengelola.
create policy "read questions for published exams" on public.questions for select
using (exists(select 1 from public.exams e where e.id=exam_id and e.is_published=true) or public.is_exam_admin());
create policy "admin manage questions" on public.questions for all
using (public.is_exam_admin()) with check (public.is_exam_admin());

create policy "student read own attempts or admin" on public.attempts for select
using (student_id=auth.uid() or public.is_exam_admin());
create policy "student create own attempt" on public.attempts for insert
with check (student_id=auth.uid() and status='in_progress');
create policy "student submit own attempt or admin" on public.attempts for update
using (student_id=auth.uid() or public.is_exam_admin())
with check (student_id=auth.uid() or public.is_exam_admin());

create policy "student read own answers or admin" on public.attempt_answers for select
using (exists(select 1 from public.attempts a where a.id=attempt_id and a.student_id=auth.uid()) or public.is_exam_admin());
create policy "student save own answers or admin" on public.attempt_answers for insert
with check (exists(select 1 from public.attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status='in_progress') or public.is_exam_admin());
create policy "student update own answers or admin" on public.attempt_answers for update
using (exists(select 1 from public.attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status='in_progress') or public.is_exam_admin())
with check (exists(select 1 from public.attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status='in_progress') or public.is_exam_admin());

-- PENTING: SQL ini adalah fondasi awal, bukan konfigurasi final siap ujian.
-- Sebelum ujian sungguhan, implementasikan RPC server-side untuk:
-- 1) mengeluarkan soal tanpa correct_option,
-- 2) membatasi satu percobaan dan durasi berdasarkan waktu server,
-- 3) menghitung nilai di server, bukan di perangkat siswa,
-- 4) mencegah perubahan jawaban setelah submit/waktu habis.
