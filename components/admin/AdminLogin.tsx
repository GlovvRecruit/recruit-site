"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // 성공 시 onAuthStateChange가 부모(AdminPage)에서 세션을 감지해 화면 전환.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-5">
      <form
        onSubmit={handleSubmit}
        className="card-shadow w-full max-w-[380px] rounded-2xl border border-gray-200 bg-white p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <span
            className="h-[22px] w-[22px] rounded-full"
            style={{ background: "var(--brand-gradient)" }}
          />
          <span className="text-[15px] font-extrabold">
            <span className="brand-gradient-text">Glovv</span>{" "}
            <span className="text-gray-400">채용 관리자</span>
          </span>
        </div>

        <label className="mb-3.5 block">
          <span className="mb-1.5 block text-xs font-bold text-gray-600">이메일</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-bold text-gray-600">비밀번호</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[color:var(--brand-pink)] focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] focus:outline-none"
          />
        </label>

        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gray-900 py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
        <p className="mt-4 text-center text-[11.5px] text-gray-400">
          관리자 계정은 Supabase Dashboard &gt; Authentication &gt; Users 에서 생성해요.
        </p>
      </form>
    </div>
  );
}
