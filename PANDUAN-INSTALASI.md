# Website SMK Bina Mandiri — Paket Pengembangan

Paket ini mempertahankan halaman utama, logo, foto kepala sekolah, PPDB, dan BKK dari source yang diberikan. Pengembangan menambahkan fondasi Supabase, panel admin, pengelolaan berita, lowongan BKK, serta penyimpanan pendaftaran PPDB/BKK.

## Isi paket
- `index.html` — website publik; PPDB dan BKK tetap mengarahkan ke WhatsApp seperti sebelumnya. Jika Supabase sudah dikonfigurasi, data juga dicatat ke database.
- `admin.html` — login admin, ringkasan data PPDB/BKK, tambah/nonaktifkan lowongan, tambah/publikasi berita, dan perubahan status pendaftar BKK.
- `supabase.js` — konfigurasi dan fungsi integrasi Supabase.
- `supabase-schema.sql` — tabel dan kebijakan keamanan (RLS).
- `Logosmkbinamandiri.png`, `kepalasekolah.jpeg` — aset asli.

## Langkah 1 — Siapkan Supabase
1. Buat project di https://supabase.com/.
2. Buka **SQL Editor**, jalankan seluruh isi `supabase-schema.sql`.
3. Buka **Project Settings → API**. Salin Project URL dan anon/publishable key.
4. Edit `supabase.js`, ganti `ISI_SUPABASE_PROJECT_URL` dan `ISI_SUPABASE_ANON_KEY`.
5. Jangan pernah memasukkan `service_role` key ke file website.

## Langkah 2 — Buat akun admin
1. Di Supabase buka **Authentication → Users → Add user** dan buat email/password admin sekolah.
2. Salin UUID user yang dibuat.
3. Di SQL Editor jalankan perintah berikut dengan UUID tersebut:

```sql
insert into public.admin_users(user_id) values ('UUID_USER_ADMIN');
```

Hanya akun yang UUID-nya tercatat di `admin_users` yang diizinkan membaca data pendaftar dan mengelola konten. Jangan membuat fitur pendaftaran admin terbuka di website.

## Langkah 3 — Unggah ke GitHub Pages
1. Ekstrak paket ZIP.
2. Unggah/replace file dan aset paket ini ke root repository GitHub Pages (jangan hanya mengunggah `index.html`).
3. Pastikan `index.html`, `admin.html`, `supabase.js`, `Logosmkbinamandiri.png`, dan `kepalasekolah.jpeg` berada di folder yang sama.
4. Setelah GitHub Pages selesai deploy, buka halaman publik dan `/admin.html`.

## Langkah 4 — Pengujian wajib
- Coba kirim formulir PPDB dan pastikan record muncul di tabel `ppdb_applications`; WhatsApp tetap terbuka.
- Coba kirim formulir BKK dan pastikan record muncul di `bkk_applications`.
- Login ke `/admin.html`, buat lowongan dan berita, lalu cek halaman publik.
- Uji menggunakan ponsel dan desktop.

## Catatan keamanan dan batasan tahap ini
- Database menerima kiriman publik untuk formulir PPDB/BKK; aktifkan CAPTCHA/anti-spam dan pembatasan permintaan sebelum dipakai secara luas.
- Dokumen persyaratan PPDB, upload berkas, nomor pendaftaran otomatis, cetak bukti, galeri, fasilitas/jurusan yang dapat diedit, dan workflow verifikasi PPDB lanjutan belum dibuat pada paket tahap ini.
- Form PPDB/BKK tetap mempertahankan alur WhatsApp lama. Penyimpanan database baru berjalan setelah URL dan anon key valid serta SQL dijalankan.
- Tidak ada kredensial Supabase atau akun admin yang disertakan. Anda harus mengisi konfigurasi project milik sekolah.
