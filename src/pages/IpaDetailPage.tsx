import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GitCompareArrows, ListMusic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { IPA_SOUND_BY_ID } from "@/data/ipa";
import { CATEGORY_ACCENT } from "@/components/ipa/SoundCard";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";

const CATEGORY_LABEL: Record<string, string> = {
  consonant: "Phụ âm",
  monophthong: "Nguyên âm đơn",
  diphthong: "Nguyên âm đôi",
};

export function IpaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { speak, speaking } = useSpeech();
  const sound = id ? IPA_SOUND_BY_ID[id] : undefined;

  if (!sound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#09090b] text-zinc-500">
        <p className="text-sm">Không tìm thấy âm này.</p>
        <Link to="/ipa" className="text-blue-400 hover:text-blue-300 text-sm font-medium">← Về bảng IPA</Link>
      </div>
    );
  }

  const similar = sound.similar.map(sid => IPA_SOUND_BY_ID[sid]).filter(Boolean);

  return (
    <div className="h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <header className="h-16 flex items-center gap-3 px-4 md:px-6 shrink-0 border-b border-zinc-800/60">
        <Link
          to="/ipa"
          className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Bảng IPA</span>
        </Link>
        <span className="text-zinc-700">/</span>
        <span className={cn("text-[15px] font-bold", CATEGORY_ACCENT[sound.category])}>/{sound.symbol}/</span>
        <div className="ml-auto">
          <VoiceSettings />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-10">
          {/* Hero */}
          <section className="flex flex-col sm:flex-row sm:items-center gap-6">
            <button
              onClick={() => speak(sound.example, sound.id)}
              className={cn(
                "shrink-0 w-32 h-32 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                speaking === sound.id
                  ? "border-blue-500/60 ring-2 ring-blue-500/30 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
              )}
            >
              <span className={cn("text-4xl font-bold", CATEGORY_ACCENT[sound.category])}>/{sound.symbol}/</span>
              <Volume2 className={cn("w-4 h-4", speaking === sound.id ? "text-blue-400 animate-pulse" : "text-zinc-600")} />
            </button>
            <div className="space-y-2">
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-800/60 border border-zinc-700/50 rounded px-2 py-0.5">
                {CATEGORY_LABEL[sound.category]}
              </span>
              <h1 className="text-2xl font-bold text-zinc-100">
                Ví dụ: <span className="text-blue-300">{sound.example}</span>
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">{sound.tip}</p>
            </div>
          </section>

          {/* Practice words */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Từ luyện nghe</h2>
              <button
                onClick={() => speak(sound.words.join(", "), `${sound.id}-all`)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all active:scale-95"
              >
                <ListMusic className="w-3.5 h-3.5" />
                Nghe tất cả
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sound.words.map(word => (
                <button
                  key={word}
                  onClick={() => speak(word, word)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-left transition-all active:scale-95",
                    speaking === word
                      ? "border-blue-500/60 ring-2 ring-blue-500/30 bg-blue-500/10"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800/60"
                  )}
                >
                  <span className="text-sm font-medium text-zinc-200">{word}</span>
                  <Volume2 className={cn("w-4 h-4 shrink-0", speaking === word ? "text-blue-400 animate-pulse" : "text-zinc-600")} />
                </button>
              ))}
            </div>
          </section>

          {/* Similar sounds */}
          {similar.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Âm dễ nhầm</h2>
              <div className="flex flex-wrap gap-3">
                {similar.map(s => (
                  <div key={s.id} className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1 pl-3">
                    <button
                      onClick={() => speak(s.example, s.id)}
                      className="flex items-center gap-2 pr-2"
                    >
                      <span className={cn("text-lg font-bold", CATEGORY_ACCENT[s.category])}>/{s.symbol}/</span>
                      <span className="text-xs text-zinc-500">{s.example}</span>
                    </button>
                    <Link
                      to={`/ipa/compare?a=${sound.id}&b=${s.id}`}
                      title={`So sánh /${sound.symbol}/ với /${s.symbol}/`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-blue-500/20 hover:text-blue-300 text-zinc-300 transition-all"
                    >
                      <GitCompareArrows className="w-3.5 h-3.5" />
                      So sánh
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
