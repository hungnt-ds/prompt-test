import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  FolderOpen,
  Layers,
  ListChecks,
  Ear,
  Keyboard,
  Link2,
  Shuffle,
  BookOpenText,
  MessageSquareQuote,
  PencilLine,
  Star,
  Flame,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiSettings } from "@/components/ApiSettings";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";
import { FlashcardSession } from "@/components/practice/FlashcardSession";
import { QuizSession } from "@/components/practice/QuizSession";
import {
  listTags,
  listCollections,
  practiceFlashcards,
  practiceQuiz,
  practiceAnswer,
  POS_VALUES,
  type WordFilter,
  type QuizKind,
  type Word,
  type PracticeQuestion,
  type PracticeResult,
  type PracticeAnswerResult,
  type Tag,
  type Collection,
} from "@/services/vocabApi";

type Mode = "flashcards" | QuizKind;

const MODES: { mode: Mode; label: string; desc: string; icon: typeof Layers }[] = [
  { mode: "flashcards", label: "Lật thẻ", desc: "Xem từ, lật ra nghĩa, tự chấm 4 mức", icon: Layers },
  { mode: "word-to-meaning", label: "Từ → Nghĩa", desc: "Nhìn từ, chọn nghĩa đúng", icon: BookOpenText },
  { mode: "meaning-to-word", label: "Nghĩa → Từ", desc: "Nhìn nghĩa, chọn từ đúng", icon: ListChecks },
  { mode: "context-choice", label: "Ngữ cảnh", desc: "Chọn từ bị che trong câu ví dụ", icon: MessageSquareQuote },
  { mode: "listen-type", label: "Nghe – gõ", desc: "Nghe phát âm rồi gõ lại từ", icon: Ear },
  { mode: "type-word", label: "Gõ từ", desc: "Nhìn nghĩa, gõ từ tiếng Anh", icon: Keyboard },
  { mode: "type-meaning", label: "Gõ nghĩa", desc: "Nhìn từ, gõ nghĩa (chấm lỏng)", icon: PencilLine },
  { mode: "matching", label: "Nối từ – nghĩa", desc: "Ghép 2 cột từ và nghĩa", icon: Link2 },
  { mode: "mixed", label: "Trộn các dạng", desc: "Random mỗi câu một dạng", icon: Shuffle },
];

type Phase =
  | { name: "setup" }
  | { name: "loading" }
  | { name: "flashcards"; words: Word[] }
  | { name: "quiz"; questions: PracticeQuestion[] }
  | { name: "done"; results: PracticeResult[] };

export function PracticePage() {
  const [mode, setMode] = useState<Mode>("flashcards");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPos, setSelectedPos] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [difficult, setDifficult] = useState(false);
  const [countInput, setCountInput] = useState("10");
  const [tags, setTags] = useState<Tag[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [error, setError] = useState<string | null>(null);

  // Phạm vi collection truyền qua URL: /vocab/practice?collections=1,2
  const [searchParams] = useSearchParams();
  const collectionIds = useMemo(
    () =>
      (searchParams.get("collections") ?? "")
        .split(",")
        .map(s => Number(s.trim()))
        .filter(n => Number.isInteger(n) && n > 0),
    [searchParams]
  );
  const [allCollections, setAllCollections] = useState<Collection[]>([]);

  useEffect(() => {
    void listTags("word").then(setTags).catch(() => {});
  }, []);

  // Tên các bộ đang giới hạn — để hiện rõ đang luyện trong phạm vi nào.
  useEffect(() => {
    if (collectionIds.length === 0) return;
    let cancelled = false;
    void listCollections({ limit: 100 })
      .then(r => {
        if (!cancelled) setAllCollections(r.collections);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [collectionIds]);

  const scopeInfo = useMemo(
    () => allCollections.filter(c => collectionIds.includes(c.id)),
    [allCollections, collectionIds]
  );

  const filter = useMemo<WordFilter>(() => {
    const f: WordFilter = {};
    if (collectionIds.length) {
      f.collectionIds = collectionIds; // PHẠM VI (AND) — gồm cả nhánh con
      f.includeSubcollections = true;
    }
    if (selectedTags.length) f.tags = selectedTags;
    if (selectedPos.length) f.pos = selectedPos;
    if (favorite) f.favorite = true;
    if (difficult) f.difficult = true;
    return f;
  }, [collectionIds, selectedTags, selectedPos, favorite, difficult]);

  // Giới hạn theo API: flashcards ≤ 200, quiz ≤ 50
  const maxCount = mode === "flashcards" ? 200 : 50;
  const clampCount = (raw: string) => {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) return 10;
    return Math.min(n, maxCount);
  };

  const start = async () => {
    const count = clampCount(countInput);
    setCountInput(String(count));
    setError(null);
    setPhase({ name: "loading" });
    try {
      if (mode === "flashcards") {
        const { items } = await practiceFlashcards(filter, count);
        if (items.length === 0) throw new Error("Không có từ nào khớp bộ lọc.");
        setPhase({ name: "flashcards", words: items });
      } else {
        const { questions } = await practiceQuiz(mode, count, filter);
        if (questions.length === 0) throw new Error("Không sinh được câu hỏi nào từ bộ lọc này.");
        setPhase({ name: "quiz", questions });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase({ name: "setup" });
    }
  };

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const wordTags = tags;

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/vocab"
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Luyện tập từ vựng</h1>
            <p className="hidden sm:block text-[11px] text-slate-500">
              Lật thẻ &amp; quiz sinh từ kho từ — kết quả được ghi vào lịch ôn FSRS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <VoiceSettings />
          <ApiSettings />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          {phase.name === "setup" && (
            <div className="space-y-8">
              {error && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Chọn chế độ */}
              <section className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Chế độ học</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODES.map(({ mode: m, label, desc, icon: Icon }) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                        mode === m
                          ? "border-blue-600 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-600 dark:text-white"
                          : "border-slate-300/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-500 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-bold leading-tight">{label}</span>
                      <span className={cn("text-[10px] leading-snug", mode === m ? "text-blue-100" : "text-slate-500")}>
                        {desc}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Bộ lọc OR */}
              <section className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Phạm vi từ</h2>
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">
                    khớp bất kỳ điều kiện nào (OR) — bỏ trống = toàn bộ kho từ
                  </span>
                </div>

                {/* Phạm vi collection (AND) đến từ màn thư mục */}
                {collectionIds.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-500/40 bg-blue-500/5 px-3 py-2">
                    <FolderOpen className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="text-blue-700 dark:text-blue-300 font-semibold">
                        Giới hạn trong {collectionIds.length} bộ đã chọn (gồm cả thư mục con)
                      </p>
                      <p className="text-slate-500 truncate">
                        {scopeInfo.length > 0
                          ? scopeInfo.map(c => c.title).join(" · ")
                          : collectionIds.join(", ")}
                      </p>
                    </div>
                    <Link to="/vocab/practice" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0">
                      Bỏ giới hạn
                    </Link>
                  </div>
                )}
                {wordTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {wordTags.map(t => (
                      <button
                        key={t.id}
                        onClick={() => toggle(selectedTags, setSelectedTags, t.name)}
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-xs transition-colors",
                          selectedTags.includes(t.name)
                            ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-600"
                        )}
                      >
                        {t.label || t.name} <span className="opacity-50">{t.usageCount}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {POS_VALUES.map(p => (
                    <button
                      key={p}
                      onClick={() => toggle(selectedPos, setSelectedPos, p)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-xs font-mono transition-colors",
                        selectedPos.includes(p)
                          ? "border-purple-500/60 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                          : "border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-500 dark:hover:border-slate-600"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFavorite(v => !v)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors",
                      favorite
                        ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
                        : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-600"
                    )}
                  >
                    <Star className={cn("w-3.5 h-3.5", favorite && "fill-current")} /> Yêu thích
                  </button>
                  <button
                    onClick={() => setDifficult(v => !v)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors",
                      difficult
                        ? "border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300"
                        : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-600"
                    )}
                  >
                    <Flame className="w-3.5 h-3.5" /> Từ khó
                  </button>
                </div>
              </section>

              {/* Số câu + bắt đầu */}
              <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <label className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 focus-within:border-blue-500 dark:focus-within:border-blue-500">
                  <input
                    type="number"
                    min={1}
                    max={maxCount}
                    value={countInput}
                    onChange={e => setCountInput(e.target.value)}
                    onBlur={() => setCountInput(String(clampCount(countInput)))}
                    className="w-16 bg-transparent text-sm text-slate-900 dark:text-slate-100 text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">
                    {mode === "matching" ? "cặp" : mode === "flashcards" ? "thẻ" : "câu"}
                    <span className="text-slate-400 dark:text-slate-600"> · tối đa {maxCount}</span>
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setCountInput(String(Math.min(n, maxCount)))}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg border text-xs transition-colors",
                        Number(countInput) === n
                          ? "border-blue-600 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-600 dark:text-white font-semibold"
                          : "border-slate-300 dark:border-slate-800 text-slate-500 hover:border-slate-500 dark:hover:border-slate-600"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void start()}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 active:scale-[0.99] transition-all"
                >
                  Bắt đầu luyện
                </button>
              </section>
            </div>
          )}

          {phase.name === "loading" && (
            <div className="flex items-center justify-center gap-2 py-24 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang chuẩn bị…
            </div>
          )}

          {phase.name === "flashcards" && (
            <FlashcardSession words={phase.words} onFinish={results => setPhase({ name: "done", results })} />
          )}

          {phase.name === "quiz" && (
            <QuizSession questions={phase.questions} onFinish={results => setPhase({ name: "done", results })} />
          )}

          {phase.name === "done" && (
            <SessionSummary results={phase.results} onAgain={() => setPhase({ name: "setup" })} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Tổng kết buổi luyện + ghi kết quả vào lịch ôn FSRS (POST /api/practice/answer). */
function SessionSummary({ results, onAgain }: { results: PracticeResult[]; onAgain: () => void }) {
  const [saved, setSaved] = useState<PracticeAnswerResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const correct = results.filter(r => r.correct).length;

  useEffect(() => {
    if (savingRef.current || results.length === 0) return;
    savingRef.current = true;
    practiceAnswer(results)
      .then(setSaved)
      .catch(e => setSaveError(e instanceof Error ? e.message : String(e)));
  }, [results]);

  const retrySave = () => {
    setSaveError(null);
    practiceAnswer(results)
      .then(setSaved)
      .catch(e => setSaveError(e instanceof Error ? e.message : String(e)));
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 text-center py-8">
      <div className="space-y-2">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {correct}/{results.length} đúng
        </h2>
        <p className="text-sm text-slate-500">Hoàn thành buổi luyện!</p>
      </div>

      {/* Trạng thái ghi FSRS */}
      {saved ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2">
          <CalendarClock className="w-4 h-4 shrink-0" />
          Đã ghi {saved.summary.answered} lượt vào lịch ôn — từ sẽ tự hẹn ôn lại đúng thời điểm.
        </div>
      ) : saveError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 space-y-2">
          <p>Chưa ghi được kết quả vào lịch ôn: {saveError}</p>
          <button onClick={retrySave} className="text-xs font-semibold underline hover:text-red-800 dark:hover:text-red-200">
            Thử ghi lại
          </button>
        </div>
      ) : results.length > 0 ? (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang ghi kết quả vào lịch ôn…
        </div>
      ) : null}

      <button
        onClick={onAgain}
        className="mx-auto flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 active:scale-95 transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        Luyện tiếp
      </button>
    </div>
  );
}
