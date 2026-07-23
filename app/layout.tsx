import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import Analytics from "@/components/Analytics";
import "./globals.css";

const META_PIXEL_ID = "881944777433930";

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
const DEFAULT_TITLE = "뷰티 채용·취업 플랫폼 | 앤마들린 채용 (글로브·플릭스)";
const DEFAULT_DESCRIPTION =
  "뷰티 채용·뷰티 취업·뷰티 인턴을 찾는다면 앤마들린 채용에서 글로브·플릭스 자사 채용과 메이저 뷰티 브랜드 채용 공고를 한 번에 확인하세요. 관심 브랜드·직무의 신규 공고는 카카오톡으로 받아볼 수 있어요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "뷰티 채용",
    "뷰티 채용 플랫폼",
    "뷰티 취업",
    "뷰티 취업 플랫폼",
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
  verification: { other: { "naver-site-verification": "4bd54effabe516a32910c13cf684e19a183f7d1e" } },
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
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');`}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel noscript 표준 스니펫 */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js"
          strategy="afterInteractive"
          onLoad={() => {
            const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
            if (jsKey && window.Kakao && !window.Kakao.isInitialized()) {
              window.Kakao.init(jsKey);
            }
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
