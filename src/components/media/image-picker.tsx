"use client";

import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  max?: number;
  files: File[];
  previews: string[];
  onPick: (files: File[]) => void;
  onRemoveAt: (index: number) => void;
  onClear: () => void;
};

export default function ImagePicker({
  disabled,
  max = 6,
  files,
  previews,
  onPick,
  onRemoveAt,
  onClear,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []).slice(0, max);
              e.target.value = "";
              if (picked.length) onPick(picked);
            }}
          />
          <Button type="button" variant="outline" disabled={disabled}>
            <ImagePlus className="h-4 w-4 mr-2" />
            Add photos
          </Button>
        </label>

        {files.length ? (
          <Button type="button" variant="secondary" onClick={onClear} disabled={disabled}>
            Clear ({files.length})
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Up to {max} images.</span>
        )}
      </div>

      {previews.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={src + i} className="relative overflow-hidden rounded-lg border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`preview-${i}`} className="h-36 w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveAt(i)}
                className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}