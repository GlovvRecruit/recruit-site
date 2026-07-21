"use client";

import { useState } from "react";
import CareersApplyModal from "@/components/CareersApplyModal";

export default function ApplyCtaButton({
  jobTitle,
  className,
  style,
  children,
}: {
  jobTitle: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={style}>
        {children}
      </button>
      {open && <CareersApplyModal jobTitle={jobTitle} onClose={() => setOpen(false)} />}
    </>
  );
}
