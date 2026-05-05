"use client";

import { useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  value: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
};

export default function AvatarUploader({ disabled, value, onPick, onRemove }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 rounded-full border overflow-hidden bg-background">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">No photo</div>
        )}

        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="absolute bottom-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
          aria-label="Change avatar"
          disabled={disabled}
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => ref.current?.click()} disabled={disabled}>
          <Camera className="h-4 w-4 mr-2" />
          Upload
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onRemove}
          disabled={disabled || !value}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove
        </Button>
      </div>
    </div>
  );
}