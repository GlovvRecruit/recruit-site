import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://beauty-recruit.vercel.app";
const SITE_NAME = "앤마들린 채용";
const DEFAULT_TITLE = "뷰티 채용 플랫폼 | 앤마들린 채용 (글로브·플릭스)";
const DEFAULT_DESCRIPTION =
  "뷰티 채용·뷰티 인턴을 찾는다면 앤마들린 채용에서 글로브·플릭스 자사 채용과 메이저 뷰티 브랜드 채용 공고를 한 번에 확인하세요. 관심 브랜드·직무의 신규 공고는 카카오톡으로 받아볼 수 있어요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "뷰티 채용",
    "뷰티 채용 플랫폼",
    "뷰티 인턴",
    "뷰티 브랜드 채용",
    "화장품 채용",
    "글로브 채용",
    "플릭스 채용",
    "앤마들린 채용",
    "Glovv 채용",
    "Flixx 채용",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  // 네이버 서치어드바이저(https://searchadvisor.naver.com)에서 사이트 소유 확인 후 발급되는
  // 코드를 여기에 넣어야 네이버 검색 등록이 가능함 — 사용자가 직접 등록해야 하는 항목.
  // verification: { other: { "naver-site-verification": "NAVER_SITE_VERIFICATION_CODE" } },
};

const organizationJsonLd = {
  "@context": "https://schema.org/",
  "@type": "Organization",
  name: "앤마들린 주식회사",
  alternateName: ["앤마들린 채용", "글로브", "Glovv", "글로브 채용", "플릭스", "Flixx", "플릭스 채용"],
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
