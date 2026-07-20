import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// GlovvRecruit/exam 프로젝트의 별도 Supabase 인스턴스를 읽기 전용으로 조회한다.
// exam은 anon 키로 select 전체 허용(rls-admin-auth.sql 참조)이라 여기서도
// 공개 anon 키만 사용한다 — 채점 컬럼(essay_score 등) 수정은 하지 않음.
//
// NEXT_PUBLIC_EXAM_SUPABASE_URL / NEXT_PUBLIC_EXAM_SUPABASE_ANON_KEY 는
// GlovvRecruit/exam 저장소의 config.js에 있는 값을 그대로 옮겨 적으면 된다.

export function createExamClient() {
  const url = process.env.NEXT_PUBLIC_EXAM_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_EXAM_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}
