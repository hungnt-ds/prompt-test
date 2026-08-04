import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { getExercise, type Exercise, type Question } from "@/services/vocabApi";
import { useExerciseProgress } from "@/hooks/useExerciseProgress";
import { DialogueRunner } from "@/components/exercises/DialogueRunner";
import {
  initialDialogueState,
  isDialogueDone,
  type DialogueState,
} from "@/components/exercises/dialogueState";

// ---------- Answer state ----------
// mcq:   selected option id
// cloze: text per blank number
interface McqAnswer {
  kind: "mcq";
  optionId: number | null;
}
interface ClozeAnswerState {
  kind: "cloze";
  blanks: Record<number, string>;
}
/** dialogue: người học tự viết câu trả lời của mình, không chấm đúng/sai. */
interface DialogueAnswerState extends DialogueState {
  kind: "dialogue";
}
type AnswerState = McqAnswer | ClozeAnswerState | DialogueAnswerState;

/** Spec: so đáp án không phân biệt hoa thường, bỏ khoảng trắng thừa. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function emptyAnswer(q: Question): AnswerState {
  if (q.type === "mcq") return { kind: "mcq", optionId: null };
  if (q.type === "dialogue") return { kind: "dialogue", ...initialDialogueState(q.turns ?? []) };
  return { kind: "cloze", blanks: {} };
}

function isAnswered(q: Question, a: AnswerState): boolean {
  if (a.kind === "mcq") return a.optionId !== null;
  // Dialogue: "đã làm" khi đi hết hội thoại.
  if (a.kind === "dialogue") return isDialogueDone(q.turns ?? [], a);
  const blanks = (q.clozeAnswers ?? []).map(c => c.blank);
  return blanks.length > 0 && blanks.every(b => (a.blanks[b] ?? "").trim().length > 0);
}

function isBlankCorrect(q: Question, a: ClozeAnswerState, blank: number): boolean {
  const spec = (q.clozeAnswers ?? []).find(c => c.blank === blank);
  if (!spec) return false;
  const typed = normalize(a.blanks[blank] ?? "");
  return spec.accepted.some(acc => normalize(acc) === typed);
}

function isCorrect(q: Question, a: AnswerState): boolean {
  if (a.kind === "mcq") {
    const opt = (q.options ?? []).find(o => o.id === a.optionId);
    return !!opt?.isCorrect;
  }
  if (a.kind === "dialogue") return false; // không chấm tự động
  return (q.clozeAnswers ?? []).every(c => isBlankCorrect(q, a, c.blank));
}

/** Câu dialogue không tính vào điểm. */
function isGraded(q: Question): boolean {
  return q.type !== "dialogue";
}

/** Split a cloze prompt into text segments and blank slots ({{1}}, {{2}}…). */
function splitClozePrompt(prompt: string): ({ text: string } | { blank: number })[] {
  const parts: ({ text: string } | { blank: number })[] = [];
  const re = /\{\{(\d+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt)) !== null) {
    if (m.index > last) parts.push({ text: prompt.slice(last, m.index) });
    parts.push({ blank: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < prompt.length) parts.push({ text: prompt.slice(last) });
  return parts;
}

export function ExerciseDoPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const [loaded, setLoaded] = useState<{ id: number; exercise?: Exercise; error?: string } | null>(null);

  useEffect(() => {
    if (!Number.isInteger(numericId)) return;
    let cancelled = false;
    getExercise(numericId)
      .then(exercise => {
        if (!cancelled) setLoaded({ id: numericId, exercise });
      })
      .catch(e => {
        if (!cancelled) setLoaded({ id: numericId, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [numericId]);

  if (!Number.isInteger(numericId) || (loaded?.id === numericId && loaded.error)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">{loaded?.error ?? `Bài tập "${id}" không hợp lệ.`}</p>
        <Link to="/exercises/all" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Quay lại danh sách bài tập
        </Link>
      </div>
    );
  }

  if (!loaded || loaded.id !== numericId || !loaded.exercise) {
    return (
      <div className="h-screen flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#0b1120] text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải bài tập…
      </div>
    );
  }

  // `key` resets all answer state when navigating between exercises.
  return <ExerciseRunner key={numericId} exercise={loaded.exercise} />;
}

function ExerciseRunner({ exercise }: { exercise: Exercise }) {
  const questions = exercise.questions;
  const [answers, setAnswers] = useState<AnswerState[]>(() => questions.map(emptyAnswer));
  const [submitted, setSubmitted] = useState(false);
  const { bookmarks, toggleBookmark, saveResult } = useExerciseProgress();
  const { speak, speaking, supported: speechSupported } = useSpeech();

  const exKey = String(exercise.id);
  const bookmarked = bookmarks.includes(exKey);

  const answeredCount = useMemo(
    () => questions.filter((q, i) => isAnswered(q, answers[i])).length,
    [questions, answers]
  );
  const score = useMemo(
    () => questions.filter((q, i) => isCorrect(q, answers[i])).length,
    [questions, answers]
  );
  const gradedTotal = useMemo(() => questions.filter(isGraded).length, [questions]);
  const dialogueCount = questions.length - gradedTotal;

  const setAnswer = (index: number, value: AnswerState) =>
    setAnswers(prev => prev.map((a, i) => (i === index ? value : a)));

  const handleSubmit = () => {
    setSubmitted(true);
    saveResult(exKey, {
      score,
      gradedTotal,
      essayCount: dialogueCount,
      completedAt: new Date().toISOString(),
    });
  };

  const handleReset = () => {
    setAnswers(questions.map(emptyAnswer));
    setSubmitted(false);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/exercises/all"
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">{exercise.title}</h1>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>{questions.length} câu</span>
              {exercise.tags.map(t => (
                <span key={t} className="px-1.5 py-px rounded-full bg-slate-200/60 dark:bg-slate-800/60">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => toggleBookmark(exKey)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0",
            bookmarked
              ? "text-orange-700 dark:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
          )}
        >
          <Flag className={cn("w-4 h-4", bookmarked && "fill-current")} />
          <span className="hidden md:inline">{bookmarked ? "Sẽ làm lại" : "Làm lại sau"}</span>
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
          {exercise.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{exercise.description}</p>
          )}

          {/* Result banner */}
          {submitted && (
            <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Kết quả: {score}/{gradedTotal} câu đúng
              </h2>
              {dialogueCount > 0 && (
                <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
                  {dialogueCount} đối thoại không chấm tự động — tự đối chiếu với gợi ý.
                </p>
              )}
            </section>
          )}

          {/* Questions */}
          {questions.map((q, qi) => {
            const answer = answers[qi];
            return (
              <section key={q.id} className="space-y-3">
                {/* MCQ */}
                {q.type === "mcq" && answer.kind === "mcq" && (
                  <>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line">
                      <span className="text-slate-500 font-black mr-2">Câu {qi + 1}.</span>
                      {q.prompt}
                    </h3>
                    <div className="grid gap-2">
                      {(q.options ?? []).map((opt, oi) => {
                        const picked = answer.optionId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => !submitted && setAnswer(qi, { kind: "mcq", optionId: opt.id })}
                            disabled={submitted}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                              submitted
                                ? opt.isCorrect
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                                  : picked
                                    ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                                    : "border-slate-300/60 dark:border-slate-800/60 text-slate-500"
                                : picked
                                  ? "border-blue-600 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-600 dark:text-white font-semibold"
                                  : "border-slate-300/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-500 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900"
                            )}
                          >
                            <span
                              className={cn(
                                "w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-bold",
                                submitted && opt.isCorrect
                                  ? "border-emerald-400 text-emerald-700 dark:text-emerald-300"
                                  : picked
                                    ? submitted
                                      ? "border-red-400 text-red-700 dark:text-red-300"
                                      : "border-white/80 text-white"
                                    : "border-slate-400 dark:border-slate-700 text-slate-500"
                              )}
                            >
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Cloze */}
                {q.type === "cloze" && answer.kind === "cloze" && (
                  <>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <span className="text-slate-500 font-black mr-2">Câu {qi + 1}.</span>
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded-full px-2 py-0.5 align-middle">
                        Điền câu
                      </span>
                    </h3>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-loose">
                      {splitClozePrompt(q.prompt).map((part, pi) => {
                        if ("text" in part) return <span key={pi}>{part.text}</span>;
                        const value = answer.blanks[part.blank] ?? "";
                        const blankCorrect = submitted && isBlankCorrect(q, answer, part.blank);
                        const spec = (q.clozeAnswers ?? []).find(c => c.blank === part.blank);
                        return (
                          <span key={pi} className="inline-flex items-center gap-1 align-baseline mx-0.5">
                            <input
                              type="text"
                              value={value}
                              onChange={e =>
                                setAnswer(qi, {
                                  kind: "cloze",
                                  blanks: { ...answer.blanks, [part.blank]: e.target.value },
                                })
                              }
                              disabled={submitted}
                              size={Math.max(8, value.length + 2)}
                              placeholder={`(${part.blank})`}
                              className={cn(
                                "inline-block rounded-md bg-white dark:bg-slate-900 border px-2 py-1 text-sm text-center text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none disabled:opacity-80",
                                submitted
                                  ? blankCorrect
                                    ? "border-emerald-500/60 text-emerald-700 dark:text-emerald-300"
                                    : "border-red-500/60 text-red-700 dark:text-red-300"
                                  : "border-slate-400 dark:border-slate-700 focus:border-slate-500"
                              )}
                            />
                            {submitted && !blankCorrect && spec && (
                              <span className="text-xs text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                → {spec.accepted.join(" / ")}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </p>
                  </>
                )}

                {/* Dialogue — chạy từng bước: hỏi → tự trả lời → xem gợi ý → tiếp */}
                {q.type === "dialogue" && answer.kind === "dialogue" && (
                  <>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <span className="text-slate-500 font-black mr-2">Câu {qi + 1}.</span>
                    </h3>
                    <DialogueRunner
                      prompt={q.prompt}
                      turns={q.turns ?? []}
                      explanation={q.explanation}
                      state={answer}
                      frozen={submitted}
                      onChange={next => setAnswer(qi, { kind: "dialogue", ...next })}
                    />
                  </>
                )}

                {/* Source word (auto-generated questions) */}
                {q.sourceWord && submitted && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    Từ gốc:
                    <span className="font-bold text-slate-700 dark:text-slate-300">{q.sourceWord.headword}</span>
                    {q.sourceWord.pronunciation && (
                      <span className="font-mono">{q.sourceWord.pronunciation}</span>
                    )}
                    {speechSupported && (
                      <button
                        onClick={() => speak(q.sourceWord!.headword, `w${q.sourceWord!.id}`)}
                        className={cn(
                          "text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
                          speaking === `w${q.sourceWord.id}` && "text-blue-600 dark:text-blue-400"
                        )}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </p>
                )}

                {/* Feedback */}
                {submitted && !isCorrect(q, answer) && q.type === "mcq" && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <XCircle className="w-3.5 h-3.5" /> Chưa đúng.
                  </p>
                )}
                {submitted && q.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2 leading-relaxed">
                    💡 {q.explanation}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-4 md:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-3">
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {answeredCount}/{questions.length} câu
          </span>
          {submitted ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 transition-all whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Làm lại
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={answeredCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              Nộp bài
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
