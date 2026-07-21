"use client";

import { useEffect, useRef, useState } from "react";

export default function BrandThumb({
  name,
  className = "",
  textClassName = "text-xl",
  initialOnly = false,
}: {
  name: string;
  className?: string;
  textClassName?: string;
  initialOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);
  const label = initialOnly ? name.slice(0, 1) : name;

  useEffect(() => {
    function fit() {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      // transform: scale()는 레이아웃 크기(scrollWidth)에 영향을 주지 않으므로 항상 원본 너비를 반환한다
      const available = container.clientWidth - 16;
      const natural = text.scrollWidth;
      if (available <= 0 || natural <= 0) return;
      setScale(natural > available ? Math.max(available / natural, 0.35) : 1);
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [label]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center overflow-hidden border border-gray-100 bg-white ${className}`}
      aria-hidden
    >
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap font-extrabold tracking-tight text-gray-900 ${textClassName}`}
        style={{ transform: `scale(${scale})` }}
      >
        {label}
      </span>
    </div>
  );
}
