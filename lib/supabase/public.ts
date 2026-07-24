import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 공개(anon) 읽기 전용 조회에 쓰는 클라이언트. lib/supabase/server.ts의 createClient()는
// next/headers의 cookies()를 사용해 그 클라이언트를 호출하는 페이지를 전부 동적 렌더링으로
// 강제 전환시킨다 — media_links/insight_links처럼 로그인과 무관하고 자주 안 바뀌는 공개
// 데이터까지 매 요청마다 새로 조회하게 돼 느려진다. 쿠키가 필요 없는 조회는 이 클라이언트를
// 써서 정적 생성/ISR이 가능하게 한다.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
