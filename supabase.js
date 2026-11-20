/*
 * Integrasi Supabase SMK Bina Mandiri
 * Gunakan hanya publishable/anon key di frontend. Jangan pernah memasukkan service_role key.
 * Pastikan supabase-js v2 dimuat sebelum file ini:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */
(() => {
  "use strict";

  const SUPABASE_URL = "https://gjywhnfxsjohnmslcduv.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_oYPWNun4dT2uGkJcTF76hg__iVRM4j2";

  let client = null;
  let initError = null;

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("ISI_") || SUPABASE_ANON_KEY.includes("ISI_")) {
      throw new Error("Alamat atau publishable key Supabase belum diisi.");
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Library Supabase belum dimuat. Pastikan script supabase-js v2 dimuat sebelum supabase.js.");
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    initError = error;
    console.error("Inisialisasi Supabase gagal:", error);
  }

  const failure = (error, fallback = "Terjadi kesalahan. Silakan coba lagi.") => ({
    ok: false,
    message: error?.message || fallback,
    error: error || null
  });

  const requireClient = () => {
    if (client) return null;
    return failure(initError, "Supabase belum siap. Periksa konfigurasi dan koneksi internet.");
  };

  const api = {
    get ready() { return !!client; },

    async getSession() {
      const unavailable = requireClient();
      if (unavailable) return null;
      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          console.error("Gagal mengambil sesi:", error);
          return null;
        }
        return data?.session || null;
      } catch (error) {
        console.error("Gagal mengambil sesi:", error);
        return null;
      }
    },

    async signIn(email, password) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      if (!email || !password) {
        return { ok: false, message: "Email dan password wajib diisi." };
      }

      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: String(email).trim(),
          password: String(password)
        });

        if (error) {
          console.error("Login Supabase gagal:", error);
          // Pesan asli tetap tersedia untuk diagnosis, tetapi ditampilkan secara ramah.
          const message = /invalid login credentials/i.test(error.message)
            ? "Email atau password salah. Periksa kembali data login."
            : /email not confirmed/i.test(error.message)
              ? "Email akun belum dikonfirmasi. Silakan hubungi administrator."
              : error.message || "Login gagal. Silakan coba kembali.";
          return { ok: false, message, detail: error.message };
        }

        if (!data?.session || !data?.user) {
          return { ok: false, message: "Login belum menghasilkan sesi. Silakan coba kembali." };
        }

        return { ok: true, user: data.user, session: data.session };
      } catch (error) {
        console.error("Login Supabase mengalami gangguan:", error);
        return failure(error, "Tidak dapat terhubung ke server. Periksa internet lalu coba lagi.");
      }
    },

    async signOut() {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { error } = await client.auth.signOut();
        return error ? failure(error) : { ok: true };
      } catch (error) {
        return failure(error);
      }
    },

    async addVacancy(row) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { error } = await client.from("bkk_vacancies").insert(row);
        return error ? failure(error) : { ok: true };
      } catch (error) { return failure(error); }
    },

    async addNews(row) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { error } = await client.from("school_news").insert(row);
        return error ? failure(error) : { ok: true };
      } catch (error) { return failure(error); }
    },

    async toggleVacancy(id) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { data, error: readError } = await client.from("bkk_vacancies").select("aktif").eq("id", id).single();
        if (readError) return failure(readError);
        if (!data) return { ok: false, message: "Data lowongan tidak ditemukan." };
        const { error } = await client.from("bkk_vacancies").update({ aktif: !data.aktif }).eq("id", id);
        return error ? failure(error) : { ok: true };
      } catch (error) { return failure(error); }
    },

    async toggleNews(id) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { data, error: readError } = await client.from("school_news").select("aktif").eq("id", id).single();
        if (readError) return failure(readError);
        if (!data) return { ok: false, message: "Data berita tidak ditemukan." };
        const { error } = await client.from("school_news").update({ aktif: !data.aktif }).eq("id", id);
        return error ? failure(error) : { ok: true };
      } catch (error) { return failure(error); }
    },

    async updateBkkStatus(id, status) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { error } = await client.from("bkk_applications").update({ status }).eq("id", id);
        return error ? failure(error) : { ok: true };
      } catch (error) { return failure(error); }
    },

    async updatePpdbStatus(id, status) {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const { error } = await client.from("ppdb").update({ status }).eq("id", id);
        return error ? failure(error) : { ok: true };
      } catch (error) { return failure(error); }
    },

    async adminData() {
      const unavailable = requireClient();
      if (unavailable) return unavailable;
      try {
        const names = ["ppdb", "bkk_applications", "bkk_vacancies", "school_news"];
        const results = await Promise.all(names.map(name =>
          client.from(name).select("*").order("created_at", { ascending: false }).limit(300)
        ));
        const failed = results.find(result => result.error);
        if (failed) return failure(failed.error);
        return {
          ok: true,
          data: {
            ppdb: results[0].data || [],
            bkk: results[1].data || [],
            jobs: results[2].data || [],
            news: results[3].data || []
          }
        };
      } catch (error) { return failure(error); }
    },

    async insertPPDB(data) {
      const unavailable = requireClient();
      if (unavailable) return { ok: false, reason: "not_configured", message: unavailable.message };
      try {
        // Pemetaan mengikuti struktur tabel public.ppdb yang sudah ada di proyek sekolah.
        const row = {
          nama: data.nama,
          nisn: data.nisn || null,
          asal_sekolah: data.asal_sekolah,
          jurusan: data.jurusan,
          alamat: data.alamat || null,
          telepon: data.telepon || data.no_hp || null,
          email: data.email || null
        };
        const { error } = await client.from("ppdb").insert(row);
        return error ? { ok: false, error, message: error.message } : { ok: true };
      } catch (error) { return { ok: false, error, message: error.message }; }
    },

    async insertBKK(data) {
      const unavailable = requireClient();
      if (unavailable) return { ok: false, reason: "not_configured", message: unavailable.message };
      try {
        const { error } = await client.from("bkk_applications").insert(data);
        return error ? { ok: false, error, message: error.message } : { ok: true };
      } catch (error) { return { ok: false, error, message: error.message }; }
    },

    async getLowongan() {
      const unavailable = requireClient();
      if (unavailable) return [];
      try {
        const { data, error } = await client.from("bkk_vacancies")
          .select("id,posisi,perusahaan,lokasi,jurusan,tipe,ringkasan")
          .eq("aktif", true).order("created_at", { ascending: false });
        if (error) { console.error("BKK lowongan:", error); return []; }
        return data || [];
      } catch (error) { console.error("BKK lowongan:", error); return []; }
    },

    async getNews() {
      const unavailable = requireClient();
      if (unavailable) return [];
      try {
        const { data, error } = await client.from("school_news")
          .select("id,judul,kategori,tanggal,gambar,ringkasan")
          .eq("aktif", true).order("tanggal", { ascending: false });
        if (error) { console.error("Berita sekolah:", error); return []; }
        return data || [];
      } catch (error) { console.error("Berita sekolah:", error); return []; }
    }
  };

  window.SMKBackend = api;
})();
