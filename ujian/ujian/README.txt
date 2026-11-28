# Aplikasi Ujian Online SMK Bina Mandiri Pamarayan

Isi paket:
- index.html: halaman login dan ujian siswa (mobile responsive)
- admin.html: dashboard admin awal
- config.js: tempat mengisi URL dan anon/public key Supabase
- schema.sql: skema awal database Supabase

## Langkah awal
1. Buat/siapkan proyek Supabase sekolah.
2. Buka SQL Editor, jalankan `schema.sql`.
3. Buka `config.js`, isi SUPABASE_URL dan SUPABASE_ANON_KEY.
4. Buat akun melalui Supabase Authentication > Users.
5. Buat baris profil pada tabel `profiles` dengan id sama seperti User ID dari Auth.
   - siswa: role `student`, class_name `XII ...`, student_number NIS.
   - admin: role `admin`.
6. Upload file ke GitHub Pages pada folder/subfolder baru, jangan menimpa website sekolah yang sudah ada.
   Buka `index.html` untuk siswa dan `admin.html` untuk admin.

## Catatan keamanan
Paket ini adalah starter untuk pengembangan dan pengujian teknis, belum boleh dipakai untuk ujian resmi.
Skema SQL menandai titik yang harus disempurnakan: kunci jawaban tidak boleh dikirim ke browser, nilai harus dihitung server-side, waktu dan status ujian harus divalidasi server-side, serta kebijakan RLS perlu diuji.
Jangan pernah menaruh service_role key di file website.
