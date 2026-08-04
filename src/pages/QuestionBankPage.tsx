import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckSquare,
  Square,
  X,
  Shuffle,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiSettings } from "@/components/ApiSettings";
import {
  listQuestions,
  listExercises,
  composeExercise,
  type BankQuestion,
  type ExerciseListItem,
  type Pagination,
  type QuestionListQuery,
  type Exercise,
} from "@/services/vocabApi";

const TYPE_BADGE: Record<string, string> = {
  mcq: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  cloze: "text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/30",
  dialogue: "text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
};
const TYPE_LABEL: Record<string, string> = { mcq: "Trắc nghiệm", cloze: "Điền câu", dialogue: "Đối thoại" };

/** Hiển thị prompt cloze: thay {{n}} bằng ô trống. */
function displayPrompt(q: BankQuestion): string {
  return q.type === "cloze" ? q.prompt.replace(/\{\{(\d+)\}\}/g, "〔$1〕") : q.prompt;
}

interface QueryResult {
  key: string;
  questions: BankQuestion[];
  pagination: Pagination | null;
  error: string | null;
}

export function QuestionBankPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"" | "mcq" | "cloze" | "dialogue">("");
  const [exerciseId, setExerciseId] = useState<string>("");
  const [page, setPage] = useState(1);
  // Phạm vi lộ trình đến từ trang thư mục: /exercises/questions?collection=slug
  const [searchParams] = useSearchParams();
  const collection = searchParams.get("collection") || undefined;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);

  const debounceRef = useRef<number | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [search]);

  const filterQuery = useMemo<QuestionListQuery>(
    () => ({
      q: debouncedSearch || undefined,
      type: type || undefined,
      exerciseId: exerciseId ? Number(exerciseId) : undefined,
      collection,
    }),
    [debouncedSearch, type, exerciseId, collection]
  );

  const queryKey = JSON.stringify([filterQuery, page, reloadTick]);

  useEffect(() => {
    let cancelled = false;
    listQuestions({ ...filterQuery, page, limit: 20 })
      .then(r => {
        if (!cancelled) setResult({ key: queryKey, questions: r.questions, pagination: r.pagination, error: null });
      })
      .catch(e => {
        if (!cancelled)
          setResult({
            key: queryKey,
            questions: [],
            pagination: null,
            error: e instanceof Error ? e.message : String(e),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [filterQuery, page, reloadTick, queryKey]);

  useEffect(() => {
    void listExercises({ limit: 100 }).then(r => setExercises(r.exercises)).catch(() => {});
  }, [reloadTick]);

  const loading = !result || result.key !== queryKey;
  const questions = result?.questions ?? [];
  const pagination = result?.pagination ?? null;
  const error = !loading ? result?.error ?? null : null;

  const toggleSelect = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageAllSelected = questions.length > 0 && questions.every(q => selected.has(q.id));
  const togglePage = () =>
    setSelected(prev => {
      const next = new Set(prev);
      if (pageAllSelected) questions.forEach(q => next.delete(q.id));
      else questions.forEach(q => next.add(q.id));
      return next;
    });

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={collection ? `/exercises/c/${collection}` : "/exercises"}
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Ngân hàng câu hỏi</h1>
            <p className="hidden sm:block text-[11px] text-slate-500">
              {collection
                ? `Câu trong lộ trình "${collection}" — tick chọn rồi trộn đề`
                : "Một câu nằm được trong nhiều đề — tick chọn hoặc lọc rồi trộn thành đề mới"}
            </p>
          </div>
        </div>
        <ApiSettings onSaved={() => setReloadTick(t => t + 1)} />
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-5">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm trong đề bài…"
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={type}
                onChange={e => { setType(e.target.value as "" | "mcq" | "cloze" | "dialogue"); setPage(1); }}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              >
                <option value="">Mọi loại câu</option>
                <option value="mcq">Trắc nghiệm</option>
                <option value="cloze">Điền câu</option>
                <option value="dialogue">Đối thoại</option>
              </select>
              <select
                value={exerciseId}
                onChange={e => { setExerciseId(e.target.value); setPage(1); }}
                className="max-w-[200px] rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              >
                <option value="">Mọi đề</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.title}</option>
                ))}
              </select>
              <button
                onClick={togglePage}
                disabled={questions.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-500 dark:hover:border-slate-600 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {pageAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                Chọn trang
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải câu hỏi…
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-600 italic">
              Không có câu hỏi nào khớp bộ lọc.
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map(q => {
                const checked = selected.has(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleSelect(q.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                      checked
                        ? "border-blue-500/60 bg-blue-500/5"
                        : "border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-700"
                    )}
                  >
                    <span className={cn("mt-0.5 shrink-0", checked ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-600")}>
                      {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-2">
                        {displayPrompt(q)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={cn("px-2 py-0.5 rounded-full border font-bold", TYPE_BADGE[q.type])}>
                          {TYPE_LABEL[q.type]}
                        </span>
                        {q.type === "mcq" && q.options && (
                          <span className="text-slate-500">{q.options.length} lựa chọn</span>
                        )}
                        {q.type === "cloze" && q.clozeAnswers && (
                          <span className="text-slate-500">{q.clozeAnswers.length} chỗ trống</span>
                        )}
                        {q.usedIn.map(u => (
                          <span key={u.id} className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 truncate max-w-[160px]">
                            {u.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* chừa chỗ cho thanh chọn */}
        <div className="h-20" />
      </div>

      {/* Bottom bar: selection + compose + pagination */}
      <footer className="shrink-0 border-t border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-[#0d1424] px-4 md:px-6 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {selected.size > 0 ? (
              <>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{selected.size} câu đã chọn</span>
                <button onClick={() => setSelected(new Set())} title="Bỏ chọn hết" className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span>{pagination?.total ?? 0} câu trong ngân hàng</span>
            )}
            <button
              onClick={() => setComposeOpen(true)}
              disabled={loading || (selected.size === 0 && questions.length === 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
            >
              <Layers className="w-3.5 h-3.5" />
              {selected.size > 0 ? `Tạo đề từ ${selected.size} câu` : "Tạo đề từ bộ lọc"}
            </button>
          </div>
          {pagination && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums">{pagination.page}/{Math.max(1, pagination.totalPages)}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.totalPages || loading}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </footer>

      {composeOpen && (
        <ComposeDialog
          selectedIds={[...selected]}
          filterQuery={filterQuery}
          filteredTotal={pagination?.total ?? 0}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  );
}

// ---------- Dialog trộn đề ----------

function ComposeDialog({
  selectedIds,
  filterQuery,
  filteredTotal,
  onClose,
}: {
  selectedIds: number[];
  filterQuery: QuestionListQuery;
  filteredTotal: number;
  onClose: () => void;
}) {
  const fromSelection = selectedIds.length > 0;
  const sourceCount = fromSelection ? selectedIds.length : filteredTotal;

  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [countInput, setCountInput] = useState(String(Math.min(20, Math.max(1, sourceCount))));
  const [order, setOrder] = useState<"shuffle" | "by-type" | "source">("shuffle");
  const [state, setState] = useState<
    { s: "idle" } | { s: "sending" } | { s: "done"; exercise: Exercise } | { s: "error"; error: string }
  >({ s: "idle" });

  const maxCount = Math.min(100, Math.max(1, sourceCount));

  /** Bộ lọc có `q` không diễn đạt được trong compose.from — gom id qua phân trang. */
  const collectFilteredIds = async (): Promise<number[]> => {
    const ids: number[] = [];
    for (let p = 1; p <= 5 && ids.length < 500; p++) {
      const r = await listQuestions({ ...filterQuery, page: p, limit: 100 });
      ids.push(...r.questions.map(q => q.id));
      if (p >= r.pagination.totalPages) break;
    }
    return ids;
  };

  const submit = async () => {
    setState({ s: "sending" });
    try {
      const ids = fromSelection ? selectedIds : await collectFilteredIds();
      if (ids.length === 0) throw new Error("Không có câu hỏi nào để tạo đề.");
      const count = Math.min(Math.max(1, Math.floor(Number(countInput)) || 20), 100, ids.length);
      const tags = tagsInput
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      const exercise = await composeExercise({
        title: title.trim() || undefined,
        tags: tags.length ? tags : undefined,
        from: { questionIds: ids },
        count,
        order,
      });
      setState({ s: "done", exercise });
    } catch (e) {
      setState({ s: "error", error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(92vw,26rem)] rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl shadow-black/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Shuffle className="w-4 h-4" /> Tạo bộ đề mới
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {state.s === "done" ? (
          <div className="space-y-3 text-center py-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 dark:text-emerald-400" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{state.exercise.title}</p>
            <p className="text-xs text-slate-500">
              Đã tạo đề với {state.exercise.questions.length} câu (source: composed) — có thẻ ôn FSRS riêng.
            </p>
            <div className="flex items-center justify-center gap-3 text-sm">
              <Link
                to={`/exercises/${state.exercise.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                Làm đề ngay <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Nguồn:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {fromSelection ? `${selectedIds.length} câu đã chọn` : `${filteredTotal} câu khớp bộ lọc hiện tại`}
              </span>
              . Câu chỉ được liên kết — đề gốc giữ nguyên.
            </p>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Tên đề (bỏ trống = tự đặt)</span>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ôn tổng hợp tuần 3…"
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Tags (phân cách dấu phẩy)</span>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="tong-hop, unit-3"
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              />
            </label>

            <div className="flex gap-3">
              <label className="block space-y-1 w-28">
                <span className="text-[11px] font-semibold text-slate-500">Số câu (≤ {maxCount})</span>
                <input
                  type="number"
                  min={1}
                  max={maxCount}
                  value={countInput}
                  onChange={e => setCountInput(e.target.value)}
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                />
              </label>
              <label className="block space-y-1 flex-1">
                <span className="text-[11px] font-semibold text-slate-500">Thứ tự câu</span>
                <select
                  value={order}
                  onChange={e => setOrder(e.target.value as typeof order)}
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                >
                  <option value="shuffle">Xáo ngẫu nhiên</option>
                  <option value="by-type">Theo loại (mcq trước, cloze sau)</option>
                  <option value="source">Gom theo đề gốc</option>
                </select>
              </label>
            </div>

            {state.s === "error" && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <XCircle className="w-3.5 h-3.5 shrink-0" /> {state.error}
              </p>
            )}

            <button
              onClick={() => void submit()}
              disabled={state.s === "sending" || sourceCount === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
            >
              {state.s === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              Tạo đề
            </button>
          </>
        )}
      </div>
    </>
  );
}
