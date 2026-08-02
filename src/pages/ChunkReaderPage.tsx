import { useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  AlertTriangle,
  AlignLeft,
} from "lucide-react";

// ============================================================
// Đọc kiểu chunk: dán đoạn văn có ký tự ngăn cách (mặc định |),
// từng cụm hiện lần lượt để đọc nắm ý thay vì đọc từng từ.
// ============================================================

const LS = {
  text: "chunk:text",
  separator: "chunk:separator",
  wpm: "chunk:wpm",
} as const;

const SAMPLE_TEXT =
  "The marketing team | has launched | a new campaign | to increase sales | in the Asian market. | Early results | show a significant rise | in customer engagement | across all channels.";

function readLS(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

/** Tách văn bản theo ký tự ngăn cách (và xuống dòng), bỏ cụm rỗng. */
function splitChunks(text: string, separator: string): string[] {
  const parts = separator ? text.split(separator) : [text];
  return parts
    .flatMap(p => p.split(/\n+/))
    .map(p => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function ChunkReaderPage() {
  const [text, setText] = useState(() => readLS(LS.text, ""));
  const [separator, setSeparator] = useState(() => readLS(LS.separator, "|"));
  const [wpm, setWpm] = useState(() => {
    const n = Number(readLS(LS.wpm, "200"));
    return Number.isFinite(n) && n >= 60 ? n : 200;
  });
  const [reading, setReading] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const chunks = useMemo(() => splitChunks(text, separator), [text, separator]);

  // Lưu lại để mở trang là có sẵn bài cũ
  useEffect(() => {
    window.localStorage.setItem(LS.text, text);
  }, [text]);
  useEffect(() => {
    window.localStorage.setItem(LS.separator, separator);
  }, [separator]);
  useEffect(() => {
    window.localStorage.setItem(LS.wpm, String(wpm));
  }, [wpm]);

  // Tự chạy: thời gian hiện mỗi cụm tỉ lệ số từ trong cụm (theo WPM), tối thiểu 600ms
  useEffect(() => {
    if (!playing || !reading) return;
    const chunk = chunks[index] ?? "";
    const words = chunk.split(/\s+/).filter(Boolean).length || 1;
    const ms = Math.max(600, (words / wpm) * 60_000);
    const t = window.setTimeout(() => {
      if (index + 1 >= chunks.length) setPlaying(false);
      else setIndex(index + 1);
    }, ms);
    return () => window.clearTimeout(t);
  }, [playing, reading, index, chunks, wpm]);

  // Phím tắt khi đang đọc: Space = play/pause, ←/→ = lùi/tiến
  useEffect(() => {
    if (!reading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.key === "ArrowRight") {
        setPlaying(false);
        setIndex(i => Math.min(i + 1, chunks.length - 1));
      } else if (e.key === "ArrowLeft") {
        setPlaying(false);
        setIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Escape") {
        setPlaying(false);
        setReading(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reading, chunks.length]);

  const startReading = () => {
    if (chunks.length === 0) return;
    setIndex(0);
    setPlaying(false);
    setReading(true);
  };

  const next = () => {
    setPlaying(false);
    setIndex(i => Math.min(i + 1, chunks.length - 1));
  };
  const prev = () => {
    setPlaying(false);
    setIndex(i => Math.max(i - 1, 0));
  };

  const separatorMissing =
    text.trim().length > 0 && separator.length > 0 && !text.includes(separator) && chunks.length <= 1;

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Đọc chunk</h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Từng cụm từ hiện lần lượt — đọc nắm ý, không đọc từng từ
          </p>
        </div>
        {reading && (
          <button
            onClick={() => {
              setPlaying(false);
              setReading(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden md:inline">Sửa văn bản</span>
          </button>
        )}
      </header>

      {!reading ? (
        /* ---------- Soạn văn bản ---------- */
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                Ký tự ngăn cách
                <input
                  type="text"
                  value={separator}
                  onChange={e => setSeparator(e.target.value)}
                  maxLength={5}
                  className="w-16 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-2 py-1.5 text-sm font-mono text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                />
              </label>
              <button
                onClick={() => setText(SAMPLE_TEXT)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Chèn văn bản mẫu
              </button>
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={12}
              placeholder={`Dán đoạn văn vào đây, đặt "${separator || "|"}" giữa các cụm từ…\n\nVí dụ: The marketing team ${separator || "|"} has launched ${separator || "|"} a new campaign…`}
              className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-4 py-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 resize-y scrollbar-thin"
            />

            {separatorMissing && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Văn bản chưa có ký tự "{separator}" — cả đoạn sẽ hiện thành một cụm duy nhất.
              </div>
            )}

            {/* Xem trước các cụm */}
            {chunks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {chunks.length} cụm
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chunks.slice(0, 40).map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {c}
                    </span>
                  ))}
                  {chunks.length > 40 && (
                    <span className="px-2 py-1 text-xs text-slate-500">… +{chunks.length - 40} cụm</span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={startReading}
              disabled={chunks.length === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <AlignLeft className="w-4 h-4" />
              Bắt đầu đọc ({chunks.length} cụm)
            </button>
          </div>
        </div>
      ) : (
        /* ---------- Đọc ---------- */
        <>
          <div
            className="flex-1 flex flex-col items-center justify-center gap-6 px-6 cursor-pointer select-none"
            onClick={next}
            title="Bấm để sang cụm tiếp theo"
          >
            {/* Cụm trước (mờ) */}
            <p className="min-h-[1.5rem] text-sm text-slate-400 dark:text-slate-600 text-center max-w-2xl">
              {index > 0 ? chunks[index - 1] : ""}
            </p>

            {/* Cụm hiện tại */}
            <p
              key={index}
              className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 text-center max-w-4xl leading-snug animate-in fade-in duration-200"
            >
              {chunks[index]}
            </p>

            <div className="min-h-[3rem] flex items-center">
              {index + 1 >= chunks.length && !playing && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setIndex(0);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30"
                >
                  <RotateCcw className="w-4 h-4" />
                  Đọc lại từ đầu
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <footer className="shrink-0 border-t border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-[#0d1424] px-4 md:px-6 py-3 space-y-3">
            {/* Progress */}
            <div className="max-w-3xl mx-auto flex items-center gap-3 text-xs text-slate-500">
              <span className="tabular-nums whitespace-nowrap">
                {index + 1}/{chunks.length}
              </span>
              <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-200"
                  style={{ width: `${((index + 1) / chunks.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  setPlaying(false);
                  setIndex(0);
                }}
                title="Đọc lại từ đầu"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={prev}
                disabled={index === 0}
                title="Cụm trước (←)"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPlaying(p => !p)}
                title="Tự chạy / tạm dừng (Space)"
                className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                onClick={next}
                disabled={index + 1 >= chunks.length}
                title="Cụm tiếp (→ hoặc bấm vào chữ)"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <label className="flex items-center gap-2 ml-2 md:ml-6 text-xs text-slate-500">
                Tốc độ
                <input
                  type="range"
                  min={80}
                  max={500}
                  step={10}
                  value={wpm}
                  onChange={e => setWpm(Number(e.target.value))}
                  className="w-28 md:w-40 accent-blue-500"
                />
                <span className="font-mono tabular-nums w-16">{wpm} wpm</span>
              </label>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
