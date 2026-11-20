// Mengambil lowongan kerja (Jooble + JobStreet) lalu menyimpannya ke lowongan.json
// Dijalankan otomatis oleh GitHub Actions (.github/workflows/lowongan.yml). Node 20+.
import { writeFile } from "node:fs/promises";

// ====== PENGATURAN ======
// Koordinat sekolah (PERIKSA di Google Maps lalu sesuaikan bila perlu)
const SEKOLAH = { nama: "SMK Bina Mandiri Pamarayan", lat: -6.22, lon: 106.19 };
const MAKS_JARAK_KM = 80;   // lowongan di atas jarak ini tidak ditampilkan
const MAKS_LOWONGAN = 60;
const LOKASI_CARI = ["Serang", "Cikande", "Kragilan", "Cilegon", "Balaraja", "Tangerang", "Rangkasbitung"];
const JOOBLE_KEY = process.env.JOOBLE_API_KEY || "";

// Judul yang dibuang (umumnya butuh pengalaman lama / S1). Ubah sesuai kebutuhan.
const JUDUL_DIBUANG = /\b(manager|manajer|head|director|direktur|specialist|engineer|senior|dept)\b/i;
// Ringkasan yang menyebut syarat pendidikan tinggi ikut dibuang.
const SYARAT_TINGGI = /\b(S1|S2|sarjana|bachelor'?s?|degree)\b/i;

// Perkiraan koordinat wilayah (untuk menghitung jarak dari teks lokasi lowongan)
const WILAYAH = {
  pamarayan: [-6.22, 106.19], jawilan: [-6.23, 106.24], kopo: [-6.25, 106.15], ciruas: [-6.15, 106.23],
  walantaka: [-6.15, 106.18], kibin: [-6.16, 106.20], kragilan: [-6.17, 106.25], cikande: [-6.20, 106.30],
  serang: [-6.12, 106.15], kramatwatu: [-6.06, 106.10], cilegon: [-6.00, 106.01], merak: [-5.93, 106.01],
  anyer: [-6.05, 105.92], bojonegara: [-5.99, 106.05], balaraja: [-6.20, 106.44], cikupa: [-6.23, 106.50],
  curug: [-6.25, 106.56], bitung: [-6.22, 106.57], jatiuwung: [-6.18, 106.59], tangerang: [-6.18, 106.63],
  serpong: [-6.30, 106.67], rangkasbitung: [-6.35, 106.25], pandeglang: [-6.31, 106.10],
  kosambi: [-6.07, 106.65], pagedangan: [-6.29, 106.61], tigaraksa: [-6.26, 106.46], pamulang: [-6.34, 106.74],
};
// Lokasi pusat Banten, hanya dipakai bila lokasi lowongan cuma tertulis "Banten"
const FALLBACK_BANTEN = [-6.30, 106.15];

const rad = (d) => (d * Math.PI) / 180;
function jarakKm(lat1, lon1, lat2, lon2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function koordinat(teks, fallback) {
  const t = (teks || "").toLowerCase();
  // pilih wilayah paling spesifik (nama terpanjang) yang cocok
  const kunci = Object.keys(WILAYAH).filter((k) => t.includes(k)).sort((a, b) => b.length - a.length)[0];
  if (kunci) return { c: WILAYAH[kunci], perkiraan: false };
  // lokasi tak dikenal hanya dipakai bila kosong atau jelas berada di Banten
  if (t && !t.includes("banten")) return null;
  // tulisan "Banten" saja: pakai lokasi pencarian, tandai sebagai perkiraan
  const f = WILAYAH[(fallback || "").toLowerCase()] || FALLBACK_BANTEN;
  return { c: f, perkiraan: true };
}
const bersih = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function dariJooble(lokasi) {
  if (!JOOBLE_KEY) return [];
  const r = await fetch(`https://jooble.org/api/${JOOBLE_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: "SMK", location: lokasi, radius: "25", page: "1" }),
  });
  if (!r.ok) throw new Error(`Jooble ${lokasi}: HTTP ${r.status}`);
  const j = await r.json();
  return (j.jobs || []).map((x) => ({
    posisi: bersih(x.title), perusahaan: bersih(x.company) || "Perusahaan (lihat detail)",
    lokasi: bersih(x.location) || lokasi, tipe: bersih(x.type), ringkasan: bersih(x.snippet).slice(0, 220),
    link: x.link, sumber: "Jooble" + (x.source ? ` · ${bersih(x.source)}` : ""),
    tanggal: x.updated || null, _q: lokasi,
  }));
}

// Best-effort: endpoint pencarian internal JobStreet. Bisa berubah/diblokir sewaktu-waktu.
async function dariJobStreet(lokasi) {
  const u = new URL("https://id.jobstreet.com/api/jobsearch/v5/search");
  Object.entries({ siteKey: "ID-Main", sourcesystem: "houston", where: lokasi, page: "1", pageSize: "30", locale: "id-ID" })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; BKK-SMKBinaMandiri)" } });
  if (!r.ok) throw new Error(`JobStreet ${lokasi}: HTTP ${r.status}`);
  const j = await r.json();
  return (j.data || []).map((x) => ({
    posisi: bersih(x.title), perusahaan: bersih(x.companyName || x.advertiser?.description) || "Perusahaan (lihat detail)",
    lokasi: bersih(x.locations?.[0]?.label) || lokasi, tipe: bersih((x.workTypes || []).join(", ")),
    ringkasan: bersih(x.teaser).slice(0, 220), link: `https://id.jobstreet.com/id/job/${x.id}`,
    sumber: "JobStreet", tanggal: x.listingDate || null, _q: lokasi,
  }));
}

const semua = [];
const galat = [];
for (const lok of LOKASI_CARI) {
  for (const ambil of [dariJooble, dariJobStreet]) {
    try { semua.push(...(await ambil(lok))); } catch (e) { galat.push(e.message); }
  }
}
galat.forEach((g) => console.warn("Peringatan:", g));

const unik = new Map();
for (const x of semua) {
  if (!x.posisi || !/^https?:\/\//.test(x.link || "")) continue;
  if (JUDUL_DIBUANG.test(x.posisi) || SYARAT_TINGGI.test(x.ringkasan || "")) continue;
  const kunci = `${x.posisi}|${x.perusahaan}`.toLowerCase();
  if (unik.has(kunci)) continue;
  const k = koordinat(x.lokasi, x._q);
  if (!k) continue;
  const jarak = Math.round(jarakKm(SEKOLAH.lat, SEKOLAH.lon, k.c[0], k.c[1]));
  if (jarak > MAKS_JARAK_KM) continue;
  const { _q, ...bersihData } = x;
  unik.set(kunci, { ...bersihData, jarak_km: jarak, jarak_perkiraan: k.perkiraan });
}
const hasil = [...unik.values()].sort((a, b) => a.jarak_km - b.jarak_km).slice(0, MAKS_LOWONGAN);

if (hasil.length === 0) {
  console.warn("Tidak ada lowongan terambil; lowongan.json lama dipertahankan.");
  process.exit(0);
}
await writeFile("lowongan.json", JSON.stringify({
  diperbarui: new Date().toISOString(), sekolah: SEKOLAH, lowongan: hasil,
}, null, 2));
console.log(`Tersimpan ${hasil.length} lowongan.`);
