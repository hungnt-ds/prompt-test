import { Eye, ArrowRight, CheckCircle2, Volume2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import type { DialogueTurn } from "@/services/vocabApi";
import {
  nextHiddenIndex,
  isDialogueDone,
  type DialogueState,
} from "@/components/exercises/dialogueState";

// ============================================================
// Đối thoại gợi ý — chạy từng bước:
//   1. Hiện các lượt của bên kia (câu hỏi)
//   2. Người học tự trả lời vào ô nhập
//   3. Bấm "Xem gợi ý" để đối chiếu
//   4. Bấm "Tiếp" sang lượt sau; hết hội thoại thì hiện giải thích
// Không chấm đúng/sai — người học tự đánh giá ở phần Ôn tập.
// ============================================================

/** Bên trái = người hỏi, bên phải = lượt người học phải tự nói. */
function Bubble({
  turn,
  children,
  tone = "other",
}: {
  turn: DialogueTurn;
  children?: React.ReactNode;
  tone?: "other" | "self" | "hint";
}) {
  const mine = tone !== "other";
  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <span className="text-[10px] font-bold text-slate-500 px-1">{turn.speaker}</span>
      {children}
    </div>
  );
}

export function DialogueRunner({
  prompt,
  turns,
  explanation,
  state,
  onChange,
  frozen,
}: {
  prompt: string;
  turns: DialogueTurn[];
  explanation?: string | null;
  state: DialogueState;
  onChange: (next: DialogueState) => void;
  /** Đã nộp bài — mở hết, không cho sửa nữa */
  frozen?: boolean;
}) {
  const { speak, speaking, supported } = useSpeech();
  const hiddenCount = turns.filter(t => t.hidden).length;
  const done = frozen || isDialogueDone(turns, state);
  const cursor = frozen ? turns.length : state.cursor;
  const revealedNow = (i: number) => frozen || state.revealed.includes(i);

  const reveal = (i: number) => onChange({ ...state, revealed: [...state.revealed, i] });
  const next = () => onChange({ ...state, cursor: nextHiddenIndex(turns, cursor + 1) });

  const speakTurn = (i: number, text: string) => speak(text, `dlg-${i}`);

  return (
    <div className="space-y-3">
      {/* Bối cảnh + tiến độ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-full px-2 py-0.5">
          <MessageSquare className="w-3 h-3" />
          Đối thoại
        </span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{prompt}</span>
        <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
          {frozen ? hiddenCount : Math.min(state.revealed.length, hiddenCount)}/{hiddenCount} lượt
        </span>
      </div>

      {/* Khung chat */}
      <div className="rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40 p-3 space-y-3">
        {turns.map((turn, i) => {
          if (i > cursor) return null; // chưa tới lượt này

          // Lượt của bên kia — hiện thẳng
          if (!turn.hidden) {
            return (
              <Bubble key={i} turn={turn}>
                <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800/60 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-200">
                  {turn.text}
                  {supported && (
                    <button
                      onClick={() => speakTurn(i, turn.text)}
                      title="Nghe câu này"
                      className={cn(
                        "ml-2 align-middle text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
                        speaking === `dlg-${i}` && "text-blue-600 dark:text-blue-400"
                      )}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </p>
              </Bubble>
            );
          }

          // Lượt người học phải tự nói
          const active = i === cursor && !frozen;
          const draft = state.drafts[i] ?? "";
          const shown = revealedNow(i);

          return (
            <Bubble key={i} turn={turn} tone="self">
              <div className="w-full max-w-[85%] space-y-1.5">
                <textarea
                  value={draft}
                  onChange={e => onChange({ ...state, drafts: { ...state.drafts, [i]: e.target.value } })}
                  disabled={!active}
                  rows={2}
                  placeholder={active ? "Bạn sẽ nói gì ở lượt này?" : "(không trả lời)"}
                  className={cn(
                    "w-full rounded-2xl rounded-tr-sm border px-3.5 py-2 text-sm text-right text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none resize-y",
                    active
                      ? "bg-white dark:bg-slate-900 border-blue-500/50 focus:border-blue-500"
                      : "bg-slate-100 dark:bg-slate-900/60 border-slate-300/60 dark:border-slate-800/60 opacity-80"
                  )}
                />

                {shown ? (
                  <div className="rounded-2xl rounded-tr-sm bg-purple-500/5 border border-purple-500/30 px-3.5 py-2 text-right">
                    <span className="block text-[10px] font-bold text-purple-700 dark:text-purple-400 mb-0.5">
                      Gợi ý
                    </span>
                    <span className="text-sm text-slate-800 dark:text-slate-200">{turn.text}</span>
                    {supported && (
                      <button
                        onClick={() => speakTurn(i, turn.text)}
                        title="Nghe gợi ý"
                        className={cn(
                          "ml-2 align-middle text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
                          speaking === `dlg-${i}` && "text-blue-600 dark:text-blue-400"
                        )}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Nút điều khiển chỉ ở lượt đang làm */}
                {active && (
                  <div className="flex justify-end gap-2">
                    {!shown ? (
                      <button
                        onClick={() => reveal(i)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem gợi ý
                      </button>
                    ) : (
                      <button
                        onClick={next}
                        autoFocus
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                      >
                        {nextHiddenIndex(turns, i + 1) >= turns.length ? "Kết thúc hội thoại" : "Tiếp"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Bubble>
          );
        })}
      </div>

      {/* Hết hội thoại */}
      {done && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã xong hội thoại — so lại câu của bạn với gợi ý ở trên.
          </p>
          {explanation && (
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2 leading-relaxed">
              💡 {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
