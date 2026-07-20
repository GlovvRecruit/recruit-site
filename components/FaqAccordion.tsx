"use client";

import { useState } from "react";

export default function FaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState(-1);

  return (
    <div className="grid gap-2.5">
      {items.map((item, i) => {
        const active = open === i;
        return (
          <div
            key={item.q}
            className="card-shadow overflow-hidden rounded-2xl border border-gray-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setOpen(active ? -1 : i)}
              className="flex w-full items-center justify-between gap-3 px-[18px] py-4 text-left text-[14.5px] font-bold"
            >
              {item.q}
              <i className={active ? "ph-bold ph-minus" : "ph-bold ph-plus"} />
            </button>
            {active && (
              <p className="px-[18px] pb-4 text-[13.5px] leading-relaxed text-gray-600">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
