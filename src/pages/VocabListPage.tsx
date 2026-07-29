import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Star,
  Flame,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  StickyNote,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { ApiSettings } from "@/components/ApiSettings";
import { VoiceSettings } from "@/components/ipa/VoiceSettings";
import { TagEditor } from "@/components/TagEditor";
import { TagManager } from "@/components/TagManager";
import {
  listWords,
  listTags,
  patchWord,
  setWordTags,
  POS_VALUES,
  type Word,
  type Pagination,
  type TagWithCounts,
} from "@/services/vocabApi";

const POS_BADGE: Record<string, string> = {
  noun: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
  verb: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  adj: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  adv: "text-pink-600 dark:text-pink-400 bg-pink-500/10",
  "phrasal-verb": "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  idiom: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
};

interface QueryResult {
  key: string;
  words: Word[];
  pagination: Pagination | null;
  error: string | null;
}

export function VocabListPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [tags, setTags] = useState<TagWithCounts[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [tagsTick, setTagsTick] = useState(0);
  const [editingTagsOf, setEditingTagsOf] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [pos, setPos] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [page, setPage] = useState(1);

  const { speak, speaking, supported } = useSpeech();
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

  const queryKey = JSON.stringify([debouncedSearch, tag, pos, onlyFavorite, onlyDifficult, page, reloadTick]);

  useEffect(() => {
    let cancelled = false;
    listWords({
      q: debouncedSearch || undefined,
      tag: tag || undefined,
      pos: pos || undefined,
      favorite: onlyFavorite || undefined,
      difficult: onlyDifficult || undefined,
      page,
      limit: 20,
    })
      .then(r => {
        if (!cancelled) setResult({ key: queryKey, words: r.words, pagination: r.pagination, error: null });
      })
      .catch(e => {
        if (!cancelled)
          setResult({ key: queryKey, words: [], pagination: null, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, tag, pos, onlyFavorite, onlyDifficult, page, reloadTick, queryKey]);

  useEffect(() => {
    void listTags().then(setTags).catch(() => {});
  }, [tagsTick]);

  // Loading is derived: the stored result doesn't match the current query yet.
  const loading = !result || result.key !== queryKey;
  const words = result?.words ?? [];
  const pagination = result?.pagination ?? null;
  const error = !loading ? result?.error ?? null : null;
  const load = useCallback(() => setReloadTick(t => t + 1), []);

  const wordTags = useMemo(() => tags.filter(t => t.wordCount > 0), [tags]);

  const saveWordTags = async (word: Word, newTags: string[]) => {
    const updated = await setWordTags(word.id, newTags);
    setResult(r => r && { ...r, words: r.words.map(w => (w.id === word.id ? { ...w, tags: updated.tags } : w)) });
    setTagsTick(t => t + 1); // số lượng theo tag đã đổi
  };

  const toggleMark = async (word: Word, field: "favorite" | "difficult") => {
    const next = !word[field];
    const apply = (value: boolean) =>
      setResult(r => r && { ...r, words: r.words.map(w => (w.id === word.id ? { ...w, [field]: value } : w)) });
    apply(next); // optimistic; roll back on failure
    try {
      await patchWord(word.id, { [field]: next });
    } catch {
      apply(!next);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Từ vựng</h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Kho từ vựng từ vocab-api — nhấn 🔊 để nghe phát âm
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TagManager
            onChanged={() => {
              setTagsTick(t => t + 1);
              load();
            }}
          />
          <VoiceSettings />
          <ApiSettings onSaved={load} />
        </div>
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
                placeholder="Tìm trong từ và nghĩa…"
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
                {wordTags.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.wordCount})
                  </option>
                ))}
              </select>
              <select
                value={pos}
                onChange={e => { setPos(e.target.value); setPage(1); }}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              >
                <option value="">Mọi loại từ</option>
                {POS_VALUES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={() => { setOnlyFavorite(v => !v); setPage(1); }}
                title="Chỉ hiện từ yêu thích"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  onlyFavorite
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
                    : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-500 dark:hover:border-slate-600"
                )}
              >
                <Star className={cn("w-4 h-4", onlyFavorite && "fill-current")} />
              </button>
              <button
                onClick={() => { setOnlyDifficult(v => !v); setPage(1); }}
                title="Chỉ hiện từ khó"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  onlyDifficult
                    ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-500 dark:hover:border-slate-600"
                )}
              >
                <Flame className="w-4 h-4" />
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
              Đang tải từ vựng…
            </div>
          ) : words.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-600 italic">
              {error ? "Không có dữ liệu." : "Chưa có từ nào khớp bộ lọc — import file .md ở tab Bài tập → Tải lên."}
            </div>
          ) : (
            <div className="space-y-3">
              {words.map(word => (
                <article
                  key={word.id}
                  className="rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{word.headword}</h3>
                      {word.pronunciation && (
                        <span className="text-sm text-slate-500 font-mono">{word.pronunciation}</span>
                      )}
                      {supported && (
                        <button
                          onClick={() => speak(word.headword, String(word.id))}
                          title="Nghe phát âm"
                          className={cn(
                            "text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
                            speaking === String(word.id) && "text-blue-600 dark:text-blue-400"
                          )}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => void toggleMark(word, "favorite")}
                        title="Yêu thích"
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                          word.favorite
                            ? "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                            : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <Star className={cn("w-4 h-4", word.favorite && "fill-current")} />
                      </button>
                      <button
                        onClick={() => void toggleMark(word, "difficult")}
                        title="Từ khó"
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                          word.difficult
                            ? "text-red-600 dark:text-red-400 bg-red-500/10"
                            : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <Flame className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {word.senses.map(sense => (
                      <div key={sense.id} className="space-y-1">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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
                        {sense.examples.length > 0 && (
                          <ul className="pl-4 space-y-0.5">
                            {sense.examples.map(ex => (
                              <li key={ex.id} className="text-xs text-slate-500 italic leading-relaxed">
                                “{ex.sentence}”
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {word.notes && (
                    <p className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-line">
                      <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                      <span>{word.notes}</span>
                    </p>
                  )}

                  <div className="relative flex flex-wrap items-center gap-1.5">
                    {word.tags.map(t => (
                      <button
                        key={t}
                        onClick={() => { setTag(t); setPage(1); }}
                        className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                    <button
                      onClick={() => setEditingTagsOf(id => (id === word.id ? null : word.id))}
                      title="Sửa tag của từ này"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-400 dark:border-slate-700 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-500 transition-colors"
                    >
                      <TagIcon className="w-2.5 h-2.5" />
                      tag
                    </button>
                    {editingTagsOf === word.id && (
                      <TagEditor
                        current={word.tags}
                        onSave={tags => saveWordTags(word, tags)}
                        onClose={() => setEditingTagsOf(null)}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination footer */}
      {pagination && pagination.totalPages > 0 && (
        <footer className="shrink-0 border-t border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-4 md:px-6 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{pagination.total} từ</span>
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
