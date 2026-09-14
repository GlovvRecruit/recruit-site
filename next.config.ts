import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // 2026-08-28 에 "인턴" 표기를 "전환형 매니저"로 바꾸며 경로도 함께 옮겼다.
        // 카카오 발송 메시지·공고 상세 CTA 등 밖에 나간 링크가 옛 주소를 가리키고 있어
        // 영구 리다이렉트로 받아준다. 쿼리스트링은 Next 가 기본으로 유지한다.
        source: "/brand-jobs/for-interns",
        destination: "/brand-jobs/for-manager",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
