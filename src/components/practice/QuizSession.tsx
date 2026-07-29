import { useEffect, useState } from "react";
import { Volume2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import type { PracticeQuestion, PracticeResult } from "@/services/vocabApi";

/** Quy tắc chấm dạng gõ theo FE-GUIDE: accepted.includes(input.trim().toLowerCase()) */
function isTypedCorrect(accepted: string[], input: string): boolean {
  return accepted.includes(input.trim().toLowerCase());
}

/**
 * Chạy một lượt quiz từ /api/practice/quiz — mỗi câu render theo `kind`
 * (kể cả khi trộn mixed), trả kết quả theo wordId cho /api/practice/answer.
 */
export function QuizSession({
  questions,
  onFinish,
}: {
  questions: PracticeQuestion[];
  onFinish: (results: PracticeResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PracticeResult[]>([]);

  const handleQuestionDone = (qResults: PracticeResult[]) => {
    const next = [...results, ...qResults];
    if (index + 1 >= questions.length) {
      onFinish(next);
      return;
    }
    setResults(next);
    setIndex(index + 1);
  };

  const q = questions[index];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="tabular-nums">{index + 1}/{questions.length}</span>
        <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${(index / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {q.kind === "matching" ? (
        <MatchingQuestion key={index} question={q} onDone={handleQuestionDone} />
      ) : q.options ? (
        <ChoiceQuestion key={index} question={q} onDone={handleQuestionDone} />
      ) : (
        <TypingQuestion key={index} question={q} onDone={handleQuestionDone} />
      )}
    </div>
  );
}

// ---------- Dạng lựa chọn: word-to-meaning / meaning-to-word / context-choice ----------

function ChoiceQuestion({
  question,
  onDone,
}: {
  question: PracticeQuestion;
  onDone: (results: PracticeResult[]) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const { speak, supported } = useSpeech();
  const options = question.options ?? [];
  const answered = picked !== null;
  const correct = answered && !!options[picked]?.isCorrect;

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
  };

  return (
    <div className="space-y-4">
      {/* Đề bài */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-6 text-center space-y-2">
        {question.kind === "word-to-meaning" && question.word && (
          <>
            <p className="text-xs text-slate-500">Chọn nghĩa đúng của từ</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {question.word.headword}
              {supported && (
                <button
                  onClick={() => speak(question.word!.headword)}
                  className="ml-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors align-middle"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </p>
            {question.word.pronunciation && (
              <p className="text-sm text-slate-500 font-mono">{question.word.pronunciation}</p>
            )}
          </>
        )}
        {question.kind === "meaning-to-word" && question.meaning && (
          <>
            <p className="text-xs text-slate-500">Chọn từ đúng với nghĩa</p>
            <p className="text-lg text-slate-900 dark:text-slate-100 leading-relaxed">
              {question.meaning.partOfSpeech && (
                <span className="inline-block mr-2 px-1.5 py-px rounded bg-slate-200 dark:bg-slate-800/80 text-[10px] font-bold text-slate-600 dark:text-slate-400 align-middle">
                  {question.meaning.partOfSpeech}
                </span>
              )}
              {question.meaning.definition}
            </p>
          </>
        )}
        {question.kind === "context-choice" && question.sentence && (
          <>
            <p className="text-xs text-slate-500">Chọn từ phù hợp với chỗ trống</p>
            <p className="text-lg text-slate-900 dark:text-slate-100 leading-relaxed">
              {question.sentence.split(/\{\{\d+\}\}/).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="inline-block min-w-[80px] mx-1 border-b-2 border-dashed border-slate-500 dark:border-slate-600 text-transparent select-none">
                      ____
                    </span>
                  )}
                </span>
              ))}
            </p>
          </>
        )}
      </div>

      {/* Lựa chọn */}
      <div className="grid gap-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => pick(i)}
            disabled={answered}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              answered
                ? opt.isCorrect
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : picked === i
                    ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-slate-300/60 dark:border-slate-800/60 text-slate-500"
                : "border-slate-300/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-500 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900"
            )}
          >
            <span className="w-6 h-6 shrink-0 rounded-full border border-slate-400 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            {opt.text}
          </button>
        ))}
      </div>

      {answered && (
        <NextBar correct={correct} onNext={() => onDone(question.word ? [{ wordId: question.word.id, correct }] : [])} />
      )}
    </div>
  );
}

// ---------- Dạng gõ chữ: listen-type / type-word / type-meaning ----------

function TypingQuestion({
  question,
  onDone,
}: {
  question: PracticeQuestion;
  onDone: (results: PracticeResult[]) => void;
}) {
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState(false);
  const { speak, speaking, supported } = useSpeech();
  const accepted = question.accepted ?? [];
  const correct = answered && isTypedCorrect(accepted, input);

  // Nghe-gõ: tự phát âm khi câu hỏi xuất hiện
  useEffect(() => {
    if (question.kind === "listen-type" && question.word) {
      speak(question.word.headword, `q${question.word.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (!answered && input.trim()) setAnswered(true);
  };

  return (
    <div className="space-y-4">
      {/* Đề bài */}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-6 text-center space-y-3">
        {question.kind === "listen-type" && question.word && (
          <>
            <p className="text-xs text-slate-500">Nghe và gõ lại từ</p>
            <button
              onClick={() => speak(question.word!.headword, `q${question.word!.id}`)}
              disabled={!supported}
              className={cn(
                "mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 transition-colors",
                speaking === `q${question.word.id}` && "text-blue-600 dark:text-blue-400 border-blue-500/50"
              )}
            >
              <Volume2 className="w-7 h-7" />
            </button>
            {!supported && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Trình duyệt không hỗ trợ phát âm (Web Speech API).</p>
            )}
            {answered && (
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {question.word.headword}
                {question.word.pronunciation && (
                  <span className="ml-2 text-sm text-slate-500 font-mono">{question.word.pronunciation}</span>
                )}
              </p>
            )}
          </>
        )}
        {question.kind === "type-word" && question.meaning && (
          <>
            <p className="text-xs text-slate-500">Gõ từ tiếng Anh đúng với nghĩa</p>
            <p className="text-lg text-slate-900 dark:text-slate-100 leading-relaxed">
              {question.meaning.partOfSpeech && (
                <span className="inline-block mr-2 px-1.5 py-px rounded bg-slate-200 dark:bg-slate-800/80 text-[10px] font-bold text-slate-600 dark:text-slate-400 align-middle">
                  {question.meaning.partOfSpeech}
                </span>
              )}
              {question.meaning.definition}
            </p>
          </>
        )}
        {question.kind === "type-meaning" && question.word && (
          <>
            <p className="text-xs text-slate-500">Gõ nghĩa (tiếng Anh) của từ</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {question.word.headword}
              {supported && (
                <button
                  onClick={() => speak(question.word!.headword)}
                  className="ml-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors align-middle"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </p>
            {question.word.pronunciation && (
              <p className="text-sm text-slate-500 font-mono">{question.word.pronunciation}</p>
            )}
          </>
        )}
      </div>

      {/* Ô nhập */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          disabled={answered}
          autoFocus
          placeholder="Gõ câu trả lời rồi Enter…"
          className={cn(
            "flex-1 rounded-lg bg-white dark:bg-slate-900 border px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none disabled:opacity-80",
            answered
              ? correct
                ? "border-emerald-500/60"
                : "border-red-500/60"
              : "border-slate-300 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500"
          )}
        />
        {!answered && (
          <button
            onClick={submit}
            disabled={!input.trim()}
            className="px-5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 transition-colors disabled:opacity-40"
          >
            Kiểm tra
          </button>
        )}
      </div>

      {answered && (
        <>
          {!correct && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Đáp án: <span className="font-bold">{accepted.join(" / ")}</span>
            </p>
          )}
          <NextBar
            correct={correct}
            onNext={() => onDone(question.word ? [{ wordId: question.word.id, correct }] : [])}
          />
        </>
      )}
    </div>
  );
}

// ---------- Nối từ với nghĩa ----------

function MatchingQuestion({
  question,
  onDone,
}: {
  question: PracticeQuestion;
  onDone: (results: PracticeResult[]) => void;
}) {
  const pairs = question.pairs ?? [];
  const meanings = question.meanings ?? [];
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  // Từ nào từng ghép sai một lần thì tính là chưa thuộc.
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<{ l: number; r: number } | null>(null);

  const trySelect = (side: "l" | "r", wordId: number) => {
    if (matched.has(wordId) || shake) return;
    const nextLeft = side === "l" ? wordId : left;
    const nextRight = side === "r" ? wordId : right;
    if (nextLeft !== null && nextRight !== null) {
      if (nextLeft === nextRight) {
        setMatched(prev => new Set(prev).add(nextLeft));
      } else {
        setMissed(prev => new Set([...prev, nextLeft, nextRight]));
        setShake({ l: nextLeft, r: nextRight });
        window.setTimeout(() => setShake(null), 500);
      }
      setLeft(null);
      setRight(null);
    } else {
      setLeft(nextLeft);
      setRight(nextRight);
    }
  };

  const complete = matched.size === pairs.length && pairs.length > 0;

  const cellClass = (side: "l" | "r", wordId: number, selected: boolean) =>
    cn(
      "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
      matched.has(wordId)
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300/70 pointer-events-none"
        : shake && (side === "l" ? shake.l === wordId : shake.r === wordId)
          ? "border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300"
          : selected
            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-600 dark:text-white font-semibold"
            : "border-slate-300/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-500 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900"
    );

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-slate-500">Nối từ (trái) với nghĩa đúng (phải)</p>
      <div className="grid grid-cols-2 gap-3 items-start">
        <div className="space-y-2">
          {pairs.map(p => (
            <button key={p.wordId} onClick={() => trySelect("l", p.wordId)} className={cellClass("l", p.wordId, left === p.wordId)}>
              {p.headword}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {meanings.map(m => (
            <button key={m.wordId} onClick={() => trySelect("r", m.wordId)} className={cellClass("r", m.wordId, right === m.wordId)}>
              {m.definition}
            </button>
          ))}
        </div>
      </div>

      {complete && (
        <NextBar
          correct={missed.size === 0}
          label={missed.size === 0 ? "Ghép đúng hết!" : `${missed.size} từ ghép sai lần đầu`}
          onNext={() =>
            onDone(pairs.map(p => ({ wordId: p.wordId, correct: !missed.has(p.wordId) })))
          }
        />
      )}
    </div>
  );
}

// ---------- Thanh feedback + nút tiếp ----------

function NextBar({ correct, label, onNext }: { correct: boolean; label?: string; onNext: () => void }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
        correct ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"
      )}
    >
      <span className={cn("flex items-center gap-2 text-sm font-semibold", correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
        {correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {label ?? (correct ? "Chính xác!" : "Chưa đúng")}
      </span>
      <button
        autoFocus
        onClick={onNext}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 transition-colors"
      >
        Tiếp <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
