import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ChevronsRight,
  Eye,
  EyeOff,
  Languages,
  ListVideo,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DictationSegment } from "@/types/dictation";
import type { YouTubePlayerHandle } from "@/components/dictation/YouTubePlayer";
import { formatTimestamp } from "@/utils/subtitleParser";

// ============================================================
// Shadowing — hai cách phát:
//  - Từng câu: phát một câu, nghỉ một khoảng để nói theo, lặp N lần
//    rồi (tuỳ chọn) tự sang câu tiếp.
//  - Liên tục: video chạy một mạch không dừng, phụ đề tự tô sáng và
//    cuộn theo câu đang nói; ⏮ ⏭ ↺ vẫn tua theo câu.
// Video dính đầu, thanh điều khiển dính đáy, phụ đề cuộn ở giữa.
// ============================================================

const REPEATS = [1, 2, 3, 0] as const; // 0 = lặp mãi
const GAPS = [0, 1, 2] as const; // khoảng nghỉ = n × độ dài câu
const SETTINGS_KEY = "dictation:shadow";

type PlayMode = "sentence" | "continuous";

interface Settings {
  playMode: PlayMode;
  repeat: (typeof REPEATS)[number];
  gap: (typeof GAPS)[number];
  autoNext: boolean;
  hideText: boolean;
  showTranslation: boolean;
}

const DEFAULTS: Settings = {
  playMode: "sentence",
  repeat: 2,
  gap: 1,
  autoNext: true,
  hideText: false,
  showTranslation: false,
};

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
    return {
      playMode: raw.playMode === "continuous" ? "continuous" : "sentence",
      repeat: REPEATS.includes(raw.repeat as Settings["repeat"]) ? (raw.repeat as Settings["repeat"]) : DEFAULTS.repeat,
      gap: GAPS.includes(raw.gap as Settings["gap"]) ? (raw.gap as Settings["gap"]) : DEFAULTS.gap,
      autoNext: raw.autoNext ?? DEFAULTS.autoNext,
      hideText: raw.hideText ?? DEFAULTS.hideText,
      showTranslation: raw.showTranslation ?? DEFAULTS.showTranslation,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Câu đang nói tại thời điểm t: câu cuối cùng đã bắt đầu. */
function segmentAt(segments: DictationSegment[], t: number): number {
  let i = 0;
  while (i + 1 < segments.length && segments[i + 1].start <= t + 0.05) i++;
  return i;
}

interface ShadowingPanelProps {
  segments: DictationSegment[];
  index: number;
  onIndexChange: (i: number) => void;
  playerRef: RefObject<YouTubePlayerHandle | null>;
  playing: boolean;
  speed: number;
  /** Player gọi hàm đặt vào đây khi phát hết một câu */
  segmentEndRef: RefObject<(() => void) | null>;
  /** Hàng chỉnh mốc thời gian câu hiện tại (dùng chung với chế độ chép) */
  timingControls: ReactNode;
  className?: string;
}

export function ShadowingPanel({
  segments,
  index,
  onIndexChange,
  playerRef,
  playing,
  speed,
  segmentEndRef,
  timingControls,
  className,
}: ShadowingPanelProps) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  /** Đang chạy phiên tự động của chế độ từng câu (lặp / tự sang câu) */
  const [running, setRunning] = useState(false);
  const [rep, setRep] = useState(1);
  /** Bấm vào câu đang ẩn để xem tạm — chỉ cho câu này */
  const [peekIndex, setPeekIndex] = useState(-1);

  const continuous = settings.playMode === "continuous";
  const runningRef = useRef(false);
  const repRef = useRef(1);
  const timerRef = useRef<number | undefined>(undefined);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Giá trị mới nhất cho các callback chạy sau nhiều lần render
  const latest = useRef({ segments, index, settings, speed, onIndexChange });
  useEffect(() => {
    latest.current = { segments, index, settings, speed, onIndexChange };
  });

  const seg = segments[index];

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const clearTimer = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  };

  const setRunningBoth = (v: boolean) => {
    runningRef.current = v;
    setRunning(v);
  };

  const resetRep = () => {
    repRef.current = 1;
    setRep(1);
  };

  /** Phát câu i: liên tục thì chạy tiếp qua các câu sau, từng câu thì dừng cuối câu. */
  const playAt = (i: number) => {
    const s = latest.current.segments[i];
    if (!s) return;
    if (latest.current.settings.playMode === "continuous") playerRef.current?.playFrom(s.start);
    else playerRef.current?.playSegment(s.start, s.end);
  };

  const start = () => {
    clearTimer();
    resetRep();
    if (!continuous) setRunningBoth(true);
    playAt(index);
  };

  const stop = () => {
    clearTimer();
    setRunningBoth(false);
    playerRef.current?.pause();
  };

  /** Sang câu i và phát ngay (giữ nguyên trạng thái chạy tự động) */
  const jump = (i: number) => {
    if (i < 0 || i >= segments.length) return;
    clearTimer();
    resetRep();
    onIndexChange(i);
    playAt(i);
  };

  const changePlayMode = (playMode: PlayMode) => {
    if (playMode === settings.playMode) return;
    stop();
    update({ playMode });
  };

  /** Liên tục: nút lớn theo trạng thái video. Từng câu: theo phiên tự động. */
  const isActive = continuous ? playing : running;

  // Từng câu: hết một câu → nghỉ để nói theo → lặp lại hoặc sang câu tiếp
  useEffect(() => {
    segmentEndRef.current = () => {
      if (!runningRef.current) return;
      const { segments: segs, index: i, settings: st, speed: sp } = latest.current;
      const cur = segs[i];
      const gapMs = Math.max(300, (st.gap * (cur.end - cur.start) * 1000) / sp);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        if (!runningRef.current) return;
        if (st.repeat === 0 || repRef.current < st.repeat) {
          repRef.current += 1;
          setRep(repRef.current);
          playAt(i);
        } else if (st.autoNext && i < segs.length - 1) {
          resetRep();
          latest.current.onIndexChange(i + 1);
          playAt(i + 1);
        } else {
          setRunningBoth(false);
        }
      }, gapMs);
    };
    return () => {
      segmentEndRef.current = null;
      clearTimer();
    };
    // Đăng ký một lần; mọi giá trị đọc qua `latest`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Liên tục: theo dõi thời gian video để tô sáng câu đang nói
  useEffect(() => {
    if (!continuous || !playing) return;
    const t = window.setInterval(() => {
      const time = playerRef.current?.getCurrentTime() ?? 0;
      const { segments: segs, index: i, onIndexChange: change } = latest.current;
      const at = segmentAt(segs, time);
      if (at !== i) change(at);
    }, 250);
    return () => window.clearInterval(t);
  }, [continuous, playing, playerRef]);

  // Câu đang phát luôn nằm trong tầm nhìn
  useEffect(() => {
    rowRefs.current[index]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [index]);

  // Phím tắt: Space phát/dừng, ←/→ đổi câu, R nghe lại
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isActive) stop();
        else start();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        jump(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        jump(index - 1);
      } else if (e.key === "r" || e.key === "R") {
        jump(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const textVisible = !settings.hideText || peekIndex === index;
  const repeatLabel = settings.repeat === 0 ? "∞" : String(settings.repeat);

  return (
    <div className={cn("min-w-0 flex flex-col gap-3 lg:gap-4", className)}>
      {/* Câu hiện tại */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 p-3 md:p-5 space-y-2 md:space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Câu {index + 1}
            <span className="text-slate-500 font-normal">/{segments.length}</span>
          </span>
          <span className="flex items-center gap-3 tabular-nums">
            {running && !continuous && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold">
                Lặp {rep}/{repeatLabel}
              </span>
            )}
            <span className="font-mono">
              {formatTimestamp(seg.start)} – {formatTimestamp(seg.end)}
            </span>
          </span>
        </div>
        <button
          onClick={() => settings.hideText && setPeekIndex(peekIndex === index ? -1 : index)}
          className={cn(
            "block w-full text-left text-lg md:text-2xl font-semibold leading-snug transition-[filter]",
            !textVisible && "blur-md select-none",
            !settings.hideText && "cursor-default"
          )}
          title={settings.hideText ? "Bấm để xem / ẩn câu này" : undefined}
        >
          {seg.text}
        </button>
        {settings.showTranslation && seg.translation && (
          <p className="text-sm text-slate-500 italic">{seg.translation}</p>
        )}
        <div className="hidden md:block pt-1">{timingControls}</div>
      </div>

      {/* Toàn bộ phụ đề — tự cuộn theo câu đang phát */}
      <ol className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 divide-y divide-slate-200 dark:divide-slate-800 lg:max-h-[45vh] lg:overflow-y-auto scrollbar-thin">
        {segments.map((s, i) => (
          <li key={s.id}>
            <button
              ref={el => {
                rowRefs.current[i] = el;
              }}
              onClick={() => jump(i)}
              className={cn(
                "w-full flex gap-3 px-3 py-2.5 text-left text-sm transition-colors scroll-mt-[calc(56.25vw+5rem)] scroll-mb-36 lg:scroll-m-2",
                i === index
                  ? "bg-blue-500/15 text-slate-900 dark:text-slate-100 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              )}
            >
              <span className="w-11 shrink-0 font-mono text-xs text-slate-500 tabular-nums pt-0.5">
                {formatTimestamp(s.start)}
              </span>
              <span className={cn(settings.hideText && i !== index && "blur-sm select-none")}>{s.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="md:hidden">{timingControls}</div>

      {/* Thanh điều khiển — dính đáy màn hình */}
      <div className="sticky bottom-0 z-20 -mx-4 lg:mx-0 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:pb-3 bg-slate-100/95 dark:bg-[#0b1120]/95 lg:rounded-2xl lg:bg-white lg:dark:bg-slate-900 lg:border lg:border-slate-300/60 lg:dark:border-slate-800/60 backdrop-blur border-t border-slate-300/60 dark:border-slate-800/60 space-y-2">
        {/* Cài đặt: một hàng, vuốt ngang khi chật */}
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px] text-slate-500 lg:flex-wrap lg:justify-center whitespace-nowrap">
          <Segmented
            icon={<ListVideo className="w-3.5 h-3.5" />}
            title="Cách phát"
            options={[
              { value: "sentence" as PlayMode, label: "Từng câu" },
              { value: "continuous" as PlayMode, label: "Liên tục" },
            ]}
            value={settings.playMode}
            onChange={changePlayMode}
          />
          {!continuous && (
            <>
              <Segmented
                icon={<Repeat className="w-3.5 h-3.5" />}
                title="Số lần nghe mỗi câu"
                options={REPEATS.map(r => ({ value: r, label: r === 0 ? "∞" : `${r}×` }))}
                value={settings.repeat}
                onChange={repeat => update({ repeat })}
              />
              <Segmented
                icon={<Timer className="w-3.5 h-3.5" />}
                title="Khoảng nghỉ để nói theo (so với độ dài câu)"
                options={GAPS.map(g => ({ value: g, label: g === 0 ? "0" : `${g}×` }))}
                value={settings.gap}
                onChange={gap => update({ gap })}
              />
              <Toggle
                on={settings.autoNext}
                onClick={() => update({ autoNext: !settings.autoNext })}
                icon={<ChevronsRight className="w-3.5 h-3.5" />}
                label="Tự sang câu"
              />
            </>
          )}
          <Toggle
            on={settings.hideText}
            onClick={() => update({ hideText: !settings.hideText })}
            icon={settings.hideText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            label="Ẩn chữ"
          />
          <Toggle
            on={settings.showTranslation}
            onClick={() => update({ showTranslation: !settings.showTranslation })}
            icon={<Languages className="w-3.5 h-3.5" />}
            label="Nghĩa"
          />
        </div>
        <div className="flex items-center justify-center gap-4">
          <IconButton onClick={() => jump(index - 1)} disabled={index === 0} title="Câu trước (←)">
            <SkipBack className="w-5 h-5" />
          </IconButton>
          <IconButton onClick={() => jump(index)} title="Nghe lại câu này (R)">
            <RotateCcw className="w-5 h-5" />
          </IconButton>
          <button
            onClick={isActive ? stop : start}
            title={isActive ? "Dừng (Space)" : continuous ? "Phát liên tục (Space)" : "Phát tự động (Space)"}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30"
          >
            {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <IconButton onClick={() => jump(index + 1)} disabled={index >= segments.length - 1} title="Câu tiếp (→)">
            <SkipForward className="w-5 h-5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center w-11 h-11 rounded-full text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function Segmented<T extends string | number>({
  icon,
  title,
  options,
  value,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1" title={title}>
      {icon}
      <span className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-2 py-1 tabular-nums transition-colors",
              o.value === value ? "bg-blue-600 text-white" : "hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
            )}
          >
            {o.label}
          </button>
        ))}
      </span>
    </span>
  );
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex shrink-0 items-center gap-1 px-2 py-1 rounded-lg border transition-colors",
        on
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-slate-300 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
