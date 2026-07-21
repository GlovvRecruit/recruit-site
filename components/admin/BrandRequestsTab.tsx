"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BrandRequestRow {
  id: string;
  requested_name: string;
  phone: string | null;
  created_at: string;
}

export default function BrandRequestsTab() {
  const supabase = createClient();
  const [items, setItems] = useState<BrandRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { data } = await supabase
      .from("brand_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as BrandRequestRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 데이터 조회
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: string) {
    await supabase.from("brand_requests").delete().eq("id", id);
    reload();
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  const counts = new Map<string, number>();
  for (const r of items) {
    counts.set(r.requested_name, (counts.get(r.requested_name) ?? 0) + 1);
  }
  const topRequests = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-extrabold tracking-tight">브랜드 요청</h1>
      <p className="mb-5 text-sm text-gray-500">
        온보딩에서 사용자가 직접 입력한 &quot;더 보고 싶은 회사&quot; 요청 목록입니다. 총{" "}
        {items.length}건
      </p>

      {topRequests.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {topRequests.map(([name, count]) => (
            <span
              key={name}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600"
            >
              {name} × {count}
            </span>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          아직 들어온 요청이 없습니다.
        </p>
      )}

      <div className="grid gap-2">
        {items.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <span className="min-w-0 flex-1 text-sm font-bold">{r.requested_name}</span>
            <span className="text-xs text-gray-400">{r.phone ?? "-"}</span>
            <span className="text-xs text-gray-300">
              {new Date(r.created_at).toLocaleDateString("ko-KR")}
            </span>
            <button
              type="button"
              onClick={() => remove(r.id)}
              className="flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-500"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
