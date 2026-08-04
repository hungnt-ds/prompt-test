import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Search,
  Flag,
  Star,
  Flame,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiSettings } from "@/components/ApiSettings";
import { TagEditor } from "@/components/TagEditor";
import {
  listExercises,
  listTags,
  patchExercise,
  setExerciseTags,
  type ExerciseListItem,
  type ExerciseSource,
  type Pagination,
  type Tag,
} from "@/services/vocabApi";
import { useExerciseProgress } from "@/hooks/useExerciseProgress";

const SOURCE_LABEL: Record<ExerciseSource, string> = {
  manual: "tự soạn",
  imported: "import",
  generated: "auto-gen",
  composed: "đề trộn",
};

interface QueryResult {
  key: string;
  exercises: ExerciseListItem[];
  pagination: Pagination | null;
  error: string | null;
}

export function ExerciseListPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [source, setSource] = useState<ExerciseSource | "">("");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [page, setPage] = useState(1);

  const debounceRef = useRef<number | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingTagsOf, setEditingTagsOf] = useState<number | null>(null);
  const { bookmarks, toggleBookmark, results } = useExerciseProgress();

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [search]);

  const queryKey = JSON.stringify([debouncedSearch, tag, source, page, reloadTick]);

  useEffect(() => {
    let cancelled = false;
    listExercises({
      q: debouncedSearch || undefined,
      tag: tag || undefined,
      source: source || undefined,
      page,
      limit: 20,
    })
      .then(r => {
        if (!cancelled) setResult({ key: queryKey, exercises: r.exercises, pagination: r.pagination, error: null });
      })
      .catch(e => {
        if (!cancelled)
          setResult({
            key: queryKey,
            exercises: [],
            pagination: null,
            error: e instanceof Error ? e.message : String(e),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, tag, source, page, reloadTick, queryKey]);

  useEffect(() => {
    void listTags("exercise").then(setTags).catch(() => {});
  }, []);

  const loading = !result || result.key !== queryKey;
  const pagination = result?.pagination ?? null;
  const error = !loading ? result?.error ?? null : null;
  const load = useCallback(() => setReloadTick(t => t + 1), []);

  const exerciseTags = tags;

  // "Làm lại sau" is a client-side flag — filter the current page locally.
  const visible = useMemo(() => {
    const items = result?.exercises ?? [];
    return onlyBookmarked ? items.filter(e => bookmarks.includes(String(e.id))) : items;
  }, [result, onlyBookmarked, bookmarks]);

  const saveExerciseTags = async (ex: ExerciseListItem, newTags: string[]) => {
    const updated = await setExerciseTags(ex.id, newTags);
    setResult(r => r && { ...r, exercises: r.exercises.map(e => (e.id === ex.id ? { ...e, tags: updated.tags } : e)) });
    void listTags("exercise").then(setTags).catch(() => {});
  };

  const toggleMark = async (ex: ExerciseListItem, field: "favorite" | "difficult") => {
    const next = !ex[field];
    const apply = (value: boolean) =>
      setResult(r => r && { ...r, exercises: r.exercises.map(e => (e.id === ex.id ? { ...e, [field]: value } : e)) });
    apply(next);
    try {
      await patchExercise(ex.id, { [field]: next });
    } catch {
      apply(!next);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/exercises"
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Tất cả bài tập</h1>
            <p className="hidden sm:block text-[11px] text-slate-500">
              Trắc nghiệm, điền câu &amp; đối thoại — chọn bài để làm
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ApiSettings onSaved={load} />
          <Link
            to="/exercises/upload"
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 active:scale-95 transition-all whitespace-nowrap"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Import .md</span>
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên bài…"
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={tag}
                onChange={e => { setTag(e.target.value); setPage(1); }}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              >
                <option value="">Tất cả tag</option>
                {exerciseTags.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.label || t.name} ({t.usageCount})
                  </option>
                ))}
              </select>
              <select
                value={source}
                onChange={e => { setSource(e.target.value as ExerciseSource | ""); setPage(1); }}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              >
                <option value="">Mọi nguồn</option>
                <option value="manual">Tự soạn</option>
                <option value="imported">Import .md</option>
                <option value="generated">Auto-gen</option>
                <option value="composed">Đề trộn</option>
              </select>
              <button
                onClick={() => setOnlyBookmarked(v => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-colors whitespace-nowrap",
                  onlyBookmarked
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                    : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-500 dark:hover:border-slate-600"
                )}
              >
                <Flag className="w-4 h-4" />
                Làm lại sau
              </button>
            </div>
          </div>

          {/* Error */}
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
              Đang tải bài tập…
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-600 italic">
              {error ? "Không có dữ liệu." : "Chưa có bài tập nào khớp bộ lọc — bấm “Import .md” để nạp bài."}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visible.map(ex => {
                const exKey = String(ex.id);
                const lastResult = results[exKey];
                const bookmarked = bookmarks.includes(exKey);
                return (
                  <div
                    key={ex.id}
                    className="group relative rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
                  >
                    <Link to={`/exercises/${ex.id}`} className="block p-4 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug pr-16">{ex.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {SOURCE_LABEL[ex.source]}
                        </span>
                        {ex.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-slate-500">
                            {t}
                          </span>
                        ))}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => {
                            e.preventDefault();
                            setEditingTagsOf(id => (id === ex.id ? null : ex.id));
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setEditingTagsOf(id => (id === ex.id ? null : ex.id));
                            }
                          }}
                          title="Sửa tag của bài này"
                          className="px-2 py-0.5 rounded-full border border-dashed border-slate-400 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-500 transition-colors"
                        >
                          + tag
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <ListChecks className="w-3 h-3" />
                          {ex.questionCount} câu
                        </span>
                        {lastResult && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {lastResult.score}/{lastResult.gradedTotal}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="absolute top-3 right-3 flex items-center gap-0.5">
                      <button
                        onClick={() => void toggleMark(ex, "favorite")}
                        title="Yêu thích"
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                          ex.favorite
                            ? "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                            : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <Star className={cn("w-3.5 h-3.5", ex.favorite && "fill-current")} />
                      </button>
                      <button
                        onClick={() => void toggleMark(ex, "difficult")}
                        title="Bài khó"
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                          ex.difficult
                            ? "text-red-600 dark:text-red-400 bg-red-500/10"
                            : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <Flame className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleBookmark(exKey)}
                        title={bookmarked ? "Bỏ đánh dấu làm lại" : "Đánh dấu làm lại sau"}
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                          bookmarked
                            ? "text-orange-600 dark:text-orange-400 bg-orange-500/10"
                            : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <Flag className={cn("w-3.5 h-3.5", bookmarked && "fill-current")} />
                      </button>
                    </div>
                    {editingTagsOf === ex.id && (
                      <TagEditor
                        current={ex.tags}
                        onSave={tags => saveExerciseTags(ex, tags)}
                        onClose={() => setEditingTagsOf(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination footer */}
      {pagination && pagination.totalPages > 0 && (
        <footer className="shrink-0 border-t border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-4 md:px-6 py-2.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{pagination.total} bài tập</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums">
                {pagination.page}/{Math.max(1, pagination.totalPages)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.totalPages || loading}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
