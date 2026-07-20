"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExamAttempt } from "@/lib/types";

// DB 테이블명은 당분간 interns를 그대로 쓴다(마이그레이션 비용 대비 리네이밍 실익이 낮음).
// 화면 상 명칭만 "매니저"로 바꿈.
interface ManagerRow {
  id: string;
  name: string;
  start_date: string;
  note: string | null;
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function daysUntil(d: Date, today: Date) {
  const ms = d.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function Milestone({ label, date, today }: { label: string; date: Date; today: Date }) {
  const days = daysUntil(date, today);
  const passed = days < 0;
  const soon = !passed && days <= 14;
  return (
    <div
      className={
        "rounded-lg border px-3 py-2 text-xs " +
        (soon
          ? "border-[color:var(--brand-pink)] bg-[rgba(255,0,153,.06)]"
          : "border-gray-200 bg-gray-50")
      }
    >
      <div className="font-bold text-gray-700">{label}</div>
      <div className="text-gray-500">{formatDate(date)}</div>
      <div className={"font-bold " + (soon ? "text-[color:var(--brand-pink)]" : "text-gray-400")}>
        {passed ? `D+${Math.abs(days)}` : `D-${days}`}
      </div>
    </div>
  );
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  onboarding: "온보딩",
  sales: "세일즈 스크립트",
  feedback: "피드백 미팅",
  "meta-ads": "메타 광고",
};

function ExamScores({ name }: { name: string }) {
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("exam_attempts")
      .select("id, name, exam_type, exam_date, submitted_at, total_score")
      .eq("name", name)
      .order("exam_date", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setAttempts((data as ExamAttempt[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (attempts === null) return <p className="text-xs text-gray-400">시험 점수 조회 중...</p>;
  if (attempts.length === 0) return <p className="text-xs text-gray-400">응시 기록이 없어요.</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {attempts.map((a) => (
        <span
          key={a.id}
          className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700"
        >
          {EXAM_TYPE_LABEL[a.exam_type] ?? a.exam_type}: {a.submitted_at ? a.total_score : "미제출"}
        </span>
      ))}
    </div>
  );
}

export default function ManagersTab() {
  const supabase = createClient();
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const today = new Date();

  async function reload() {
    const { data } = await supabase
      .from("interns")
      .select("id, name, start_date, note")
      .order("start_date", { ascending: false });
    setManagers((data as ManagerRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 데이터 조회
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addManager() {
    if (!name.trim() || !startDate) {
      alert("이름과 입사일은 필수예요. 이름은 exam 응시자명과 동일하게 입력해야 점수가 매칭돼요.");
      return;
    }
    await supabase.from("interns").insert({
      name: name.trim(),
      start_date: startDate,
      note: note.trim() || null,
    });
    setName("");
    setStartDate("");
    setNote("");
    reload();
  }

  async function remove(id: string) {
    await supabase.from("interns").delete().eq("id", id);
    reload();
  }

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <h1 className="mb-1.5 text-[22px] font-extrabold tracking-tight">매니저 관리</h1>
      <p className="mb-5 text-[13px] text-gray-400">
        입사일을 등록하면 6개월·1년 시점을 자동으로 알려주고, exam 시험 점수를 이름으로 매칭해
        함께 보여줘요.
      </p>

      <div className="mb-6 grid gap-2.5 rounded-2xl border border-gray-200 bg-white p-[18px]">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (exam 응시자명과 동일하게)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모 (선택)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addManager}
          className="rounded-lg py-2.5 text-sm font-extrabold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          매니저 등록
        </button>
      </div>

      <div className="grid gap-3">
        {managers.map((manager) => {
          const sixMonth = addMonths(manager.start_date, 6);
          const oneYear = addMonths(manager.start_date, 12);
          return (
            <div key={manager.id} className="rounded-2xl border border-gray-200 bg-white p-[18px]">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] font-extrabold">{manager.name}</span>
                <span className="text-xs text-gray-400">
                  입사일 {new Date(manager.start_date + "T00:00:00").toLocaleDateString("ko-KR")}
                </span>
                <button
                  type="button"
                  onClick={() => remove(manager.id)}
                  className="ml-auto flex-none rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-500"
                >
                  삭제
                </button>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2.5 sm:max-w-[420px]">
                <Milestone label="6개월" date={sixMonth} today={today} />
                <Milestone label="1년" date={oneYear} today={today} />
              </div>

              {manager.note && <p className="mb-3 text-xs text-gray-500">{manager.note}</p>}

              <div className="border-t border-gray-100 pt-3">
                <div className="mb-1.5 text-[11px] font-bold text-gray-400">exam 응시 점수</div>
                <ExamScores name={manager.name} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
