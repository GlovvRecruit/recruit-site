"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LeadRow {
  id: string;
  phone: string;
  brand_ids: string[];
  categories: string[];
  marketing_opt_in: boolean;
  unsubscribed: boolean;
  is_channel_friend: boolean;
  created_at: string;
  last_sent_at: string | null;
}

export default function SubscribersTab() {
  const supabase = createClient();
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [brandNameById, setBrandNameById] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [leadsRes, brandsRes] = await Promise.all([
        supabase
          .from("leads")
          .select(
            "id, phone, brand_ids, categories, marketing_opt_in, unsubscribed, is_channel_friend, created_at, last_sent_at"
          )
          .order("created_at", { ascending: false }),
        supabase.from("brands").select("id, name"),
      ]);
      if (cancelled) return;
      setLeads((leadsRes.data as LeadRow[]) ?? []);
      setBrandNameById(new Map((brandsRes.data ?? []).map((b) => [b.id, b.name as string])));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!leads) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  const filtered = search.trim()
    ? leads.filter((l) => l.phone.includes(search.trim()))
    : leads;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-extrabold tracking-tight">구독자</h1>
      <p className="mb-5 text-sm text-gray-500">
        온보딩에서 카카오 알림을 신청한 전체 리드 목록입니다. 총 {leads.length}명 (구독 중{" "}
        {leads.filter((l) => !l.unsubscribed).length}명)
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="휴대폰 번호로 검색"
        className="mb-4 w-full max-w-[280px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[color:var(--brand-pink)] focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          해당하는 구독자가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-400">
                <th className="px-4 py-3 font-bold">휴대폰 번호</th>
                <th className="px-4 py-3 font-bold">관심 브랜드</th>
                <th className="px-4 py-3 font-bold">관심 직무</th>
                <th className="px-4 py-3 font-bold">채널 친구</th>
                <th className="px-4 py-3 font-bold">마케팅 동의</th>
                <th className="px-4 py-3 font-bold">구독 상태</th>
                <th className="px-4 py-3 font-bold">가입일</th>
                <th className="px-4 py-3 font-bold">마지막 발송</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-700">{l.phone}</td>
                  <td className="max-w-[220px] px-4 py-3 text-gray-600">
                    {(l.brand_ids ?? []).map((id) => brandNameById.get(id) ?? id).join(", ") ||
                      "-"}
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-gray-600">
                    {(l.categories ?? []).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {l.is_channel_friend ? (
                      <span className="rounded-full bg-[color:var(--kakao-yellow)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--kakao-brown)]">
                        친구
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {l.marketing_opt_in ? "동의" : "미동의"}
                  </td>
                  <td className="px-4 py-3">
                    {l.unsubscribed ? (
                      <span className="font-bold text-gray-400">해지</span>
                    ) : (
                      <span className="font-bold text-[color:var(--brand-pink)]">구독중</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(l.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {l.last_sent_at
                      ? new Date(l.last_sent_at).toLocaleDateString("ko-KR")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
