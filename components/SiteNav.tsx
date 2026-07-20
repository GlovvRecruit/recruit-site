"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/about", label: "ABOUT", match: "/about" },
  { href: "/careers", label: "자사 채용", match: "/careers" },
  { href: "/brand-jobs", label: "브랜드 공고", match: ["/brand-jobs", "/jobs", "/onboarding"] },
  { href: "/media", label: "MEDIA", match: "/media" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1120px] items-center gap-5 px-5 py-3">
        <Link href="/about" className="flex flex-none items-center gap-2">
          <span
            className="h-[26px] w-[26px] rounded-full"
            style={{
              background: "var(--brand-gradient)",
              boxShadow:
                "0 3px 12px rgba(255,0,153,.32), inset -4px -5px 8px rgba(255,255,255,.35)",
            }}
          />
          <span className="text-[17px] font-extrabold tracking-tight">
            <span className="brand-gradient-text">Glovv</span> 채용
          </span>
        </Link>

        <nav className="ml-auto flex gap-1 overflow-x-auto">
          {ITEMS.map((item) => {
            const matches = Array.isArray(item.match) ? item.match : [item.match];
            const active = matches.some(
              (m) => pathname === m || pathname.startsWith(m + "/")
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold tracking-tight transition-colors " +
                  (active
                    ? "text-white shadow-[0_4px_12px_rgba(250,60,100,0.28)]"
                    : "text-gray-500 hover:text-gray-700")
                }
                style={active ? { background: "var(--brand-gradient)" } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
