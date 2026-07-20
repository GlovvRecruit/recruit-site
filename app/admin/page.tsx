"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";

const hasSupabaseEnv = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseEnv) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-6 text-center">
        <div className="max-w-md">
          <h1 className="mb-2 text-lg font-extrabold">Supabase가 아직 연결되지 않았어요</h1>
          <p className="text-sm text-gray-500">
            관리자 화면을 쓰려면 이 프로젝트의 Supabase 프로젝트를 만들고{" "}
            <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">.env.local</code>에{" "}
            <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
            /
            <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            를 설정해 주세요. (supabase/migrations/0001_init.sql 실행 필요)
          </p>
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (!session) return <AdminLogin />;

  return <AdminShell email={session.user.email ?? ""} />;
}
