"use client";

import { useState } from "react";
import Lightbox from "./lightbox";

type Props = {
  urls: string[];
};

export default function MediaGrid({ urls }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  if (!urls?.length) return null;

  const cols =
    urls.length === 1 ? "grid-cols-1" : urls.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <>
      <div className={`grid ${cols} gap-2`}>
        {urls.map((src, i) => (
          <button
            key={src + i}
            className="group relative overflow-hidden rounded-lg border bg-background"
            onClick={() => {
              setIdx(i);
              setOpen(true);
            }}
            aria-label="Open image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`media-${i}`}
              className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <Lightbox open={open} urls={urls} index={idx} onClose={() => setOpen(false)} onIndexChange={setIdx} />
    </>
  );
}