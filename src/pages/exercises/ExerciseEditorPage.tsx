import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  ListChecks,
  SquareDashedBottom,
  MessagesSquare,
  CheckCircle2,
  FilePlus2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiSettings } from "@/components/ApiSettings";
import { QuestionEditor } from "@/components/exercises/QuestionEditor";
import { emptyQuestion, validateQuestion } from "@/components/exercises/questionInput";
import {
  getExercise,
  createExercise,
  updateExercise,
  addExercisesToCollection,
  getCollection,
  ApiError,
  type QuestionInput,
  type Exercise,
} from "@/services/vocabApi";

// ============================================================
// Soạn / sửa một bộ đề: thông tin đề + danh sách câu hỏi.
// Mọi ràng buộc của API được kiểm ngay khi gõ, nút Lưu chỉ bật
// khi đề hợp lệ — tránh gửi lên rồi mới nhận 422.
// ============================================================

/** Chuyển Question (từ API) về QuestionInput để sửa. */
function toInput(q: Exercise["questions"][number]): QuestionInput {
  if (q.type === "mcq") {
    return {
      type: "mcq",
      prompt: q.prompt,
      options: (q.options ?? []).map(o => ({ text: o.text, isCorrect: o.isCorrect })),
      explanation: q.explanation ?? "",
    };
  }
  if (q.type === "dialogue") {
    return {
      type: "dialogue",
      prompt: q.prompt,
      turns: (q.turns ?? []).map(t => ({ ...t })),
      explanation: q.explanation ?? "",
    };
  }
  return {
    type: "cloze",
    prompt: q.prompt,
    clozeAnswers: (q.clozeAnswers ?? []).map(c => ({ blank: c.blank, accepted: [...c.accepted] })),
    explanation: q.explanation ?? "",
  };
}

/** Bỏ trường rỗng trước khi gửi API. */
function clean(q: QuestionInput): QuestionInput {
  const explanation = q.explanation?.trim() ? q.explanation.trim() : null;
  if (q.type === "mcq") {
    return {
      type: "mcq",
      prompt: q.prompt.trim(),
      options: q.options.map(o => ({ text: o.text.trim(), isCorrect: !!o.isCorrect })),
      explanation,
    };
  }
  if (q.type === "dialogue") {
    return {
      type: "dialogue",
      prompt: q.prompt.trim(),
      turns: q.turns.map(t => ({ speaker: t.speaker.trim(), text: t.text.trim(), hidden: !!t.hidden })),
      explanation,
    };
  }
  return {
    type: "cloze",
    prompt: q.prompt.trim(),
    clozeAnswers: q.clozeAnswers
      .filter(c => c.accepted.some(a => a.trim()))
      .map(c => ({ blank: c.blank, accepted: c.accepted.map(a => a.trim()).filter(Boolean) })),
    explanation,
  };
}

const ADD_BUTTONS: { type: QuestionInput["type"]; label: string; icon: typeof ListChecks; cls: string }[] = [
  { type: "mcq", label: "Trắc nghiệm", icon: ListChecks, cls: "hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400" },
  { type: "cloze", label: "Điền câu", icon: SquareDashedBottom, cls: "hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400" },
  { type: "dialogue", label: "Đối thoại", icon: MessagesSquare, cls: "hover:border-purple-500 hover:text-purple-700 dark:hover:text-purple-400" },
];

export function ExerciseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const editingId = id ? Number(id) : null;
  const [searchParams] = useSearchParams();
  const collectionSlug = searchParams.get("collection");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Lỗi API theo chỉ số câu hỏi (đọc từ errors[].path) */
  const [fieldErrors, setFieldErrors] = useState<Record<number, string[]>>({});

  // Nạp đề khi sửa
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    getExercise(editingId)
      .then(ex => {
        if (cancelled) return;
        setTitle(ex.title);
        setDescription(ex.description ?? "");
        setTagsInput(ex.tags.join(", "));
        setQuestions(ex.questions.map(toInput));
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const invalidCount = useMemo(
    () => questions.filter(q => validateQuestion(q).length > 0).length,
    [questions]
  );
  const canSave = title.trim().length > 0 && questions.length > 0 && invalidCount === 0;

  const setQuestion = (i: number, q: QuestionInput) =>
    setQuestions(prev => prev.map((old, idx) => (idx === i ? q : old)));

  const addQuestion = (type: QuestionInput["type"]) =>
    setQuestions(prev => [...prev, emptyQuestion(type)]);

  const moveQuestion = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    setQuestions(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      tags,
      questions: questions.map(clean),
    };
    try {
      const saved = editingId ? await updateExercise(editingId, body) : await createExercise(body);
      // Soạn từ trong một lộ trình thì gắn luôn đề vào lộ trình đó.
      if (!editingId && collectionSlug) {
        try {
          const col = await getCollection(collectionSlug);
          await addExercisesToCollection(col.id, [saved.id]);
        } catch {
          /* gắn thất bại không chặn việc lưu đề */
        }
      }
      navigate(`/exercises/${saved.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.errors?.length) {
        const byIndex: Record<number, string[]> = {};
        for (const err of e.errors) {
          const idx = err.path?.[0] === "questions" ? Number(err.path[1]) : NaN;
          if (Number.isInteger(idx)) (byIndex[idx] ??= []).push(err.message);
        }
        setFieldErrors(byIndex);
        setError(
          Object.keys(byIndex).length
            ? "API từ chối một số câu — xem lỗi trên từng thẻ bên dưới."
            : e.errors.map(x => x.message).join("; ")
        );
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      setSaving(false);
    }
  };

  const backTo = collectionSlug
    ? `/exercises/c/${collectionSlug}`
    : editingId
      ? `/exercises/${editingId}`
      : "/exercises";

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#0b1120] text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải đề…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={backTo}
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold truncate">
              {editingId ? "Sửa bộ đề" : "Soạn bộ đề mới"}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-500">
              {questions.length} câu
              {invalidCount > 0 && <span className="text-amber-600 dark:text-amber-400"> · {invalidCount} câu chưa hợp lệ</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ApiSettings />
          <button
            onClick={() => void save()}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden md:inline">{editingId ? "Lưu thay đổi" : "Tạo đề"}</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Thông tin đề */}
          <section className="rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Tên đề *</span>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus={!editingId}
                placeholder="Vd: Kiểm tra Unit 3 — Phrasal verbs"
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Mô tả</span>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ngắn gọn nội dung đề"
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Tags (ngăn bằng dấu phẩy)</span>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="unit-3, phrasal-verbs"
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </label>
            </div>
            {collectionSlug && !editingId && (
              <p className="text-[11px] text-blue-700 dark:text-blue-400">
                Đề sẽ được thêm vào lộ trình <span className="font-mono">{collectionSlug}</span> sau khi tạo.
              </p>
            )}
          </section>

          {/* Danh sách câu hỏi */}
          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 py-12 text-center space-y-3">
              <FilePlus2 className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
              <p className="text-sm text-slate-500">Đề chưa có câu nào — chọn loại câu để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionEditor
                  key={i}
                  question={q}
                  index={i}
                  total={questions.length}
                  serverErrors={fieldErrors[i]}
                  onChange={next => setQuestion(i, next)}
                  onRemove={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))}
                  onMove={dir => moveQuestion(i, dir)}
                  onDuplicate={() =>
                    setQuestions(prev => [
                      ...prev.slice(0, i + 1),
                      JSON.parse(JSON.stringify(q)) as QuestionInput,
                      ...prev.slice(i + 1),
                    ])
                  }
                />
              ))}
            </div>
          )}

          {/* Thêm câu */}
          <div className="grid grid-cols-3 gap-2">
            {ADD_BUTTONS.map(({ type, label, icon: Icon, cls }) => (
              <button
                key={type}
                onClick={() => addQuestion(type)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 py-4 text-slate-600 dark:text-slate-400 transition-colors",
                  cls
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">Thêm {label}</span>
              </button>
            ))}
          </div>

          {/* Trạng thái sẵn sàng lưu */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
              canSave
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                : "text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/60 dark:border-slate-800/60"
            )}
          >
            {canSave ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {canSave
              ? `Sẵn sàng lưu — ${questions.length} câu hợp lệ.`
              : !title.trim()
                ? "Cần đặt tên đề."
                : questions.length === 0
                  ? "Cần ít nhất 1 câu hỏi."
                  : `Còn ${invalidCount} câu chưa hợp lệ.`}
          </div>
        </div>
      </div>
    </div>
  );
}
