import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2, Volume2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { useSpeechSettings, DEFAULT_RATE, DEFAULT_PITCH } from "@/hooks/useSpeechSettings";

/** Rank English voices first, then everything else, alphabetically within each group. */
function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const ae = a.lang.startsWith("en") ? 0 : 1;
    const be = b.lang.startsWith("en") ? 0 : 1;
    if (ae !== be) return ae - be;
    return a.name.localeCompare(b.name);
  });
}

/** Gear button + popover to pick the speech voice, rate and pitch (persisted). */
export function VoiceSettings() {
  const { voices, voiceURI, setVoiceURI, rate, setRate, pitch, setPitch, reset, supported } =
    useSpeechSettings();
  const { speak } = useSpeech();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => sortVoices(voices), [voices]);
  const isDefault = voiceURI === null && rate === DEFAULT_RATE && pitch === DEFAULT_PITCH;

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Cài đặt giọng đọc"
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg border transition-all active:scale-95",
          open
            ? "border-zinc-600 bg-zinc-800 text-zinc-100"
            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"
        )}
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            ref={panelRef}
            className="absolute right-0 top-12 z-50 w-[min(92vw,20rem)] rounded-2xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl shadow-black/60 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
                Cài đặt giọng đọc
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice picker */}
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500">Giọng</span>
              <select
                value={voiceURI ?? ""}
                onChange={e => setVoiceURI(e.target.value || null)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none"
              >
                <option value="">Tự động (giọng tiếng Anh)</option>
                {sorted.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              {sorted.length === 0 && (
                <span className="block text-[11px] text-amber-400">
                  Thiết bị chưa tải giọng nào. Thử tải lại trang.
                </span>
              )}
            </label>

            {/* Rate */}
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Tốc độ</span>
                <span className="text-[11px] font-mono text-zinc-400">{rate.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.3}
                step={0.05}
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </label>

            {/* Pitch */}
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Cao độ</span>
                <span className="text-[11px] font-mono text-zinc-400">{pitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={pitch}
                onChange={e => setPitch(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </label>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => speak("The quick brown fox jumps over the lazy dog.", "voice-test")}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white active:scale-95 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                Nghe thử
              </button>
              <button
                onClick={reset}
                disabled={isDefault}
                title="Khôi phục mặc định"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all disabled:opacity-40 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
