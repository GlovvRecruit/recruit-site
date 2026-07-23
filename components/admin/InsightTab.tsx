"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface InsightRow {
  id: string;
  group_label: string;
  title: string;
  url: string;
}

export default function InsightTab() {
  const supabase = createClient();
  const [items, setItems] = useState<InsightRow[]>([]);
  const [groupLabel, setGroupLabel] = useState("웨비나");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { data } = await supabase
      .from("insight_links")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as InsightRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 데이터 조회
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addLink() {
    if (!title.trim() || !url.trim()) {
      alert("제목과 URL을 입력해 주세요.");
      return;
    }
    await supabase.from("insight_links").insert({
      group_label: groupLabel,
      title: title.trim(),
      url: url.trim(),
    });
    setTitle("");
    setUrl("");
    reload();
  }

  async function remove(id: string) {
    await supabase.from("insight_links").delete().eq("id", id);
    reload();
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">INSIGHT 관리</h1>

      <div className="mb-5 grid gap-2.5 rounded-2xl border border-gray-200 bg-white p-[18px]">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[160px_1fr]">
          <select
            value={groupLabel}
            onChange={(e) => setGroupLabel(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option>웨비나</option>
            <option>아티클</option>
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="콘텐츠 제목"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addLink}
          className="rounded-lg py-2.5 text-sm font-extrabold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          링크 추가
        </button>
      </div>

      <div className="grid gap-2">
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <span className="flex-none rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
              {m.group_label}
            </span>
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm font-bold text-inherit"
            >
              {m.title}
            </a>
            <button
              type="button"
              onClick={() => remove(m.id)}
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
