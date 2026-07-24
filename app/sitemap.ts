import type { MetadataRoute } from "next";
import { getCareersJobs, getJobsSummary } from "@/lib/data";

const BASE_URL = "https://beauty-recruit.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [careersJobs, brandJobs] = await Promise.all([getCareersJobs(), getJobsSummary()]);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 1, lastModified: now },
    { url: `${BASE_URL}/careers`, changeFrequency: "daily", priority: 0.9, lastModified: now },
    { url: `${BASE_URL}/brand-jobs`, changeFrequency: "daily", priority: 0.9, lastModified: now },
    { url: `${BASE_URL}/media`, changeFrequency: "weekly", priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/insight`, changeFrequency: "weekly", priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/onboarding`, changeFrequency: "monthly", priority: 0.3, lastModified: now },
  ];

  const careersJobRoutes: MetadataRoute.Sitemap = careersJobs
    .filter((j) => j.status === "open")
    .map((j) => ({
      url: `${BASE_URL}/careers/${j.id}`,
      changeFrequency: "daily",
      priority: 0.8,
      lastModified: new Date(j.createdAt),
    }));

  const brandJobRoutes: MetadataRoute.Sitemap = brandJobs
    .filter((j) => j.status === "open")
    .map((j) => ({
      url: `${BASE_URL}/jobs/${j.id}`,
      changeFrequency: "daily",
      priority: 0.7,
      lastModified: new Date(j.createdAt),
    }));

  return [...staticRoutes, ...careersJobRoutes, ...brandJobRoutes];
}
