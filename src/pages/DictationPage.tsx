import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  CloudOff,
  Eye,
  FileDown,
  FileUp,
  Headphones,
  Languages,
  Lightbulb,
  ListRestart,
  Loader2,
  Minus,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Volume2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DictationLesson, DictationSegment, LessonProgress, SegmentEvaluation } from "@/types/dictation";
import { SAMPLE_DICTATION_LESSONS } from "@/data/sampleDictations";
import { ApiSettings } from "@/components/ApiSettings";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/dictation/YouTubePlayer";
import { ShadowingPanel } from "@/components/dictation/ShadowingPanel";
import {
  createLesson,
  extractVideoId,
  loadCustomLessons,
  loadPendingDeletes,
  loadProgress,
  readSubtitleFile,
  saveCustomLessons,
  savePendingDeletes,
  saveProgress,
  shiftSegment,
  type DictationProgress,
} from "@/services/youtubeTranscript";
import { describeSyncError, pushLesson, pushProgress, removeLesson, syncAll } from "@/services/dictationSync";
import { formatTimestamp, mergeIntoSentences, parseSubtitles } from "@/utils/subtitleParser";
import { PASS_THRESHOLD, buildHint, evaluateSegment } from "@/utils/dictationDiff";
import {
  applyCheck,
  applyReveal,
  applyTiming,
  clearScores,
  emptyProgress,
  segmentStatus,
  summarizeLesson,
  type LessonSummary,
  type SegmentStatus,
} from "@/utils/dictationStats";

// ============================================================
// Nghe chép chính tả từ video YouTube: nghe từng câu, gõ lại,
// chấm theo từng từ. Bài mẫu có sẵn + bài tự tạo (link + phụ đề).
// Bài + điểm lưu trên máy (localStorage) và đồng bộ lên vocab-api
// để dùng chung giữa các thiết bị.
// ============================================================

const SPEEDS = [0.5, 0.75, 1, 1.25] as const;
const SPEED_KEY = "dictation:speed";
const MODE_KEY = "dictation:mode";

type PracticeMode = "dictation" | "shadow";

const modeTabCls = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors",
    active
      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
  );
/** Gom nhiều lần bấm kiểm tra liên tiếp thành một lần gửi tiến độ */
const PUSH_DELAY_MS = 2000;

const btnGhost =
  "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30 disabled:pointer-events-none";
const btnPrimary =
  "flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none";
const btnOutline =
  "flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors";
const inputCls =
  "w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500";

const STATUS_CLASS: Record<SegmentStatus, string> = {
  new: "bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-800",
  correct: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  wrong: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
};

/** Link mở DownSub với video này (dùng link watch chuẩn, bỏ &t=, ?si=…) */
function downsubUrl(videoId: string): string {
  return `https://downsub.com/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
}

type SyncStatus = { state: "syncing" } | { state: "ok" } | { state: "error"; message: string };

export function DictationPage() {
  const [params, setParams] = useSearchParams();
  const [customLessons, setCustomLessons] = useState<DictationLesson[]>(() => loadCustomLessons());
  const [progress, setProgress] = useState<DictationProgress>(() => loadProgress());
  const [sync, setSync] = useState<SyncStatus>({ state: "syncing" });

  // Bản mới nhất để gửi lên server sau khi hết thời gian chờ (không phụ thuộc lần render)
  const lessonsRef = useRef(customLessons);
  const progressRef = useRef(progress);
  const pendingDeletesRef = useRef<string[]>(loadPendingDeletes());
  const pushTimers = useRef(new Map<string, number>());

  const lessonId = params.get("lesson");
  const creating = params.get("new") === "1";
  const allLessons = useMemo(() => [...customLessons, ...SAMPLE_DICTATION_LESSONS], [customLessons]);
  const lesson = lessonId ? allLessons.find(l => l.id === lessonId) : undefined;

  const open = (id: string) => setParams({ lesson: id });
  const backToList = () => setParams({});

  const commitLessons = (next: DictationLesson[]) => {
    lessonsRef.current = next;
    setCustomLessons(next);
    saveCustomLessons(next);
  };

  const commitProgress = (next: DictationProgress) => {
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  };

  const commitPendingDeletes = (next: string[]) => {
    pendingDeletesRef.current = next;
    savePendingDeletes(next);
  };

  /** Đồng bộ toàn bộ; trạng thái "đang đồng bộ" do nơi gọi đặt (lúc mở trang là giá trị ban đầu). */
  const doSync = useCallback(async () => {
    try {
      const res = await syncAll({
        lessons: lessonsRef.current,
        progress: progressRef.current,
        pendingDeletes: pendingDeletesRef.current,
      });
      lessonsRef.current = res.lessons;
      progressRef.current = res.progress;
      pendingDeletesRef.current = res.pendingDeletes;
      setCustomLessons(res.lessons);
      setProgress(res.progress);
      saveCustomLessons(res.lessons);
      saveProgress(res.progress);
      savePendingDeletes(res.pendingDeletes);
      setSync({ state: "ok" });
    } catch (e) {
      setSync({ state: "error", message: describeSyncError(e) });
    }
  }, []);

  const runSync = () => {
    setSync({ state: "syncing" });
    void doSync();
  };

  // Đồng bộ khi mở trang
  useEffect(() => {
    void doSync();
  }, [doSync]);

  // Rời trang khi còn tiến độ chưa gửi → gửi luôn
  useEffect(() => {
    const timers = pushTimers.current;
    return () => {
      for (const [key, t] of timers) {
        window.clearTimeout(t);
        const p = progressRef.current[key];
        if (p) void pushProgress(key, p).catch(() => undefined);
      }
      timers.clear();
    };
  }, []);

  const schedulePush = (key: string) => {
    const timers = pushTimers.current;
    window.clearTimeout(timers.get(key));
    timers.set(
      key,
      window.setTimeout(async () => {
        timers.delete(key);
        const sent = progressRef.current[key];
        if (!sent) return;
        try {
          const kept = await pushProgress(key, sent);
          const cur = progressRef.current[key];
          if (kept === null) {
            // Bài đã bị xóa ở thiết bị khác
            const next = { ...progressRef.current };
            delete next[key];
            commitProgress(next);
            commitLessons(lessonsRef.current.filter(l => l.id !== key));
          } else if (kept !== sent && cur === sent) {
            // Server có bản mới hơn (từ thiết bị khác) và trên máy chưa đổi gì thêm → lấy bản server
            commitProgress({ ...progressRef.current, [key]: kept });
          }
          setSync({ state: "ok" });
        } catch (e) {
          setSync({ state: "error", message: describeSyncError(e) });
        }
      }, PUSH_DELAY_MS)
    );
  };

  const updateProgress = (key: string, fn: (p: LessonProgress) => LessonProgress) => {
    const cur = progressRef.current;
    commitProgress({ ...cur, [key]: fn(cur[key] ?? emptyProgress()) });
    schedulePush(key);
  };

  const addLesson = async (l: DictationLesson) => {
    commitLessons([l, ...lessonsRef.current]);
    open(l.id);
    try {
      const synced = await pushLesson(l);
      commitLessons(lessonsRef.current.map(x => (x.id === l.id ? synced : x)));
      setSync({ state: "ok" });
    } catch (e) {
      // Chưa lên được server: lần đồng bộ sau sẽ đẩy tiếp (bài chưa có syncedAt)
      setSync({ state: "error", message: describeSyncError(e) });
    }
  };

  const deleteLesson = async (id: string) => {
    if (!window.confirm("Xóa bài này? Điểm của bài cũng bị xóa (trên mọi thiết bị).")) return;
    const target = lessonsRef.current.find(l => l.id === id);
    commitLessons(lessonsRef.current.filter(l => l.id !== id));
    const nextProgress = { ...progressRef.current };
    delete nextProgress[id];
    commitProgress(nextProgress);
    window.clearTimeout(pushTimers.current.get(id));
    pushTimers.current.delete(id);
    if (!target?.syncedAt) return; // chưa từng lên server
    try {
      await removeLesson(id);
    } catch (e) {
      commitPendingDeletes([...pendingDeletesRef.current, id]);
      setSync({ state: "error", message: describeSyncError(e) });
    }
  };

  let title = "Nghe chép chính tả";
  let subtitle = "Nghe từng câu trong video YouTube, gõ lại và chấm theo từng từ";
  if (creating) {
    title = "Tạo bài từ YouTube";
    subtitle = "Dán link video và phụ đề tiếng Anh";
  } else if (lesson) {
    title = lesson.title;
    subtitle = `${lesson.segments.length} câu`;
  }

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <header className="h-16 flex items-center gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        {(creating || lesson) && (
          <button onClick={backToList} title="Về danh sách bài" className={cn(btnGhost, "w-10 h-10 shrink-0")}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold truncate">{title}</h1>
          <p className="hidden sm:block text-[11px] text-slate-500 truncate">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <SyncBadge status={sync} onRetry={runSync} />
          <ApiSettings onSaved={runSync} />
        </div>
      </header>

      {creating ? (
        <CreateLessonForm onCreated={l => void addLesson(l)} />
      ) : lesson ? (
        <DictationPractice
          key={lesson.id}
          lesson={lesson}
          progress={progress[lesson.id]}
          onUpdate={fn => updateProgress(lesson.id, fn)}
        />
      ) : lessonId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-slate-500">
            {sync.state === "syncing" ? "Đang tải bài từ server…" : "Không tìm thấy bài này (có thể đã bị xóa)."}
          </p>
          <button onClick={backToList} className={cn(btnPrimary, "px-5 py-2.5")}>
            Về danh sách bài
          </button>
        </div>
      ) : (
        <LessonList
          customLessons={customLessons}
          progress={progress}
          onOpen={open}
          onCreate={() => setParams({ new: "1" })}
          onDelete={id => void deleteLesson(id)}
        />
      )}
    </div>
  );
}

function SyncBadge({ status, onRetry }: { status: SyncStatus; onRetry: () => void }) {
  if (status.state === "syncing")
    return (
      <span className="flex items-center gap-1.5 px-2 text-xs text-slate-500" title="Đang đồng bộ với server">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="hidden md:inline">Đang đồng bộ…</span>
      </span>
    );
  if (status.state === "ok")
    return (
      <span className="flex items-center gap-1.5 px-2 text-xs text-emerald-600 dark:text-emerald-400" title="Bài và điểm đã lưu lên server">
        <CloudCheck className="w-4 h-4" />
        <span className="hidden md:inline">Đã đồng bộ</span>
      </span>
    );
  return (
    <button
      onClick={onRetry}
      title={`${status.message}. Bấm để thử lại.`}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
    >
      <CloudOff className="w-4 h-4" />
      <span className="hidden md:inline max-w-56 truncate">{status.message}</span>
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Danh sách bài
// ---------------------------------------------------------------------------

function LessonList({
  customLessons,
  progress,
  onOpen,
  onCreate,
  onDelete,
}: {
  customLessons: DictationLesson[];
  progress: DictationProgress;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const card = (l: DictationLesson, deletable: boolean) => {
    const sum = summarizeLesson(l.segments, progress[l.id]);
    const pctCorrect = sum.total ? (sum.correct / sum.total) * 100 : 0;
    const pctWrong = sum.total ? (sum.wrong / sum.total) * 100 : 0;
    return (
      <div
        key={l.id}
        className="group relative rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 hover:border-blue-500/60 transition-colors"
      >
        <button onClick={() => onOpen(l.id)} className="block w-full text-left">
          <div className="aspect-video bg-slate-200 dark:bg-slate-800">
            <img
              src={`https://i.ytimg.com/vi/${l.videoId}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3 space-y-2">
            <p className="text-sm font-semibold leading-snug line-clamp-2">{l.title}</p>
            <div className="flex h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${pctCorrect}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${pctWrong}%` }} />
            </div>
            <p className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
              <span>
                Đã làm {sum.attempted}/{sum.total} câu
              </span>
              {sum.avgScore !== null && <span>Điểm TB {sum.avgScore}%</span>}
              {sum.wrong > 0 && <span className="text-red-600 dark:text-red-400">{sum.wrong} câu sai</span>}
            </p>
          </div>
        </button>
        {deletable && (
          <button
            onClick={() => onDelete(l.id)}
            title="Xóa bài"
            className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 text-white opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <button onClick={onCreate} className={cn(btnPrimary, "w-full sm:w-auto px-5 py-3")}>
          <Video className="w-4 h-4" />
          Tạo bài từ link YouTube
        </button>

        {customLessons.length > 0 && (
          <section className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Bài của bạn</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {customLessons.map(l => card(l, true))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Bài mẫu</p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_DICTATION_LESSONS.map(l => card(l, false))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tạo bài
// ---------------------------------------------------------------------------

function CreateLessonForm({ onCreated }: { onCreated: (l: DictationLesson) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subs, setSubs] = useState("");
  const [merge, setMerge] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const videoId = extractVideoId(url);

  const preview = useMemo(() => {
    if (!subs.trim()) return null;
    try {
      const parsed = parseSubtitles(subs);
      const segments = merge ? mergeIntoSentences(parsed.segments) : parsed.segments;
      return { ok: true as const, format: parsed.format, segments };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
  }, [subs, merge]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setSubs(await readSubtitleFile(file));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async () => {
    if (!preview?.ok) return;
    setBusy(true);
    setError(null);
    try {
      onCreated(await createLesson({ url, segments: preview.segments, title }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const formatLabel = { srt: "SRT", vtt: "WebVTT", youtube: "Bản chép lời YouTube" } as const;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Link YouTube</span>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputCls}
          />
        </label>
        {url.trim() && !videoId && <p className="text-xs text-red-500">Không đọc được video id từ link này.</p>}
        {videoId && (
          <div className="flex items-center gap-3">
            <img
              src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
              alt=""
              className="w-32 aspect-video rounded-lg object-cover bg-slate-200 dark:bg-slate-800"
            />
            <div className="min-w-0 space-y-1.5">
              <span className="block text-xs text-slate-500 font-mono">{videoId}</span>
              <a
                href={downsubUrl(videoId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <FileDown className="w-4 h-4" />
                Tải phụ đề video này trên DownSub
              </a>
              <p className="text-[11px] text-slate-500">Tải file .SRT tiếng Anh, rồi bấm "Tải file" bên dưới.</p>
            </div>
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            Tên bài <span className="text-slate-500 font-normal">(bỏ trống = lấy tiêu đề video)</span>
          </span>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
        </label>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-medium">Phụ đề tiếng Anh</span>
            <button onClick={() => fileRef.current?.click()} className={cn(btnGhost, "px-3 py-1.5")}>
              <FileUp className="w-4 h-4" />
              Tải file .srt / .vtt
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".srt,.vtt,.txt,text/vtt,text/plain"
              className="hidden"
              onChange={e => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={subs}
            onChange={e => setSubs(e.target.value)}
            rows={10}
            placeholder={"Dán phụ đề vào đây. Ví dụ bản chép lời YouTube:\n\n0:01\nAll right, so here we are\n0:04\nin front of the elephants"}
            className={cn(inputCls, "py-3 font-mono text-xs leading-relaxed resize-y scrollbar-thin")}
          />
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
              Lấy phụ đề ở đâu?
            </summary>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>
                Trên YouTube (máy tính): mở video → bấm vào <b>phần mô tả</b> dưới tiêu đề (chữ <b>…thêm</b>).
              </li>
              <li>
                Kéo xuống <b>cuối phần mô tả</b> → bấm <b>Hiện bản chép lời</b> (Show transcript). Chỉ video có phụ đề
                mới có nút này.
              </li>
              <li>Bôi đen toàn bộ khung bản chép lời bên phải (có cả mốc thời gian), copy và dán vào ô trên.</li>
              <li>Hoặc bấm link <b>DownSub</b> hiện ra sau khi dán link video, tải file .srt rồi bấm "Tải file".</li>
            </ol>
          </details>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={merge}
            onChange={e => setMerge(e.target.checked)}
            className="accent-blue-600"
          />
          Gộp các dòng phụ đề ngắn thành câu hoàn chỉnh
        </label>

        {preview &&
          (preview.ok ? (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                {formatLabel[preview.format]} · {preview.segments.length} câu
              </p>
              <ul className="rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 max-h-64 overflow-y-auto scrollbar-thin">
                {preview.segments.slice(0, 50).map(s => (
                  <li key={s.id} className="flex gap-3 px-3 py-2 text-xs">
                    <span className="font-mono text-slate-500 shrink-0 tabular-nums">{formatTimestamp(s.start)}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
                {preview.segments.length > 50 && (
                  <li className="px-3 py-2 text-xs text-slate-500">… +{preview.segments.length - 50} câu</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {preview.message}
            </div>
          ))}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={() => void submit()}
          disabled={!videoId || !preview?.ok || busy}
          className={cn(btnPrimary, "w-full px-5 py-3")}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
          Tạo bài và bắt đầu
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Luyện nghe-chép
// ---------------------------------------------------------------------------

function DictationPractice({
  lesson,
  progress,
  onUpdate,
}: {
  lesson: DictationLesson;
  progress: LessonProgress | undefined;
  onUpdate: (fn: (p: LessonProgress) => LessonProgress) => void;
}) {
  const stats = progress?.segments ?? {};
  const overrides = progress?.timing;
  const onCheck = (segmentId: string, ev: SegmentEvaluation, firstInRound: boolean, revealedInRound: boolean) =>
    onUpdate(p => applyCheck(p, segmentId, ev, firstInRound, revealedInRound));
  const onReveal = (segmentId: string) => onUpdate(p => applyReveal(p, segmentId));
  const onResetProgress = () => onUpdate(clearScores);
  const onTimingChange = (seg: DictationSegment) => onUpdate(p => applyTiming(p, seg));

  const segments = useMemo(
    () => lesson.segments.map(s => (overrides?.[s.id] ? { ...s, ...overrides[s.id] } : s)),
    [lesson.segments, overrides]
  );

  // Mở bài: vào câu đầu tiên chưa làm hoặc đang sai
  const [index, setIndex] = useState(() => {
    const i = lesson.segments.findIndex(s => segmentStatus(stats[s.id]) !== "correct");
    return i < 0 ? 0 : i;
  });
  /** Chế độ ôn: danh sách id câu sai, chụp lại lúc bắt đầu ôn (để câu không biến mất khi vừa làm đúng). */
  const [reviewIds, setReviewIds] = useState<string[] | null>(null);
  // Trạng thái của lượt học hiện tại — chưa có results[id] nghĩa là chưa kiểm tra lần nào trong lượt này
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SegmentEvaluation>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hintLevel, setHintLevel] = useState<Record<string, 0 | 1 | 2>>({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [speed, setSpeed] = useState<number>(() => {
    const n = Number(window.localStorage.getItem(SPEED_KEY));
    return (SPEEDS as readonly number[]).includes(n) ? n : 1;
  });
  const [playing, setPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [mode, setMode] = useState<PracticeMode>(() =>
    window.localStorage.getItem(MODE_KEY) === "shadow" ? "shadow" : "dictation"
  );

  const playerRef = useRef<YouTubePlayerHandle>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** Chế độ Shadowing đặt hàm xử lý "hết câu" vào đây */
  const segmentEndRef = useRef<(() => void) | null>(null);

  const changeMode = (m: PracticeMode) => {
    if (m === mode) return;
    playerRef.current?.pause();
    setMode(m);
    window.localStorage.setItem(MODE_KEY, m);
  };

  const seg = segments[index];
  const typed = inputs[seg.id] ?? "";
  const result = results[seg.id];
  const isRevealed = !!revealed[seg.id];
  const solved = isRevealed || !!result?.isPassed;
  const hint = hintLevel[seg.id] ?? 0;
  const segStats = stats[seg.id];

  const summary = useMemo(() => summarizeLesson(segments, progress), [segments, progress]);

  // Các câu đang luyện (cả bài hoặc chỉ câu sai) — điều hướng trước/sau đi trong danh sách này
  const activeIndices = useMemo(() => {
    if (!reviewIds) return segments.map((_, i) => i);
    const set = new Set(reviewIds);
    return segments.flatMap((s, i) => (set.has(s.id) ? [i] : []));
  }, [segments, reviewIds]);
  const nextIndex = activeIndices.find(i => i > index);
  const prevIndex = [...activeIndices].reverse().find(i => i < index);
  const isLastInRound = nextIndex === undefined;

  const play = (s: DictationSegment = seg) => {
    playerRef.current?.playSegment(s.start, s.end);
    inputRef.current?.focus();
  };

  const goTo = (i: number | undefined) => {
    if (i === undefined) return;
    const target = segments[Math.max(0, Math.min(i, segments.length - 1))];
    setIndex(segments.indexOf(target));
    play(target);
  };

  /** Bắt đầu lượt mới cho các câu `ids`: xóa bài làm/kết quả của lượt trước. */
  const startRound = (ids: string[] | null) => {
    const keep = <T,>(m: Record<string, T>) =>
      ids ? Object.fromEntries(Object.entries(m).filter(([k]) => !ids.includes(k))) : {};
    setInputs(keep);
    setResults(keep);
    setRevealed(keep);
    setHintLevel(keep);
    setReviewIds(ids);
    const first = ids ? segments.findIndex(s => ids.includes(s.id)) : 0;
    goTo(first < 0 ? 0 : first);
  };

  const wrongIds = segments.filter(s => segmentStatus(stats[s.id]) === "wrong").map(s => s.id);

  const check = () => {
    if (!typed.trim()) return;
    const ev = evaluateSegment(seg.text, typed);
    onCheck(seg.id, ev, !result, isRevealed);
    setResults(r => ({ ...r, [seg.id]: ev }));
  };

  const reveal = () => {
    if (isRevealed) return;
    setRevealed(r => ({ ...r, [seg.id]: true }));
    onReveal(seg.id);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    window.localStorage.setItem(SPEED_KEY, String(s));
  };

  const nudge = (dStart: number, dEnd: number) => {
    const next = shiftSegment(seg, dStart, dEnd);
    onTimingChange(next);
    play(next);
  };

  // Phím tắt toàn trang: Ctrl+Space nghe lại, Alt+←/→ đổi câu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== "dictation") return; // Shadowing có phím tắt riêng
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        playerRef.current?.playSegment(seg.start, seg.end);
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goTo(nextIndex);
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(prevIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onInputKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (solved && !isLastInRound) goTo(nextIndex);
      else if (!solved) check();
    }
  };

  const timingControls = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
      <span title="Bấm +/− nếu câu bị cắt hụt hoặc lẫn tiếng câu khác">Mốc câu này:</span>
      <TimeNudge label="Đầu" value={seg.start} onMinus={() => nudge(-0.5, 0)} onPlus={() => nudge(0.5, 0)} />
      <TimeNudge label="Cuối" value={seg.end} onMinus={() => nudge(0, -0.5)} onPlus={() => nudge(0, 0.5)} />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-4 pb-4 lg:p-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {/* ---------- Video — dính đầu màn hình trên điện thoại ---------- */}
        <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-2 space-y-2 bg-slate-100 dark:bg-[#0b1120] border-b border-slate-300/60 dark:border-slate-800/60 lg:static lg:mx-0 lg:p-0 lg:border-0 lg:bg-transparent lg:col-start-1 lg:row-start-1">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <YouTubePlayer
              ref={playerRef}
              videoId={lesson.videoId}
              playbackRate={speed}
              onPlayingChange={setPlaying}
              onSegmentEnd={() => segmentEndRef.current?.()}
              onError={setPlayerError}
              className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full"
            />
          </div>
          {playerError && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {playerError}{" "}
                <a href={lesson.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  Mở trên YouTube
                </a>
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-900 text-xs">
              <button onClick={() => changeMode("dictation")} className={modeTabCls(mode === "dictation")}>
                <PencilLine className="w-3.5 h-3.5" />
                Chép chính tả
              </button>
              <button onClick={() => changeMode("shadow")} className={modeTabCls(mode === "shadow")}>
                <AudioLines className="w-3.5 h-3.5" />
                Shadowing
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Tốc độ</span>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg border tabular-nums transition-colors",
                    s === speed
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 dark:border-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === "shadow" ? (
          <ShadowingPanel
            className="lg:col-start-2 lg:row-start-1 lg:row-span-2"
            segments={segments}
            index={index}
            onIndexChange={setIndex}
            playerRef={playerRef}
            playing={playing}
            speed={speed}
            segmentEndRef={segmentEndRef}
            timingControls={timingControls}
          />
        ) : (
          <>
            {/* ---------- Nghe & chép ---------- */}
            <div className="space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    Câu {index + 1}
                    <span className="text-slate-500 font-normal">/{segments.length}</span>
                    {reviewIds && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-400 text-[11px] font-semibold">
                        Đang ôn câu sai
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {formatTimestamp(seg.start)} – {formatTimestamp(seg.end)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => play()} title="Nghe câu này (Ctrl+Space)" className={cn(btnPrimary, "flex-1 px-4 py-3")}>
                    <Volume2 className={cn("w-5 h-5", playing && "animate-pulse")} />
                    {playing ? "Đang phát…" : "Nghe"}
                  </button>
                  <button
                    onClick={() => goTo(prevIndex)}
                    disabled={prevIndex === undefined}
                    title="Câu trước (Alt+←)"
                    className={cn(btnGhost, "w-11 h-11")}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => goTo(nextIndex)}
                    disabled={nextIndex === undefined}
                    title="Câu tiếp (Alt+→)"
                    className={cn(btnGhost, "w-11 h-11")}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <textarea
                  ref={inputRef}
                  value={typed}
                  onChange={e => setInputs(m => ({ ...m, [seg.id]: e.target.value }))}
                  onKeyDown={onInputKey}
                  rows={3}
                  autoFocus
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder="Gõ lại những gì bạn nghe được… (Enter để kiểm tra)"
                  className={cn(inputCls, "py-3 text-base leading-relaxed resize-y")}
                />

                {hint > 0 && !solved && (
                  <p className="text-sm font-mono tracking-wide text-slate-500 bg-slate-100 dark:bg-slate-800/60 rounded-lg px-3 py-2 break-words">
                    {buildHint(seg.text, typed, hint === 1 ? 1 : 2)}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={check} disabled={!typed.trim() || solved} className={cn(btnPrimary, "px-4 py-2")}>
                    <Check className="w-4 h-4" />
                    Kiểm tra
                  </button>
                  <button
                    onClick={() => setHintLevel(h => ({ ...h, [seg.id]: hint >= 2 ? 2 : ((hint + 1) as 1 | 2) }))}
                    disabled={solved || hint >= 2}
                    className={cn(btnGhost, "px-3 py-2")}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Gợi ý{hint > 0 ? ` (${hint}/2)` : ""}
                  </button>
                  <button
                    onClick={reveal}
                    disabled={isRevealed}
                    title="Câu này sẽ bị tính là sai"
                    className={cn(btnGhost, "px-3 py-2")}
                  >
                    <Eye className="w-4 h-4" />
                    Xem đáp án
                  </button>
                  {segStats && (
                    <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
                      {segStats.attempts} lần thử · cao nhất {segStats.best}%
                    </span>
                  )}
                </div>

                {result && <ResultView result={result} showAnswer={solved} />}

                {solved && (
                  <div className="space-y-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 px-4 py-3">
                    <p className="text-base leading-relaxed">{seg.text}</p>
                    {seg.translation &&
                      (showTranslation ? (
                        <p className="text-sm text-slate-500 italic">{seg.translation}</p>
                      ) : (
                        <button
                          onClick={() => setShowTranslation(true)}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          Xem nghĩa tiếng Việt
                        </button>
                      ))}
                  </div>
                )}

                {solved && !isLastInRound && (
                  <button onClick={() => goTo(nextIndex)} className={cn(btnPrimary, "w-full px-4 py-3")}>
                    Câu tiếp
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              {solved && isLastInRound && (
                <RoundSummary
                  summary={summary}
                  reviewing={!!reviewIds}
                  wrongCount={wrongIds.length}
                  onReviewWrong={() => startRound(wrongIds)}
                  onRestart={() => startRound(null)}
                />
              )}

              <p className="hidden md:block text-[11px] text-slate-500 leading-relaxed">
                Phím tắt: <b>Enter</b> kiểm tra / sang câu tiếp · <b>Ctrl+Space</b> nghe lại · <b>Alt+←/→</b> đổi câu.
                Không phân biệt hoa/thường và dấu câu. Lần kiểm tra <b>đầu tiên</b> đạt từ {PASS_THRESHOLD}% mới tính là
                đúng; xem đáp án tính là sai.
              </p>
            </div>

            {/* ---------- Thống kê + danh sách câu ---------- */}
            <div className="space-y-4 lg:col-start-1 lg:row-start-2">
              {timingControls}
              <StatsPanel summary={summary} />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-900">
                    <button
                      onClick={() => reviewIds && startRound(null)}
                      className={cn("px-2.5 py-1 rounded-md", !reviewIds && "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm")}
                    >
                      Tất cả ({segments.length})
                    </button>
                    <button
                      onClick={() => wrongIds.length > 0 && startRound(wrongIds)}
                      disabled={!reviewIds && wrongIds.length === 0}
                      className={cn(
                        "px-2.5 py-1 rounded-md disabled:opacity-40",
                        reviewIds && "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                      )}
                    >
                      Ôn câu sai ({reviewIds ? reviewIds.length : wrongIds.length})
                    </button>
                  </div>
                  {summary.attempted > 0 && (
                    <button
                      onClick={() => {
                        if (!window.confirm("Xóa toàn bộ điểm và thống kê của bài này?")) return;
                        onResetProgress();
                        startRound(null);
                      }}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Xóa điểm
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {segments.map((s, i) => {
                    const st = stats[s.id];
                    const inRound = activeIndices.includes(i);
                    return (
                      <button
                        key={s.id}
                        onClick={() => goTo(i)}
                        title={
                          `${formatTimestamp(s.start)}` +
                          (st ? ` · lần đầu ${st.revealed ? "xem đáp án" : `${st.roundScore ?? "-"}%`} · ${st.attempts} lần thử` : "")
                        }
                        className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-lg border text-xs font-semibold tabular-nums transition-colors",
                          STATUS_CLASS[segmentStatus(st)],
                          i === index && "ring-2 ring-blue-500",
                          !inRound && "opacity-30"
                        )}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <p className="flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                  <Legend cls={STATUS_CLASS.correct} label="Đúng ngay lần đầu" />
                  <Legend cls={STATUS_CLASS.wrong} label="Sai / xem đáp án" />
                  <Legend cls={STATUS_CLASS.new} label="Chưa làm" />
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("inline-block w-3 h-3 rounded border", cls)} />
      {label}
    </span>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "bad" && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatsPanel({ summary }: { summary: LessonSummary }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="Điểm TB (lần đầu)" value={summary.avgScore === null ? "–" : `${summary.avgScore}%`} />
        <StatTile label="Đúng ngay" value={`${summary.correct}/${summary.total}`} tone="good" />
        <StatTile label="Câu sai" value={String(summary.wrong)} tone={summary.wrong ? "bad" : undefined} />
        <StatTile label="Lượt kiểm tra" value={String(summary.totalAttempts)} />
      </div>
      {summary.topWrongWords.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-500">Từ hay nghe sai</p>
          <div className="flex flex-wrap gap-1.5">
            {summary.topWrongWords.map(w => (
              <span
                key={w.word}
                className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300"
              >
                {w.word}
                {w.count > 1 && <span className="ml-1 opacity-60">×{w.count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoundSummary({
  summary,
  reviewing,
  wrongCount,
  onReviewWrong,
  onRestart,
}: {
  summary: LessonSummary;
  reviewing: boolean;
  wrongCount: number;
  onReviewWrong: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 md:p-5 space-y-3">
      <p className="text-sm font-semibold">{reviewing ? "Hết lượt ôn câu sai" : "Hết bài"}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Đúng ngay {summary.correct}/{summary.total} câu
        {summary.avgScore !== null && <> · điểm TB {summary.avgScore}%</>}
        {wrongCount > 0 ? (
          <>
            {" "}
            · còn <b className="text-red-600 dark:text-red-400">{wrongCount} câu sai</b>
          </>
        ) : (
          " · không còn câu sai 🎉"
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {wrongCount > 0 && (
          <button onClick={onReviewWrong} className={cn(btnPrimary, "px-4 py-2.5")}>
            <ListRestart className="w-4 h-4" />
            Ôn lại {wrongCount} câu sai
          </button>
        )}
        <button onClick={onRestart} className={cn(btnOutline, "px-4 py-2.5")}>
          <RotateCcw className="w-4 h-4" />
          Làm lại cả bài
        </button>
      </div>
    </div>
  );
}

function TimeNudge({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <span className="flex items-center gap-1">
      {label}
      <button onClick={onMinus} title="Lùi 0.5s" className={cn(btnGhost, "w-6 h-6")}>
        <Minus className="w-3 h-3" />
      </button>
      <span className="font-mono tabular-nums w-12 text-center">{value.toFixed(1)}s</span>
      <button onClick={onPlus} title="Tới 0.5s" className={cn(btnGhost, "w-6 h-6")}>
        <Plus className="w-3 h-3" />
      </button>
    </span>
  );
}

function ResultView({ result, showAnswer }: { result: SegmentEvaluation; showAnswer: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "px-2 py-0.5 rounded-md text-xs font-bold tabular-nums",
            result.isPassed
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          )}
        >
          {result.accuracy}%
        </span>
        <span className="text-xs text-slate-500">
          Đúng {result.correctWords}/{result.totalExpectedWords} từ
          {!result.isPassed && " — nghe lại và sửa nhé"}
        </span>
      </div>
      <p className="text-base leading-loose flex flex-wrap gap-x-1.5">
        {result.diff.map((d, i) => {
          if (d.status === "correct")
            return (
              <span key={i} className="text-emerald-600 dark:text-emerald-400">
                {d.word}
              </span>
            );
          if (d.status === "extra")
            return (
              <span key={i} className="text-slate-400 line-through" title="Từ thừa">
                {d.word}
              </span>
            );
          if (d.status === "missing")
            return (
              <span key={i} className="text-amber-600 dark:text-amber-400" title="Còn thiếu từ">
                {showAnswer ? d.expected : "_".repeat(Math.min(8, d.expected?.length ?? 3))}
              </span>
            );
          return (
            <span key={i} title="Sai từ">
              <span className="text-red-500 line-through">{d.word}</span>
              {showAnswer && <span className="ml-1 text-emerald-600 dark:text-emerald-400">{d.expected}</span>}
            </span>
          );
        })}
      </p>
    </div>
  );
}
