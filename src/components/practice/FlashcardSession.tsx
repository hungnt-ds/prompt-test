import { useState } from "react";
import { Volume2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import type { Word, PracticeResult } from "@/services/vocabApi";
import { RatingButtons } from "./RatingButtons";

const POS_BADGE: Record<string, string> = {
  noun: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
  verb: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  adj: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  adv: "text-pink-600 dark:text-pink-400 bg-pink-500/10",
  "phrasal-verb": "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  idiom: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
};

/**
 * Lật thẻ học từ: mặt trước headword + phát âm, lật ra nghĩa + ví dụ,
 * tự chấm 4 mức → map thành {correct, rating} cho /api/practice/answer.
 */
export function FlashcardSession({
  words,
  onFinish,
}: {
  words: Word[];
  onFinish: (results: PracticeResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const { speak, speaking, supported } = useSpeech();

  const word = words[index];

  const rate = (rating: 1 | 2 | 3 | 4) => {
    const next = [...results, { wordId: word.id, correct: rating >= 2, rating }];
    if (index + 1 >= words.length) {
      onFinish(next);
      return;
    }
    setResults(next);
    setIndex(index + 1);
    setFlipped(false);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="tabular-nums">{index + 1}/{words.length}</span>
        <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${((index + (flipped ? 0.5 : 0)) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-[320px] rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-slate-400 dark:hover:border-slate-700 transition-colors p-6 md:p-10 flex flex-col items-center justify-center gap-4 text-center"
      >
        {!flipped ? (
          <>
            <span className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">{word.headword}</span>
            {word.pronunciation && (
              <span className="text-lg text-slate-500 font-mono">{word.pronunciation}</span>
            )}
            {supported && (
              <span
                role="button"
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation();
                  speak(word.headword, String(word.id));
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    speak(word.headword, String(word.id));
                  }
                }}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-500 dark:hover:border-slate-600 transition-colors",
                  speaking === String(word.id) && "text-blue-600 dark:text-blue-400 border-blue-500/50"
                )}
              >
                <Volume2 className="w-5 h-5" />
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600 mt-2">
              <RotateCw className="w-3.5 h-3.5" /> Bấm để lật thẻ
            </span>
          </>
        ) : (
          <div className="w-full space-y-4 text-left">
            <div className="flex items-baseline gap-2 justify-center flex-wrap">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{word.headword}</span>
              {word.pronunciation && (
                <span className="text-sm text-slate-500 font-mono">{word.pronunciation}</span>
              )}
            </div>
            <div className="space-y-3">
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
            </div>
            {word.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2 whitespace-pre-line">
                {word.notes}
              </p>
            )}
            {word.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {word.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-[10px] text-slate-500">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </button>

      {/* Rating — only after flipping */}
      {flipped ? (
        <RatingButtons onRate={rate} />
      ) : (
        <p className="text-center text-xs text-slate-400 dark:text-slate-600">Nhớ nghĩa của từ rồi lật thẻ để đối chiếu.</p>
      )}
    </div>
  );
}
