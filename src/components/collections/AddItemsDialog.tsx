import { useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2, Check, Search, CheckSquare, Square, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listWords,
  listExercises,
  addWordsToCollection,
  addExercisesToCollection,
} from "@/services/vocabApi";

interface Row {
  id: number;
  primary: string;
  secondary?: string;
}

/**
 * Dialog chọn từ vựng (hoặc bài tập) có sẵn để thêm vào một collection.
 * Tìm kiếm + tick nhiều, thêm một lần bằng POST /api/collections/:id/{words|exercises}.
 */
export function AddItemsDialog({
  collectionId,
  collectionTitle,
  kind,
  onClose,
  onAdded,
}: {
  collectionId: number;
  collectionTitle: string;
  kind: "words" | "exercises";
  onClose: () => void;
  onAdded: (count: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const q = debounced || undefined;
    const load =
      kind === "words"
        ? listWords({ q, limit: 100 }).then(r =>
            r.words.map<Row>(w => ({
              id: w.id,
              primary: w.headword,
              secondary: w.senses[0]?.definition,
            }))
          )
        : listExercises({ q, limit: 100 }).then(r =>
            r.exercises.map<Row>(e => ({
              id: e.id,
              primary: e.title,
              secondary: `${e.questionCount} câu`,
            }))
          );
    void load
      .then(list => {
        if (!cancelled) setRows(list);
      })
      .catch(e => {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, kind]);

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = useMemo(
    () => !!rows && rows.length > 0 && rows.every(r => selected.has(r.id)),
    [rows, selected]
  );

  const submit = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const ids = [...selected];
      if (kind === "words") await addWordsToCollection(collectionId, ids);
      else await addExercisesToCollection(collectionId, ids);
      onAdded(ids.length);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const label = kind === "words" ? "từ" : "bài tập";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(92vw,30rem)] max-h-[85vh] flex flex-col rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-300/60 dark:border-slate-800/60">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 flex items-center gap-2 min-w-0">
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">Thêm {label} vào "{collectionTitle}"</span>
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto scrollbar-thin flex-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                placeholder={kind === "words" ? "Tìm từ…" : "Tìm bài tập…"}
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() =>
                setSelected(prev => {
                  const next = new Set(prev);
                  if (allSelected) rows?.forEach(r => next.delete(r.id));
                  else rows?.forEach(r => next.add(r.id));
                  return next;
                })
              }
              disabled={!rows?.length}
              className="px-3 rounded-lg border border-slate-300 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-blue-500 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              Chọn hết
            </button>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          {!rows ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600 italic">
              Không tìm thấy {label} nào.
            </p>
          ) : (
            <ul className="space-y-1">
              {rows.map(row => {
                const checked = selected.has(row.id);
                return (
                  <li key={row.id}>
                    <button
                      onClick={() => toggle(row.id)}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                        checked
                          ? "border-blue-500/60 bg-blue-500/5"
                          : "border-slate-300/60 dark:border-slate-800/60 hover:border-slate-400 dark:hover:border-slate-700"
                      )}
                    >
                      <span className={cn("mt-0.5 shrink-0", checked ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-600")}>
                        {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {row.primary}
                        </span>
                        {row.secondary && (
                          <span className="block text-xs text-slate-500 line-clamp-1">{row.secondary}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-300/60 dark:border-slate-800/60">
          <button
            onClick={() => void submit()}
            disabled={busy || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Thêm {selected.size > 0 ? selected.size : ""} {label}
          </button>
        </div>
      </div>
    </>
  );
}
