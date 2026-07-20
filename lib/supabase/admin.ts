import { createClient } from "@supabase/supabase-js";

// 서버 전용(service role) 클라이언트. RLS를 우회하므로 절대 브라우저 코드에서
// import하지 말 것 — Route Handler 등 서버 코드에서만 사용한다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
