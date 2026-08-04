import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Volume2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Eye,
  PartyPopper,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { ApiSettings } from "@/components/ApiSettings";
import { ReminderSettings } from "@/components/ReminderSettings";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";
import { RatingButtons } from "@/components/practice/RatingButtons";
import { DialogueRunner } from "@/components/exercises/DialogueRunner";
import { initialDialogueState, type DialogueState } from "@/components/exercises/dialogueState";
import {
  reviewDue,
  reviewAnswer,
  type DueResult,
  type DueItemContent,
  type Question,
} from "@/services/vocabApi";

const STATE_LABEL: Record<string, { label: string; cls: string }> = {
  new: { label: "Mới", cls: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30" },
  learning: { label: "Đang học", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" },
  review: { label: "Ôn lại", cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  relearning: { label: "Học lại", cls: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30" },
};

const POS_BADGE: Record<string, string> = {
  noun: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
  verb: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  adj: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  adv: "text-pink-600 dark:text-pink-400 bg-pink-500/10",
  "phrasal-verb": "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  idiom: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
};

type ItemType = "word" | "exercise" | "all";

export function ReviewPage() {
  const [typeFilter, setTypeFilter] = useState<ItemType>("all");
  const [reloadTick, setReloadTick] = useState(0);
  const [data, setData] = useState<{ key: string; due?: DueResult; error?: string } | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const { speak, speaking, supported } = useSpeech();

  const queryKey = `${typeFilter}:${reloadTick}`;

  useEffect(() => {
    let cancelled = false;
    reviewDue(typeFilter, 50)
      .then(due => {
        if (!cancelled) setData({ key: queryKey, due });
      })
      .catch(e => {
        if (!cancelled) setData({ key: queryKey, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [typeFilter, reloadTick, queryKey]);

  const loading = !data || data.key !== queryKey;
  const due = !loading ? data?.due : undefined;
  const loadError = !loading ? data?.error : undefined;
  const current = due?.items[index];

  const refresh = () => {
    setIndex(0);
    setRevealed(false);
    setAnswerError(null);
    setReloadTick(t => t + 1);
  };

  const rate = async (rating: 1 | 2 | 3 | 4) => {
    if (!current || answering) return;
    setAnswering(true);
    setAnswerError(null);
    try {
      await reviewAnswer(current.card.id, rating);
      setIndex(i => i + 1);
      setRevealed(false);
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnswering(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Ôn tập theo lịch</h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Thẻ FSRS đến hạn — tự trả lời rồi chấm 1-4, server tự xếp lịch tiếp
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value as ItemType);
              setIndex(0);
              setRevealed(false);
            }}
            className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-2.5 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="word">Từ vựng</option>
            <option value="exercise">Bài tập</option>
          </select>
          <button
            onClick={refresh}
            disabled={loading}
            title="Tải lại"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <ReminderSettings />
          <VoiceSettings />
          <ApiSettings onSaved={refresh} />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">
          {/* Counts */}
          {due && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {Object.entries(due.counts).map(([state, n]) =>
                n > 0 ? (
                  <span key={state} className={cn("px-2 py-0.5 rounded-full border font-bold", STATE_LABEL[state].cls)}>
                    {STATE_LABEL[state].label}: {n}
                  </span>
                ) : null
              )}
              <span className="ml-auto text-slate-500">
                {due.items.length > 0 && `${Math.min(index + 1, due.items.length)}/${due.items.length}`}
                {due.total > due.items.length && ` (tổng ${due.total})`}
              </span>
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải thẻ đến hạn…
            </div>
          ) : !current ? (
            <div className="py-20 text-center space-y-3">
              <PartyPopper className="w-12 h-12 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {due && due.items.length > 0 ? "Đã ôn hết lượt này!" : "Không có thẻ nào đến hạn 🎉"}
              </p>
              <p className="text-sm text-slate-500">
                Quay lại sau, hoặc sang tab Luyện tập để học thêm từ mới.
              </p>
              <button
                onClick={refresh}
                className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Kiểm tra lại
              </button>
            </div>
          ) : (
            <>
              {/* Card state badge */}
              <div className="flex items-center gap-2 text-[11px]">
                <span className={cn("px-2 py-0.5 rounded-full border font-bold", STATE_LABEL[current.card.state].cls)}>
                  {STATE_LABEL[current.card.state].label}
                </span>
                {current.card.reps > 0 && (
                  <span className="text-slate-400 dark:text-slate-600">đã ôn {current.card.reps} lần</span>
                )}
              </div>

              {/* Item */}
              {current.item.type === "word" ? (
                <WordReviewCard word={current.item} revealed={revealed} onReveal={() => setRevealed(true)}
                  speak={speak} speaking={speaking} speechSupported={supported} />
              ) : (
                <ExerciseReviewCard exercise={current.item} />
              )}

              {answerError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {answerError}
                </div>
              )}

              {/* Rating: word cần lật trước; exercise chấm trực tiếp sau khi tự làm */}
              {(current.item.type === "exercise" || revealed) && (
                <RatingButtons onRate={r => void rate(r)} disabled={answering} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WordReviewCard({
  word,
  revealed,
  onReveal,
  speak,
  speaking,
  speechSupported,
}: {
  word: Extract<DueItemContent, { type: "word" }>;
  revealed: boolean;
  onReveal: () => void;
  speak: (text: string, key?: string) => void;
  speaking: string | null;
  speechSupported: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-6 md:p-8 space-y-4">
      <div className="text-center space-y-2">
        <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{word.headword}</p>
        {word.pronunciation && <p className="text-slate-500 font-mono">{word.pronunciation}</p>}
        {speechSupported && (
          <button
            onClick={() => speak(word.headword, `rv${word.id}`)}
            className={cn(
              "mx-auto flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-500 dark:hover:border-slate-600 transition-colors",
              speaking === `rv${word.id}` && "text-blue-600 dark:text-blue-400 border-blue-500/50"
            )}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={onReveal}
          className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Hiện nghĩa
        </button>
      ) : (
        <div className="space-y-3 border-t border-slate-300/60 dark:border-slate-800/60 pt-4">
          {word.senses.map(sense => (
            <div key={sense.id} className="space-y-1">
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {sense.partOfSpeech && (
                  <span
                    className={cn(
                      "inline-block mr-2 px-1.5 py-px rounded text-[10px] font-bold align-middle",
                      POS_BADGE[sense.partOfSpeech] ?? "text-slate-600 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60"
                    )}
                  >
                    {sense.partOfSpeech}
                  </span>
                )}
                {sense.definition}
              </p>
              {sense.examples.map(ex => (
                <p key={ex.id} className="pl-4 text-xs text-slate-500 italic">“{ex.sentence}”</p>
              ))}
            </div>
          ))}
          {word.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2 whitespace-pre-line">
              {word.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseReviewCard({ exercise }: { exercise: Extract<DueItemContent, { type: "exercise" }> }) {
  // /review/due đã kèm sẵn turns nên câu đối thoại làm được ngay tại đây.
  const dialogues = exercise.questions.filter(q => q.type === "dialogue" && (q.turns?.length ?? 0) > 0);
  const others = exercise.questions.length - dialogues.length;

  return (
    <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4 md:p-6 space-y-4">
      <div className="space-y-1 text-center">
        <ListChecks className="w-7 h-7 mx-auto text-slate-500" />
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{exercise.title}</p>
        {exercise.description && <p className="text-sm text-slate-500">{exercise.description}</p>}
        <p className="text-xs text-slate-400 dark:text-slate-600">{exercise.questions.length} câu hỏi</p>
      </div>

      {dialogues.map(q => (
        <DialogueReviewBlock key={q.id} question={q} />
      ))}

      {(others > 0 || dialogues.length === 0) && (
        <div className="text-center space-y-2">
          <Link
            to={`/exercises/${exercise.id}`}
            target="_blank"
            className="mx-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            {dialogues.length > 0 ? `Làm ${others} câu còn lại` : "Làm bài này"}
            <ExternalLink className="w-4 h-4" />
          </Link>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Làm xong quay lại đây tự chấm mức độ nhớ bên dưới.
          </p>
        </div>
      )}
    </div>
  );
}

/** Một câu đối thoại chạy ngay trong hàng ôn tập. */
function DialogueReviewBlock({ question }: { question: Question }) {
  const turns = question.turns ?? [];
  const [state, setState] = useState<DialogueState>(() => initialDialogueState(turns));

  return (
    <DialogueRunner
      prompt={question.prompt}
      turns={turns}
      explanation={question.explanation}
      state={state}
      onChange={setState}
    />
  );
}
