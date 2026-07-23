import type { MetadataRoute } from "next";

// 채용 공고 노출이 목적인 사이트라 AI 검색·답변 엔진 크롤러도 명시적으로 허용한다.
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/admin", "/api/"],
      })),
    ],
    sitemap: "https://beauty-recruit.vercel.app/sitemap.xml",
  };
}
