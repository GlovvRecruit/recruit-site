import type { MetadataRoute } from "next";
import { getCareersJobs, getJobs } from "@/lib/data";

const BASE_URL = "https://beauty-recruit.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [careersJobs, brandJobs] = await Promise.all([getCareersJobs(), getJobs()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/careers`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/brand-jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/media`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/insight`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/onboarding`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const careersJobRoutes: MetadataRoute.Sitemap = careersJobs
    .filter((j) => j.status === "open")
    .map((j) => ({
      url: `${BASE_URL}/careers/${j.id}`,
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const brandJobRoutes: MetadataRoute.Sitemap = brandJobs
    .filter((j) => j.status === "open")
    .map((j) => ({
      url: `${BASE_URL}/jobs/${j.id}`,
      changeFrequency: "daily",
      priority: 0.7,
    }));

  return [...staticRoutes, ...careersJobRoutes, ...brandJobRoutes];
}
