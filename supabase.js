
const SUPABASE_URL = "https://gjywhnfxsjohnmslcduv.supabase.co";

const SUPABASE_KEY = "ISI_PUBLISHABLE_KEY_ANDA";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.db = supabaseClient;
