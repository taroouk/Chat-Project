"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
};

function clampIndex(i: number, n: number) {
  if (n <= 0) return 0;
  if (i < 0) return n - 1;
  if (i >= n) return 0;
  return i;
}

export default function Lightbox({ open, urls, index, onClose, onIndexChange }: Props) {
  const n = urls.length;
  const src = urls[clampIndex(index, n)] ?? "";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange(clampIndex(index - 1, n));
      if (e.key === "ArrowRight") onIndexChange(clampIndex(index + 1, n));
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, index, n, onClose, onIndexChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {n > 1 ? (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-white/90 hover:text-white"
            onClick={() => onIndexChange(clampIndex(index - 1, n))}
            aria-label="Previous"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>

          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-white/90 hover:text-white"
            onClick={() => onIndexChange(clampIndex(index + 1, n))}
            aria-label="Next"
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </>
      ) : null}

      <div className="h-full w-full flex items-center justify-center p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="media"
          className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
      </div>

      {n > 1 ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
          {clampIndex(index, n) + 1} / {n}
        </div>
      ) : null}
    </div>
  );
}