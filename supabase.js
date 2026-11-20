/*
 * Integrasi Supabase SMK Bina Mandiri
 * Isi SUPABASE_URL dan SUPABASE_ANON_KEY dengan nilai dari Project Settings > API.
 * Hanya gunakan anon/publishable key di website publik. Jangan pernah menaruh service_role key di sini.
 */
(() => {
  const SUPABASE_URL = "https://gjywhnfxsjohnmslcduv.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_oYPWNun4dT2uGkJcTF76hg__iVRM4j2";
  let client = null;
  const configured = () => window.supabase && SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("ISI_") && !SUPABASE_ANON_KEY.includes("ISI_");
  if (configured()) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const api = {
    get ready() { return !!client; },
    async getSession() { if (!client) return null; const { data } = await client.auth.getSession(); return data.session; },
    async signIn(email, password) { if (!client) return {ok:false,message:"Supabase belum dikonfigurasi."}; const {error}=await client.auth.signInWithPassword({email,password}); return error?{ok:false,message:error.message}:{ok:true}; },
    async signOut() { if (client) await client.auth.signOut(); },
    async addVacancy(row) { const {error}=await client.from("bkk_vacancies").insert(row); return error?{ok:false,message:error.message}:{ok:true}; },
    async addNews(row) { const {error}=await client.from("school_news").insert(row); return error?{ok:false,message:error.message}:{ok:true}; },
    async toggleVacancy(id) { const {data}=await client.from("bkk_vacancies").select("aktif").eq("id",id).single(); if(!data)return {ok:false}; const {error}=await client.from("bkk_vacancies").update({aktif:!data.aktif}).eq("id",id); return {ok:!error,message:error?.message}; },
    async toggleNews(id) { const {data}=await client.from("school_news").select("aktif").eq("id",id).single(); if(!data)return {ok:false}; const {error}=await client.from("school_news").update({aktif:!data.aktif}).eq("id",id); return {ok:!error,message:error?.message}; },
    async updateBkkStatus(id,status) { const {error}=await client.from("bkk_applications").update({status}).eq("id",id); return {ok:!error,message:error?.message}; },
    async updatePpdbStatus(id,status) { const {error}=await client.from("ppdb_applications").update({status}).eq("id",id); return {ok:!error,message:error?.message}; },
    async adminData() {
      if(!client)return {ok:false,message:"Supabase belum dikonfigurasi."};
      const names=["ppdb_applications","bkk_applications","bkk_vacancies","school_news"];
      const results=await Promise.all(names.map(n=>client.from(n).select("*").order("created_at",{ascending:false}).limit(300)));
      const err=results.find(x=>x.error); if(err)return {ok:false,message:err.error.message};
      return {ok:true,data:{ppdb:results[0].data||[],bkk:results[1].data||[],jobs:results[2].data||[],news:results[3].data||[]}};
    },
    async insertPPDB(data) {
      if (!client) return { ok: false, reason: "not_configured" };
      const { error } = await client.from("ppdb_applications").insert(data);
      if (error) { console.error("PPDB Supabase:", error); return { ok: false, error }; }
      return { ok: true };
    },
    async insertBKK(data) {
      if (!client) return { ok: false, reason: "not_configured" };
      const { error } = await client.from("bkk_applications").insert(data);
      if (error) { console.error("BKK Supabase:", error); return { ok: false, error }; }
      return { ok: true };
    },
    async getLowongan() {
      if (!client) return [];
      const { data, error } = await client.from("bkk_vacancies").select("id,posisi,perusahaan,lokasi,jurusan,tipe,ringkasan").eq("aktif", true).order("created_at", { ascending: false });
      if (error) { console.error("BKK lowongan:", error); return []; }
      return data || [];
    },
    async getNews() {
      if (!client) return [];
      const { data, error } = await client.from("school_news").select("id,judul,kategori,tanggal,gambar,ringkasan").eq("aktif", true).order("tanggal", {ascending:false});
      if (error) { console.error("Berita sekolah:", error); return []; }
      return data || [];
    }
  };
  window.SMKBackend = api;
})();
