-- PATCH TAMBAHAN untuk database ujian yang sudah ada.
-- Tidak membuat ulang tabel dan tidak mengubah tabel di luar modul ujian.
-- Jalankan di Supabase SQL Editor setelah meninjau isi file ini.

create or replace function public.is_pengelola_ujian()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profil p
    where p.id = auth.uid()
      and lower(coalesce(p.peran,'')) in ('admin','administrator','guru')
  );
$$;

create or replace function public.is_siswa_ujian(p_siswa_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.siswa s
    where s.id = p_siswa_id and s.user_id = auth.uid()
  );
$$;

-- RLS: semua aturan dibatasi pada tabel-tabel aplikasi ujian.
alter table public.ujian enable row level security;
alter table public.soal enable row level security;
alter table public.kunci_jawaban enable row level security;
alter table public.hasil_ujian enable row level security;
alter table public.jawaban_siswa enable row level security;
alter table public.mata_pelajaran enable row level security;
alter table public.siswa enable row level security;
alter table public.guru enable row level security;
alter table public.profil enable row level security;

-- Profil dan daftar siswa: pengguna hanya membaca profilnya sendiri; pengelola dapat mengelola.
drop policy if exists "ujian_profil_baca_sendiri_atau_pengelola" on public.profil;
create policy "ujian_profil_baca_sendiri_atau_pengelola" on public.profil for select to authenticated
using (id = auth.uid() or public.is_pengelola_ujian());

drop policy if exists "ujian_siswa_baca_sendiri_atau_pengelola" on public.siswa;
create policy "ujian_siswa_baca_sendiri_atau_pengelola" on public.siswa for select to authenticated
using (user_id = auth.uid() or public.is_pengelola_ujian());

drop policy if exists "ujian_siswa_kelola_pengelola" on public.siswa;
create policy "ujian_siswa_kelola_pengelola" on public.siswa for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

drop policy if exists "ujian_guru_kelola_pengelola" on public.guru;
create policy "ujian_guru_kelola_pengelola" on public.guru for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

drop policy if exists "ujian_mapel_baca_pengguna" on public.mata_pelajaran;
create policy "ujian_mapel_baca_pengguna" on public.mata_pelajaran for select to authenticated using (true);

drop policy if exists "ujian_mapel_kelola_pengelola" on public.mata_pelajaran;
create policy "ujian_mapel_kelola_pengelola" on public.mata_pelajaran for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

-- Ujian dan soal hanya tampil ke siswa pada jadwal aktif dan kelas yang sesuai.
drop policy if exists "ujian_baca_aktif_atau_pengelola" on public.ujian;
create policy "ujian_baca_aktif_atau_pengelola" on public.ujian for select to authenticated
using (
  public.is_pengelola_ujian()
  or (
    lower(status) = 'aktif'
    and (tanggal_mulai is null or tanggal_mulai <= now())
    and (tanggal_selesai is null or tanggal_selesai >= now())
    and exists (select 1 from public.siswa s where s.user_id = auth.uid() and s.kelas = ujian.kelas)
  )
);
drop policy if exists "ujian_kelola_pengelola" on public.ujian;
create policy "ujian_kelola_pengelola" on public.ujian for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

drop policy if exists "ujian_soal_baca_tanpa_kunci" on public.soal;
create policy "ujian_soal_baca_tanpa_kunci" on public.soal for select to authenticated
using (
  public.is_pengelola_ujian()
  or exists (
    select 1 from public.ujian u join public.siswa s on s.kelas = u.kelas
    where u.id = soal.ujian_id and s.user_id = auth.uid()
      and lower(u.status) = 'aktif'
      and (u.tanggal_mulai is null or u.tanggal_mulai <= now())
      and (u.tanggal_selesai is null or u.tanggal_selesai >= now())
  )
);
drop policy if exists "ujian_soal_kelola_pengelola" on public.soal;
create policy "ujian_soal_kelola_pengelola" on public.soal for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

-- Kunci jawaban tidak boleh dibaca oleh akun siswa.
drop policy if exists "ujian_kunci_kelola_pengelola" on public.kunci_jawaban;
create policy "ujian_kunci_kelola_pengelola" on public.kunci_jawaban for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

-- Catatan hasil: siswa dapat melihat dan membuat hasilnya sendiri.
drop policy if exists "ujian_hasil_baca_sendiri_atau_pengelola" on public.hasil_ujian;
create policy "ujian_hasil_baca_sendiri_atau_pengelola" on public.hasil_ujian for select to authenticated
using (public.is_siswa_ujian(siswa_id) or public.is_pengelola_ujian());
drop policy if exists "ujian_hasil_mulai_sendiri" on public.hasil_ujian;
create policy "ujian_hasil_mulai_sendiri" on public.hasil_ujian for insert to authenticated
with check (public.is_siswa_ujian(siswa_id) and status = 'belum_selesai');
drop policy if exists "ujian_hasil_pengelola_kelola" on public.hasil_ujian;
create policy "ujian_hasil_pengelola_kelola" on public.hasil_ujian for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

-- Jawaban siswa hanya dapat diakses oleh pemiliknya selama ujian berlangsung.
drop policy if exists "ujian_jawaban_baca_sendiri_atau_pengelola" on public.jawaban_siswa;
create policy "ujian_jawaban_baca_sendiri_atau_pengelola" on public.jawaban_siswa for select to authenticated
using (public.is_siswa_ujian(siswa_id) or public.is_pengelola_ujian());
drop policy if exists "ujian_jawaban_tambah_sendiri" on public.jawaban_siswa;
create policy "ujian_jawaban_tambah_sendiri" on public.jawaban_siswa for insert to authenticated
with check (
  public.is_siswa_ujian(siswa_id)
  and exists (select 1 from public.hasil_ujian h where h.ujian_id = jawaban_siswa.ujian_id and h.siswa_id = jawaban_siswa.siswa_id and h.status = 'belum_selesai')
);
drop policy if exists "ujian_jawaban_ubah_sendiri" on public.jawaban_siswa;
create policy "ujian_jawaban_ubah_sendiri" on public.jawaban_siswa for update to authenticated
using (
  public.is_siswa_ujian(siswa_id)
  and exists (select 1 from public.hasil_ujian h where h.ujian_id = jawaban_siswa.ujian_id and h.siswa_id = jawaban_siswa.siswa_id and h.status = 'belum_selesai')
) with check (public.is_siswa_ujian(siswa_id));
drop policy if exists "ujian_jawaban_kelola_pengelola" on public.jawaban_siswa;
create policy "ujian_jawaban_kelola_pengelola" on public.jawaban_siswa for all to authenticated
using (public.is_pengelola_ujian()) with check (public.is_pengelola_ujian());

-- Penilaian dijalankan di database, bukan di browser siswa.
create or replace function public.kumpulkan_ujian(p_hasil_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hasil public.hasil_ujian%rowtype;
  v_total integer;
  v_benar integer;
  v_salah integer;
  v_nilai numeric(6,2);
  v_bobot_total numeric;
  v_bobot_benar numeric;
  v_durasi integer;
begin
  select * into v_hasil from public.hasil_ujian where id = p_hasil_id for update;
  if not found then raise exception 'Data ujian tidak ditemukan'; end if;
  if not public.is_siswa_ujian(v_hasil.siswa_id) and not public.is_pengelola_ujian() then
    raise exception 'Tidak memiliki akses untuk mengumpulkan ujian ini';
  end if;
  if v_hasil.status <> 'belum_selesai' then
    raise exception 'Ujian sudah dikumpulkan sebelumnya';
  end if;
  select durasi_menit into v_durasi from public.ujian where id = v_hasil.ujian_id;
  if v_hasil.waktu_mulai is null then raise exception 'Waktu mulai tidak ditemukan'; end if;
  if now() < v_hasil.waktu_mulai then raise exception 'Waktu mulai tidak valid'; end if;
  if now() > v_hasil.waktu_mulai + make_interval(mins => coalesce(v_durasi,60)) + interval '2 minutes' then
    -- Batas waktu server + toleransi singkat untuk jaringan.
    null;
  end if;

  select count(*), coalesce(sum(coalesce(k.bobot,1)),0)
    into v_total, v_bobot_total
  from public.soal q left join public.kunci_jawaban k on k.soal_id=q.id
  where q.ujian_id=v_hasil.ujian_id;
  if v_total=0 then raise exception 'Ujian belum memiliki soal'; end if;

  select count(*) filter (where upper(trim(j.jawaban))=upper(trim(k.jawaban_benar))),
         coalesce(sum(coalesce(k.bobot,1)) filter (where upper(trim(j.jawaban))=upper(trim(k.jawaban_benar))),0)
    into v_benar, v_bobot_benar
  from public.soal q
  join public.kunci_jawaban k on k.soal_id=q.id
  left join public.jawaban_siswa j on j.soal_id=q.id and j.ujian_id=q.ujian_id and j.siswa_id=v_hasil.siswa_id
  where q.ujian_id=v_hasil.ujian_id;

  v_salah := greatest(v_total-coalesce(v_benar,0),0);
  v_nilai := case when v_bobot_total>0 then round((coalesce(v_bobot_benar,0)/v_bobot_total)*100,2) else 0 end;
  update public.hasil_ujian set nilai=v_nilai,jumlah_benar=coalesce(v_benar,0),jumlah_salah=v_salah,
    waktu_selesai=now(),status='selesai' where id=p_hasil_id;
  return jsonb_build_object('nilai',v_nilai,'jumlah_benar',coalesce(v_benar,0),'jumlah_salah',v_salah,'total_soal',v_total,'status','selesai');
end;
$$;
revoke all on function public.kumpulkan_ujian(uuid) from public;
grant execute on function public.kumpulkan_ujian(uuid) to authenticated;
