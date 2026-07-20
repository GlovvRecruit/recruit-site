import { createClient } from "@/lib/supabase/server";
import { sampleBrands, sampleJobs } from "@/data/sample-jobs";
import { sampleCareersJobs, sampleMediaLinks } from "@/data/sample-content";
import type { Brand, CareersJob, Job, MediaLink } from "@/lib/types";

// Supabase 프로젝트가 아직 연결되지 않았거나(.env 미설정) 데이터가 비어 있으면
// 화면이 비어 보이지 않도록 샘플 데이터로 대체한다. 실제 환경변수가 채워지면
// 자동으로 실데이터를 사용한다.

const hasSupabaseEnv = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getBrands(): Promise<Brand[]> {
  if (!hasSupabaseEnv) return sampleBrands;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error || !data || data.length === 0) return sampleBrands;
    return data.map((b) => ({
      id: b.id,
      name: b.name,
      logoUrl: b.logo_url,
      profileAi: b.profile_ai,
      profileReviewed: b.profile_reviewed,
    }));
  } catch {
    return sampleBrands;
  }
}

export async function getJobs(): Promise<Job[]> {
  if (!hasSupabaseEnv) return sampleJobs;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleJobs;
    return data.map((j) => ({
      id: j.id,
      brandId: j.brand_id,
      title: j.title,
      jobCategory: j.job_category,
      careerLevel: j.career_level,
      region: j.region,
      requirementsSummary: j.requirements_summary,
      responsibilitiesSummary: j.responsibilities_summary,
      compensationSummary: j.compensation_summary,
      sourceUrl: j.source_url,
      status: j.status,
    }));
  } catch {
    return sampleJobs;
  }
}

export async function getCareersJobs(): Promise<CareersJob[]> {
  if (!hasSupabaseEnv) return sampleCareersJobs;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("careers_jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleCareersJobs;
    return data.map((c) => ({
      id: c.id,
      title: c.title,
      tag: c.tag,
      summary: c.summary,
      bodyHtml: c.body_html,
      employment: c.employment,
      location: c.location,
      status: c.status,
    }));
  } catch {
    return sampleCareersJobs;
  }
}

export async function getMediaLinks(): Promise<MediaLink[]> {
  if (!hasSupabaseEnv) return sampleMediaLinks;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("media_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleMediaLinks;
    return data.map((m) => ({
      id: m.id,
      groupLabel: m.group_label,
      title: m.title,
      url: m.url,
      createdAt: m.created_at,
    }));
  } catch {
    return sampleMediaLinks;
  }
}
