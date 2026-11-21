/**
 * Pencatat akses siswa - Media Pembelajaran KKA
 *
 * CARA PAKAI
 * 1. Buka Google Sheets baru (spreadsheet kosong) > Ekstensi > Apps Script.
 * 2. Hapus isi default, tempel seluruh kode ini, lalu Simpan.
 * 3. Klik Terapkan (Deploy) > Deployment baru > Jenis: Aplikasi web.
 *      - Jalankan sebagai: Saya
 *      - Yang memiliki akses: Siapa saja
 * 4. Salin URL aplikasi web (berakhiran /exec).
 * 5. Di file media-pembelajaran.html, isi:  var LOG_URL='URL-TADI';
 * 6. Upload ulang media-pembelajaran.html ke repository.
 *
 * Data masuk ke sheet "LogAkses": waktu, aktivitas, nama, kelas, NIS, detail.
 * Aktivitas yang dicatat: Login, Logout, Membuka Bab, dan skor Selesai kuis Bab.
 */

var NAMA_SHEET = 'LogAkses';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(NAMA_SHEET) || ss.insertSheet(NAMA_SHEET);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Waktu', 'Aktivitas', 'Nama', 'Kelas', 'NIS', 'Detail']);
      sh.setFrozenRows(1);
    }
    sh.appendRow([new Date(), aman(d.aktivitas), aman(d.nama), aman(d.kelas), aman(d.nis), aman(d.detail)]);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('gagal');
  }
}

function doGet() {
  return ContentService.createTextOutput('Pencatat akses media pembelajaran aktif.');
}

// Batasi panjang dan cegah isian yang diawali = + - @ dibaca sebagai rumus.
function aman(v) {
  var t = String(v == null ? '' : v).slice(0, 120);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
