APLIKASI UJIAN ONLINE — SMK BINA MANDIRI PAMARAYAN

Perubahan hanya berada di folder ujian/. File website utama, PPDB, BKK,
berita, dan media pembelajaran tidak diubah.

FILE
- index.html : halaman login dan pengerjaan ujian siswa.
- admin.html : panel admin/guru untuk mengelola ujian, soal, dan hasil.
- config.js : konfigurasi URL dan anon/public key Supabase.
- patch-keamanan-ujian.sql : tambahan kebijakan akses dan fungsi penilaian server.
- schema.sql : skema starter lama, bukan untuk dijalankan ulang pada database yang sudah ada.

PENTING SEBELUM DIPAKAI
1. Cadangkan database Supabase terlebih dahulu.
2. Isi ujian/config.js dengan Project URL dan anon/public key yang sama dengan proyek sekolah.
   Jangan pernah memasukkan service_role key ke file website.
3. Periksa struktur tabel yang sudah ada. Aplikasi ini mengikuti tabel pada ekspor CSV:
   guru, siswa, profil, mata_pelajaran, ujian, soal, kunci_jawaban,
   jawaban_siswa, hasil_ujian.
4. Jalankan patch-keamanan-ujian.sql di SQL Editor setelah meninjau kebijakan yang ada.
   Patch ini hanya menyentuh tabel modul ujian dan menambah RPC penilaian.
5. Buat akun melalui Supabase Authentication. Pastikan profil.profil.id sama dengan
   Auth User ID; siswa.user_id harus menunjuk ke Auth User ID siswa.
   Kolom profil.peran harus berisi admin/administrator/guru atau siswa.
6. Pastikan tanggal ujian, kelas, serta mata pelajaran sudah benar.
7. Uji menggunakan akun guru/admin dan akun siswa percobaan sebelum ujian sebenarnya.

STATUS / KETERBATASAN
- Ujian ditampilkan bila ujian.status = 'aktif', jadwal cocok, dan kelas siswa cocok.
- Penilaian pilihan ganda dilakukan oleh fungsi database kumpulkan_ujian.
- Kunci jawaban tidak dikirim ke halaman siswa; akses tabel kunci dibatasi untuk pengelola.
- Jenis soal yang didukung antarmuka ini adalah pilihan ganda A-E.
- Akun siswa memerlukan baris siswa.user_id yang sesuai dengan Auth User ID.
- Nilai dihitung dari bobot jawaban benar dibagi total bobot soal.

CATATAN
File CSV yang diterima hanya menjelaskan nama kolom dan tipe data; tidak memuat
kebijakan RLS, foreign key, indeks, maupun nilai yang tersimpan. Karena itu, uji
koneksi dan hak akses pada proyek Supabase sekolah tetap wajib dilakukan.
