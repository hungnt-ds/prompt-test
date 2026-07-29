import { cn } from "@/lib/utils";

/** Thang FSRS: 1 Again, 2 Hard, 3 Good, 4 Easy — dùng chung cho lật thẻ và ôn tập. */
const RATINGS: { rating: 1 | 2 | 3 | 4; label: string; hint: string; cls: string }[] = [
  { rating: 1, label: "Quên", hint: "Không nhớ", cls: "border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-500/10" },
  { rating: 2, label: "Khó", hint: "Nhớ chật vật", cls: "border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10" },
  { rating: 3, label: "Tốt", hint: "Nhớ sau chút suy nghĩ", cls: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10" },
  { rating: 4, label: "Dễ", hint: "Nhớ ngay", cls: "border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10" },
];

export function RatingButtons({
  onRate,
  disabled,
}: {
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map(r => (
        <button
          key={r.rating}
          onClick={() => onRate(r.rating)}
          disabled={disabled}
          title={r.hint}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl border bg-white dark:bg-slate-950/60 px-2 py-3 transition-colors disabled:opacity-40",
            r.cls
          )}
        >
          <span className="text-sm font-bold">{r.label}</span>
          <span className="text-[10px] opacity-60 hidden sm:block">{r.hint}</span>
        </button>
      ))}
    </div>
  );
}
