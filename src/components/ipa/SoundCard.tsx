import { Link } from "react-router-dom";
import { Info, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IpaCategory, IpaSound } from "@/data/ipa";

export const CATEGORY_ACCENT: Record<IpaCategory, string> = {
  consonant: "text-sky-300",
  monophthong: "text-amber-300",
  diphthong: "text-fuchsia-300",
};

interface SoundCardProps {
  sound: IpaSound;
  onPlay: () => void;
  playing?: boolean;
  /** Show the "detail" affordance linking to /ipa/:id */
  detailLink?: boolean;
}

/** A single IPA cell: click to hear the example word; optional link to detail. */
export function SoundCard({ sound, onPlay, playing, detailLink = true }: SoundCardProps) {
  return (
    <div className="relative group">
      <button
        onClick={onPlay}
        className={cn(
          "w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border bg-zinc-900/60 transition-all active:scale-95",
          playing
            ? "border-blue-500/60 ring-2 ring-blue-500/30 bg-blue-500/10"
            : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60"
        )}
      >
        <span className={cn("text-2xl font-bold leading-none", CATEGORY_ACCENT[sound.category])}>
          /{sound.symbol}/
        </span>
        <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {sound.example}
        </span>
        <Volume2
          className={cn(
            "w-3.5 h-3.5 mt-0.5 transition-colors",
            playing ? "text-blue-400 animate-pulse" : "text-zinc-700 group-hover:text-zinc-500"
          )}
        />
      </button>

      {detailLink && (
        <Link
          to={`/ipa/${sound.id}`}
          onClick={(e) => e.stopPropagation()}
          title="Chi tiết âm"
          className="absolute top-1.5 right-1.5 p-1 rounded-md text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-blue-400 hover:bg-zinc-800 transition-all"
        >
          <Info className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
