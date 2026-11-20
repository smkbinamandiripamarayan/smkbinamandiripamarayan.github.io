const SUPABASE_URL = "https://gjywhnfxsjohnmslcduv.supabase.co";

const SUPABASE_KEY = "sb_publishable_oYPWNun4dT2uGkJcTF76hg__iVRM4j2";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.db = supabaseClient;
