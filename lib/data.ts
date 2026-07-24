import { createClient } from "@/lib/supabase/server";
import { sampleBrands, sampleJobs } from "@/data/sample-jobs";
import { sampleCareersJobs, sampleMediaLinks, sampleInsightLinks } from "@/data/sample-content";
import type { Brand, CareersJob, Job, MediaLink, InsightLink } from "@/lib/types";

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
      brandNames: b.brand_names,
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
      description: j.description,
      descriptionImages: j.description_images,
      sourceUrl: j.source_url,
      status: j.status,
      createdAt: j.created_at,
    }));
  } catch {
    return sampleJobs;
  }
}

// 목록 화면(브랜드 공고 피드, 사이트맵 등)은 카드에 필요한 필드만 있으면 되고
// description/description_images 같은 큰 텍스트 컬럼은 필요 없다. 전체 열람 공고가
// 많아지면서 getJobs()의 select("*")가 페이지 로드를 눈에 띄게 느리게 만들어 분리했다.
const JOB_SUMMARY_COLUMNS =
  "id, brand_id, title, job_category, career_level, region, source_url, status, created_at";

function mapJobSummaryRow(j: {
  id: string;
  brand_id: string;
  title: string;
  job_category: Job["jobCategory"];
  career_level: string;
  region: string;
  source_url: string;
  status: Job["status"];
  created_at: string;
}): Job {
  return {
    id: j.id,
    brandId: j.brand_id,
    title: j.title,
    jobCategory: j.job_category,
    careerLevel: j.career_level,
    region: j.region,
    sourceUrl: j.source_url,
    status: j.status,
    createdAt: j.created_at,
  };
}

export async function getJobsSummary(): Promise<Job[]> {
  if (!hasSupabaseEnv) return sampleJobs;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select(JOB_SUMMARY_COLUMNS)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleJobs;
    return data.map(mapJobSummaryRow);
  } catch {
    return sampleJobs;
  }
}

export async function getJobsSummaryByBrand(brandId: string, excludeId?: string): Promise<Job[]> {
  if (!hasSupabaseEnv) {
    return sampleJobs.filter((j) => j.brandId === brandId && j.id !== excludeId);
  }
  try {
    const supabase = await createClient();
    let query = supabase
      .from("jobs")
      .select(JOB_SUMMARY_COLUMNS)
      .eq("status", "open")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapJobSummaryRow);
  } catch {
    return [];
  }
}

export async function getJobById(id: string): Promise<Job | null> {
  if (!hasSupabaseEnv) return sampleJobs.find((j) => j.id === id) ?? null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      brandId: data.brand_id,
      title: data.title,
      jobCategory: data.job_category,
      careerLevel: data.career_level,
      region: data.region,
      requirementsSummary: data.requirements_summary,
      responsibilitiesSummary: data.responsibilities_summary,
      compensationSummary: data.compensation_summary,
      description: data.description,
      descriptionImages: data.description_images,
      sourceUrl: data.source_url,
      status: data.status,
      createdAt: data.created_at,
    };
  } catch {
    return null;
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
      employmentType: c.employment_type ?? "fulltime",
      summary: c.summary,
      bodyHtml: c.body_html,
      employment: c.employment,
      location: c.location,
      status: c.status,
      hashtags: c.hashtags,
      benefitTitle: c.benefit_title,
      benefitItems: c.benefit_items,
      responsibilities: c.responsibilities,
      requirements: c.requirements,
      niceToHaves: c.nice_to_haves,
      benefits: c.benefits,
      showRelated: c.show_related ?? true,
      createdAt: c.created_at,
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

export async function getInsightLinks(): Promise<InsightLink[]> {
  if (!hasSupabaseEnv) return sampleInsightLinks;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("insight_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleInsightLinks;
    return data.map((m) => ({
      id: m.id,
      groupLabel: m.group_label,
      title: m.title,
      url: m.url,
      createdAt: m.created_at,
    }));
  } catch {
    return sampleInsightLinks;
  }
}
