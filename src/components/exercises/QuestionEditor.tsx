import { useRef, useState } from "react";
import {
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  CircleDot,
  Circle,
  SquareDashedBottom,
  MessagesSquare,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionInput, DialogueTurn } from "@/services/vocabApi";
import { DialogueRunner } from "@/components/exercises/DialogueRunner";
import { initialDialogueState } from "@/components/exercises/dialogueState";
import { blanksInPrompt, validateQuestion } from "@/components/exercises/questionInput";

// Soạn một câu hỏi: trắc nghiệm / điền câu / đối thoại.

const QUESTION_META: Record<QuestionInput["type"], { label: string; icon: typeof ListChecks; cls: string }> = {
  mcq: { label: "Trắc nghiệm", icon: ListChecks, cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  cloze: { label: "Điền câu", icon: SquareDashedBottom, cls: "text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/30" },
  dialogue: { label: "Đối thoại", icon: MessagesSquare, cls: "text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30" },
};

interface Props {
  question: QuestionInput;
  index: number;
  total: number;
  /** Lỗi từ API trả về cho riêng câu này */
  serverErrors?: string[];
  onChange: (q: QuestionInput) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
}

export function QuestionEditor({
  question,
  index,
  total,
  serverErrors = [],
  onChange,
  onRemove,
  onMove,
  onDuplicate,
}: Props) {
  const [preview, setPreview] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const meta = QUESTION_META[question.type];
  const Icon = meta.icon;
  const errors = [...validateQuestion(question), ...serverErrors];

  return (
    <section
      className={cn(
        "rounded-xl border bg-white dark:bg-slate-950/40 overflow-hidden",
        errors.length > 0 && serverErrors.length > 0
          ? "border-red-500/50"
          : "border-slate-300/60 dark:border-slate-800/60"
      )}
    >
      {/* Thanh đầu thẻ */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-300/60 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40">
        <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
        <span className="text-xs font-black text-slate-500 tabular-nums">{index + 1}</span>
        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold", meta.cls)}>
          <Icon className="w-3 h-3" />
          {meta.label}
        </span>
        <span className="flex-1 min-w-0 truncate text-xs text-slate-500">
          {question.prompt.trim() || "(chưa có nội dung)"}
        </span>

        <button
          onClick={() => setPreview(p => !p)}
          title={preview ? "Về chế độ sửa" : "Xem trước như người học thấy"}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
            preview
              ? "text-blue-600 dark:text-blue-400 bg-blue-500/10"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
          )}
        >
          {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          title="Lên trên"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          title="Xuống dưới"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDuplicate}
          title="Nhân bản câu này"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        {confirmRemove ? (
          <button
            onClick={onRemove}
            className="px-2 h-7 rounded-lg text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 whitespace-nowrap"
          >
            Xóa?
          </button>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            onBlur={() => setConfirmRemove(false)}
            title="Xóa câu này"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-3 md:p-4 space-y-3">
        {preview ? (
          <QuestionPreview question={question} />
        ) : (
          <>
            {question.type === "mcq" && <McqFields question={question} onChange={onChange} />}
            {question.type === "cloze" && <ClozeFields question={question} onChange={onChange} />}
            {question.type === "dialogue" && <DialogueFields question={question} onChange={onChange} />}

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Giải thích (hiện sau khi trả lời)</span>
              <textarea
                value={question.explanation ?? ""}
                onChange={e => onChange({ ...question, explanation: e.target.value })}
                rows={2}
                placeholder="Vì sao đáp án này đúng…"
                className={inputCls}
              />
            </label>
          </>
        )}

        {errors.length > 0 && (
          <ul className="space-y-0.5">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                {err}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const inputCls =
  "w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-y";

// ---------- Trắc nghiệm ----------

function McqFields({
  question,
  onChange,
}: {
  question: Extract<QuestionInput, { type: "mcq" }>;
  onChange: (q: QuestionInput) => void;
}) {
  const setOption = (i: number, patch: Partial<{ text: string; isCorrect: boolean }>) =>
    onChange({
      ...question,
      options: question.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    });

  const markCorrect = (i: number) =>
    onChange({
      ...question,
      options: question.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
    });

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-slate-500">Câu hỏi *</span>
        <textarea
          value={question.prompt}
          onChange={e => onChange({ ...question, prompt: e.target.value })}
          rows={2}
          placeholder='Vd: What does "abundant" mean?'
          className={inputCls}
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-500">
          Lựa chọn * <span className="font-normal text-slate-400 dark:text-slate-600">— bấm vòng tròn để đánh dấu đáp án đúng</span>
        </span>
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => markCorrect(i)}
              title="Đây là đáp án đúng"
              className={cn(
                "shrink-0 transition-colors",
                opt.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-700 hover:text-slate-500"
              )}
            >
              {opt.isCorrect ? <CircleDot className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            <span className="w-5 shrink-0 text-center text-[11px] font-bold text-slate-400 dark:text-slate-600">
              {String.fromCharCode(65 + i)}
            </span>
            <input
              type="text"
              value={opt.text}
              onChange={e => setOption(i, { text: e.target.value })}
              placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
              className={cn(
                "flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500",
                opt.isCorrect ? "border-emerald-500/50" : "border-slate-300 dark:border-slate-800"
              )}
            />
            <button
              onClick={() => onChange({ ...question, options: question.options.filter((_, idx) => idx !== i) })}
              disabled={question.options.length <= 2}
              title="Bỏ lựa chọn"
              className="shrink-0 text-slate-400 dark:text-slate-600 hover:text-red-500 transition-colors disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ ...question, options: [...question.options, { text: "", isCorrect: false }] })}
          disabled={question.options.length >= 8}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm lựa chọn {question.options.length >= 8 && "(tối đa 8)"}
        </button>
      </div>
    </div>
  );
}

// ---------- Điền câu ----------

function ClozeFields({
  question,
  onChange,
}: {
  question: Extract<QuestionInput, { type: "cloze" }>;
  onChange: (q: QuestionInput) => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const blanks = blanksInPrompt(question.prompt);

  /** Chèn {{n}} tại vị trí con trỏ, n = số lớn nhất hiện có + 1. */
  const insertBlank = () => {
    const el = areaRef.current;
    const n = (blanks.at(-1) ?? 0) + 1;
    const token = `{{${n}}}`;
    const start = el?.selectionStart ?? question.prompt.length;
    const end = el?.selectionEnd ?? question.prompt.length;
    const nextPrompt = question.prompt.slice(0, start) + token + question.prompt.slice(end);
    onChange({
      ...question,
      prompt: nextPrompt,
      clozeAnswers: [...question.clozeAnswers, { blank: n, accepted: [] }],
    });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const setAccepted = (blank: number, raw: string) => {
    const accepted = raw.split("|").map(s => s.trim()).filter(Boolean);
    const exists = question.clozeAnswers.some(c => c.blank === blank);
    onChange({
      ...question,
      clozeAnswers: exists
        ? question.clozeAnswers.map(c => (c.blank === blank ? { ...c, accepted } : c))
        : [...question.clozeAnswers, { blank, accepted }],
    });
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Câu văn có chỗ trống *</span>
          <button
            onClick={insertBlank}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Chèn chỗ trống
          </button>
        </div>
        <textarea
          ref={areaRef}
          value={question.prompt}
          onChange={e => onChange({ ...question, prompt: e.target.value })}
          rows={3}
          placeholder="Fish are {{1}} in this river."
          className={cn(inputCls, "font-mono text-[13px]")}
        />
      </label>

      {blanks.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500">
            Đáp án từng chỗ trống *{" "}
            <span className="font-normal text-slate-400 dark:text-slate-600">— nhiều đáp án thì ngăn bằng dấu |</span>
          </span>
          {blanks.map(b => {
            const spec = question.clozeAnswers.find(c => c.blank === b);
            return (
              <div key={b} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-center text-[11px] font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded px-1 py-1">
                  {`{{${b}}}`}
                </span>
                <input
                  type="text"
                  value={(spec?.accepted ?? []).join(" | ")}
                  onChange={e => setAccepted(b, e.target.value)}
                  placeholder="abundant | plentiful"
                  className="flex-1 min-w-0 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            );
          })}
          <p className="text-[10px] text-slate-400 dark:text-slate-600">
            Chấm không phân biệt hoa thường và bỏ khoảng trắng thừa.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Đối thoại ----------

function DialogueFields({
  question,
  onChange,
}: {
  question: Extract<QuestionInput, { type: "dialogue" }>;
  onChange: (q: QuestionInput) => void;
}) {
  const speakers = [...new Set(question.turns.map(t => t.speaker.trim()).filter(Boolean))];

  const setTurn = (i: number, patch: Partial<DialogueTurn>) =>
    onChange({ ...question, turns: question.turns.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });

  const moveTurn = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= question.turns.length) return;
    const turns = [...question.turns];
    [turns[i], turns[j]] = [turns[j], turns[i]];
    onChange({ ...question, turns });
  };

  const addTurn = () => {
    const last = question.turns.at(-1);
    // Mặc định đổi bên và đảo trạng thái ẩn cho nhịp hội thoại tự nhiên.
    const speaker = speakers.find(s => s !== last?.speaker) ?? (last?.speaker === "A" ? "B" : "A");
    onChange({ ...question, turns: [...question.turns, { speaker, text: "", hidden: !last?.hidden }] });
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-slate-500">Bối cảnh *</span>
        <input
          type="text"
          value={question.prompt}
          onChange={e => onChange({ ...question, prompt: e.target.value })}
          placeholder="Vd: Đặt bàn nhà hàng"
          className={inputCls}
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-500">
          Các lượt nói *{" "}
          <span className="font-normal text-slate-400 dark:text-slate-600">
            — bật 👁 ở lượt người học phải tự nói (đó là gợi ý)
          </span>
        </span>

        <datalist id="dlg-speakers">
          {speakers.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>

        {question.turns.map((turn, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 rounded-lg border p-2",
              turn.hidden
                ? "border-purple-500/40 bg-purple-500/5"
                : "border-slate-300/60 dark:border-slate-800/60"
            )}
          >
            <div className="flex flex-col gap-0.5 shrink-0 pt-1">
              <button
                onClick={() => moveTurn(i, -1)}
                disabled={i === 0}
                className="text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveTurn(i, 1)}
                disabled={i === question.turns.length - 1}
                className="text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              list="dlg-speakers"
              value={turn.speaker}
              onChange={e => setTurn(i, { speaker: e.target.value })}
              placeholder="Người nói"
              className="w-24 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-2 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={turn.text}
              onChange={e => setTurn(i, { text: e.target.value })}
              rows={1}
              placeholder={turn.hidden ? "Câu gợi ý cho người học" : "Câu của bên kia"}
              className="flex-1 min-w-0 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-y"
            />
            <button
              onClick={() => setTurn(i, { hidden: !turn.hidden })}
              title={turn.hidden ? "Lượt ẩn — người học tự nói" : "Lượt hiện sẵn"}
              className={cn(
                "shrink-0 mt-1 transition-colors",
                turn.hidden ? "text-purple-600 dark:text-purple-400" : "text-slate-300 dark:text-slate-700 hover:text-slate-500"
              )}
            >
              {turn.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onChange({ ...question, turns: question.turns.filter((_, idx) => idx !== i) })}
              disabled={question.turns.length <= 2}
              title="Xóa lượt"
              className="shrink-0 mt-1 text-slate-400 dark:text-slate-600 hover:text-red-500 transition-colors disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addTurn}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm lượt
        </button>
      </div>
    </div>
  );
}

// ---------- Xem trước ----------

function QuestionPreview({ question }: { question: QuestionInput }) {
  if (question.type === "dialogue") {
    return (
      <DialogueRunner
        prompt={question.prompt || "(chưa có bối cảnh)"}
        turns={question.turns}
        explanation={question.explanation}
        state={initialDialogueState(question.turns)}
        onChange={() => {}}
        frozen
      />
    );
  }

  if (question.type === "mcq") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line">
          {question.prompt || "(chưa có nội dung)"}
        </p>
        <div className="grid gap-1.5">
          {question.options.map((o, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                o.isCorrect
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : "border-slate-300/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300"
              )}
            >
              <span className="w-5 h-5 shrink-0 rounded-full border border-current/40 flex items-center justify-center text-[10px] font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              {o.text || <span className="italic opacity-60">(trống)</span>}
            </div>
          ))}
        </div>
        {question.explanation && (
          <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2">
            💡 {question.explanation}
          </p>
        )}
      </div>
    );
  }

  // cloze
  const parts = question.prompt.split(/(\{\{\d+\}\})/g);
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-800 dark:text-slate-200 leading-loose">
        {parts.map((part, i) => {
          const m = part.match(/^\{\{(\d+)\}\}$/);
          if (!m) return <span key={i}>{part}</span>;
          const spec = question.clozeAnswers.find(c => c.blank === Number(m[1]));
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border border-dashed border-sky-500/50 bg-sky-500/5 text-xs font-mono text-sky-700 dark:text-sky-300"
            >
              {spec?.accepted.length ? spec.accepted.join(" / ") : `{{${m[1]}}}`}
            </span>
          );
        })}
      </p>
      {question.explanation && (
        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2">
          💡 {question.explanation}
        </p>
      )}
    </div>
  );
}
