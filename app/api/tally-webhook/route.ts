import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";

interface TallyField {
  key: string;
  label: string;
  type: string;
  value: unknown;
}

interface TallyWebhookPayload {
  eventType?: string;
  data: {
    submissionId?: string;
    responseId?: string;
    fields: TallyField[];
  };
}

function findField(fields: TallyField[], keywords: string[]): string | null {
  for (const kw of keywords) {
    const match = fields.find((f) => f.label?.toLowerCase().includes(kw));
    if (match && typeof match.value === "string" && match.value.trim()) {
      return match.value.trim();
    }
    if (match && Array.isArray(match.value) && match.value.length > 0) {
      return String(match.value[0]);
    }
  }
  return null;
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signingSecret = process.env.TALLY_SIGNING_SECRET;
  if (signingSecret) {
    const signature = request.headers.get("tally-signature");
    if (!verifySignature(rawBody, signature, signingSecret)) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const fields = payload.data?.fields ?? [];
  const submissionId = payload.data?.submissionId ?? payload.data?.responseId ?? null;

  const name = findField(fields, ["이름", "name"]) ?? "(이름 미확인)";
  const contact =
    findField(fields, ["이메일", "email", "연락처", "전화", "phone"]) ?? "(연락처 미확인)";
  const roleInterest = findField(fields, ["직무", "포지션", "role"]);
  const portfolioUrl = findField(fields, ["포트폴리오", "링크드인", "portfolio", "linkedin"]);

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ error: "supabase not configured" }, { status: 500 });
  }

  const { error } = await supabase.from("career_applications").insert({
    name,
    contact,
    role_interest: roleInterest,
    portfolio_url: portfolioUrl,
    raw_payload: payload,
    tally_submission_id: submissionId,
  });

  // 유니크 제약 위반(중복 웹훅 재시도)은 정상 처리로 취급
  if (error && !error.message.includes("duplicate key")) {
    console.error("[tally-webhook] insert failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 최초 제출일 때만 지원 완료 퍼널 이벤트를 기록한다(재시도로 인한 중복 카운트 방지).
  if (!error) {
    await supabase.from("page_views").insert({
      path: "/careers",
      event_type: "apply_submit",
    });
  }

  return Response.json({ ok: true });
}
