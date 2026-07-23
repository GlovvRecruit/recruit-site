import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { getInsightLinks } from "@/lib/data";

export const metadata: Metadata = {
  title: "인사이트",
  description: "앤마들린이 축적하고 있는 퍼포먼스·콘텐츠 마케팅 인사이트를 모았습니다.",
  alternates: { canonical: "/insight" },
};

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function InsightPage() {
  const links = await getInsightLinks();
  const groups = new Map<string, typeof links>();
  for (const link of links) {
    const list = groups.get(link.groupLabel) ?? [];
    list.push(link);
    groups.set(link.groupLabel, list);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="mx-auto max-w-[820px] px-5 pb-[90px] pt-10">
        <p className="m-0 text-xs font-extrabold tracking-[0.18em] text-[color:var(--brand-pink)]">
          INSIGHT
        </p>
        <h1 className="mb-2 mt-2.5 text-[32px] font-extrabold tracking-tight">
          앤마들린, 축적하고 있는 인사이트를 조금 풀어봐요
        </h1>
        <p className="mb-8 text-[15px] text-gray-500">
          퍼포먼스/콘텐츠 마케팅과 관련된 인사이트를 조금 공유해요
        </p>

        {[...groups.entries()].map(([label, items]) => (
          <section key={label} className="mb-9">
            <h2 className="mb-3.5 flex items-center gap-2 text-[15px] font-extrabold text-gray-500">
              <i className="ph-fill ph-lightbulb text-[color:var(--brand-pink)]" />
              {label}
            </h2>
            <div className="grid gap-3">
              {items.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-shadow card-shadow-hover flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white px-[18px] py-4 text-inherit no-underline transition-transform hover:-translate-y-0.5"
                >
                  <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 정적 asset, 최적화 불필요 */}
                    <img src="/site-icon.png" alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold leading-snug">
                      {m.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-gray-400">
                      {domainOf(m.url)}
                    </span>
                  </span>
                  <i className="ph-bold ph-arrow-up-right flex-none text-gray-300" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>

      <Footer />
    </div>
  );
}
