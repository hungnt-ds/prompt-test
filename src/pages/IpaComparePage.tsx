import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { IPA_PAIRS, IPA_SOUND_BY_ID, type IpaSound } from "@/data/ipa";
import { CATEGORY_ACCENT } from "@/components/ipa/accents";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";

interface ResolvedPair {
  a: IpaSound;
  b: IpaSound;
  pairs: [string, string][];
}

/** Build a comparison for two sound ids: use a curated minimal-pair set if one
 *  exists (oriented to the requested order), otherwise zip the sounds' words. */
function resolvePair(aId?: string | null, bId?: string | null): ResolvedPair | null {
  if (!aId || !bId) return null;
  const a = IPA_SOUND_BY_ID[aId];
  const b = IPA_SOUND_BY_ID[bId];
  if (!a || !b) return null;

  const curated = IPA_PAIRS.find(
    p => (p.a === aId && p.b === bId) || (p.a === bId && p.b === aId)
  );
  if (curated) {
    const pairs = curated.a === aId ? curated.pairs : curated.pairs.map(([x, y]) => [y, x] as [string, string]);
    return { a, b, pairs };
  }

  const n = Math.min(a.words.length, b.words.length);
  const pairs = Array.from({ length: n }, (_, i) => [a.words[i], b.words[i]] as [string, string]);
  return { a, b, pairs };
}

export function IpaComparePage() {
  const [params] = useSearchParams();
  const { speak, speaking } = useSpeech();

  const initial =
    resolvePair(params.get("a"), params.get("b")) ||
    resolvePair(IPA_PAIRS[0].a, IPA_PAIRS[0].b)!;
  const [current, setCurrent] = useState<ResolvedPair>(initial);

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="h-16 flex items-center gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <Link to="/ipa" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Bảng IPA</span>
        </Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">So sánh âm</h1>
        <div className="ml-auto">
          <VoiceSettings />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
          {/* Pair picker */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Chọn cặp âm</h2>
            <div className="flex flex-wrap gap-2">
              {IPA_PAIRS.map(p => {
                const active = current.a.id === p.a && current.b.id === p.b;
                return (
                  <button
                    key={`${p.a}-${p.b}`}
                    onClick={() => setCurrent(resolvePair(p.a, p.b)!)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-bold border transition-all",
                      active
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-700 dark:text-blue-300"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-600"
                    )}
                  >
                    /{IPA_SOUND_BY_ID[p.a].symbol}/ vs /{IPA_SOUND_BY_ID[p.b].symbol}/
                  </button>
                );
              })}
            </div>
          </section>

          {/* Two sound headers */}
          <section className="grid grid-cols-2 gap-4">
            {[current.a, current.b].map(s => (
              <button
                key={s.id}
                onClick={() => speak(s.example, s.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-6 rounded-2xl border transition-all active:scale-95",
                  speaking === s.id
                    ? "border-blue-500/60 ring-2 ring-blue-500/30 bg-blue-500/10"
                    : "border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 hover:border-slate-500 dark:hover:border-slate-600"
                )}
              >
                <span className={cn("text-4xl font-bold", CATEGORY_ACCENT[s.category])}>/{s.symbol}/</span>
                <span className="text-xs text-slate-500">{s.example}</span>
                <Volume2 className={cn("w-4 h-4 mt-1", speaking === s.id ? "text-blue-600 dark:text-blue-400 animate-pulse" : "text-slate-400 dark:text-slate-600")} />
              </button>
            ))}
          </section>

          {/* Minimal pairs */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Cặp từ tối thiểu</h2>
            <p className="text-xs text-slate-500">Nghe lần lượt hai từ và tập phân biệt sự khác nhau của âm.</p>
            <div className="rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden divide-y divide-slate-800/60">
              {current.pairs.map(([wa, wb], i) => (
                <div key={i} className="grid grid-cols-2 divide-x divide-slate-800/60">
                  {[wa, wb].map((word, col) => (
                    <button
                      key={col}
                      onClick={() => speak(word, `${i}-${col}-${word}`)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors",
                        speaking === `${i}-${col}-${word}`
                          ? "bg-blue-500/10 text-blue-800 dark:text-blue-200"
                          : "hover:bg-slate-800/50 text-slate-800 dark:text-slate-200"
                      )}
                    >
                      <span className="text-sm font-medium">{word}</span>
                      <Volume2 className={cn("w-4 h-4 shrink-0", speaking === `${i}-${col}-${word}` ? "text-blue-600 dark:text-blue-400 animate-pulse" : "text-slate-700")} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
