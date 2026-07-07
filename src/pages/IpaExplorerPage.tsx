import { useState } from "react";
import { Link } from "react-router-dom";
import { GitCompareArrows, Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { IPA_SOUNDS, IPA_CATEGORIES, type IpaSound } from "@/data/ipa";
import { SoundCard, CATEGORY_ACCENT } from "@/components/ipa/SoundCard";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";

export function IpaExplorerPage() {
  const { speak, speaking, supported } = useSpeech();
  const [lastSound, setLastSound] = useState<IpaSound | null>(null);

  const play = (sound: IpaSound) => {
    speak(sound.example, sound.id);
    setLastSound(sound);
  };

  return (
    <div className="h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="h-16 flex items-center justify-between gap-3 px-4 md:px-6 shrink-0 border-b border-zinc-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-zinc-100 truncate">Học phát âm IPA</h1>
          <p className="hidden sm:block text-[11px] text-zinc-500">Bảng phiên âm quốc tế tiếng Anh — nhấn để nghe</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VoiceSettings />
          <Link
            to="/ipa/compare"
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white active:scale-95 transition-all whitespace-nowrap"
          >
            <GitCompareArrows className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">So sánh âm</span>
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10">
          <section className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-100">English IPA Explorer</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Nhấn vào từng ký tự để nghe cách phát âm âm đó trong một từ ví dụ (dùng hệ thống giọng
              nói trên thiết bị của bạn). Nhấn biểu tượng <span className="text-zinc-300">ⓘ</span> ở góc thẻ để xem
              chi tiết âm với nhiều từ luyện nghe hơn.
            </p>
            {!supported && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 w-fit">
                <VolumeX className="w-4 h-4" />
                Trình duyệt của bạn không hỗ trợ phát âm (Web Speech API).
              </div>
            )}
          </section>

          {IPA_CATEGORIES.map(({ key, label }) => {
            const sounds = IPA_SOUNDS.filter(s => s.category === key);
            return (
              <section key={key} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${CATEGORY_ACCENT[key]}`}>{label}</h3>
                  <span className="text-[10px] text-zinc-600 font-bold">{sounds.length} âm</span>
                  <div className="flex-1 h-px bg-zinc-800/60" />
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                  {sounds.map(sound => (
                    <SoundCard
                      key={sound.id}
                      sound={sound}
                      playing={speaking === sound.id}
                      onPlay={() => play(sound)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Last Sound footer */}
      <footer className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/40 px-4 md:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-4">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Last Sound</span>
          {lastSound ? (
            <button
              onClick={() => play(lastSound)}
              className="flex items-center gap-2 text-sm text-zinc-200 hover:text-white transition-colors"
            >
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span className={`font-bold ${CATEGORY_ACCENT[lastSound.category]}`}>/{lastSound.symbol}/</span>
              <span className="text-zinc-500">— {lastSound.example}</span>
            </button>
          ) : (
            <span className="text-sm text-zinc-600 italic">None</span>
          )}
        </div>
      </footer>
    </div>
  );
}
