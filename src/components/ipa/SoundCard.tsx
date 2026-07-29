import { Link } from "react-router-dom";
import { Info, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IpaSound } from "@/data/ipa";
import { CATEGORY_ACCENT } from "@/components/ipa/accents";

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
          "w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border bg-slate-100 dark:bg-slate-900/60 transition-all active:scale-95",
          playing
            ? "border-blue-500/60 ring-2 ring-blue-500/30 bg-blue-500/10"
            : "border-slate-300 dark:border-slate-800 hover:border-slate-500 dark:hover:border-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
        )}
      >
        <span className={cn("text-2xl font-bold leading-none", CATEGORY_ACCENT[sound.category])}>
          /{sound.symbol}/
        </span>
        <span className="text-[11px] text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
          {sound.example}
        </span>
        <Volume2
          className={cn(
            "w-3.5 h-3.5 mt-0.5 transition-colors",
            playing ? "text-blue-600 dark:text-blue-400 animate-pulse" : "text-slate-700 group-hover:text-slate-500"
          )}
        />
      </button>

      {detailLink && (
        <Link
          to={`/ipa/${sound.id}`}
          onClick={(e) => e.stopPropagation()}
          title="Chi tiết âm"
          className="absolute top-1.5 right-1.5 p-1 rounded-md text-slate-400 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
        >
          <Info className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
