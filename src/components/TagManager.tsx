import { useEffect, useState } from "react";
import { Tags, X, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import {
  listTags,
  createTag,
  renameTag,
  deleteTag,
  type Tag,
} from "@/services/vocabApi";

/**
 * Nút + dialog quản lý tag toàn cục: tạo, đổi tên, xóa
 * (xóa chỉ gỡ liên kết — không xóa từ / bài tập).
 */
export function TagManager({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Quản lý tag"
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-500 dark:hover:border-slate-600 transition-all active:scale-95"
      >
        <Tags className="w-4 h-4" />
      </button>
      {open && <TagManagerDialog onClose={() => setOpen(false)} onChanged={onChanged} />}
    </>
  );
}

function TagManagerDialog({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const reload = () => listTags().then(setTags).catch(e => setError(String(e?.message ?? e)));

  useEffect(() => {
    void reload();
  }, []);

  const close = () => {
    if (dirty) onChanged?.();
    onClose();
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setDirty(true);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      await createTag(name);
      setNewName("");
    });
  };

  const handleRename = (id: number) => {
    const name = editName.trim();
    if (!name) return;
    void run(async () => {
      await renameTag(id, name);
      setEditingId(null);
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={close} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(92vw,26rem)] max-h-[80vh] flex flex-col rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-300/60 dark:border-slate-800/60">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Tags className="w-4 h-4" /> Quản lý tag
          </h3>
          <button onClick={close} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto scrollbar-thin">
          {/* Create */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="Tên tag mới (tự chuẩn hóa lowercase-kebab)…"
              className="flex-1 min-w-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || busy}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          {/* List */}
          {!tags ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải…
            </div>
          ) : tags.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-600 italic">Chưa có tag nào.</p>
          ) : (
            <ul className="space-y-1">
              {tags.map(t => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-3 py-2"
                >
                  {editingId === t.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRename(t.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 min-w-0 rounded bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-500"
                      />
                      <button
                        onClick={() => handleRename(t.id)}
                        disabled={busy}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate text-sm text-slate-800 dark:text-slate-200 font-mono">{t.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 whitespace-nowrap">
                        {t.usageCount} mục · {t.type}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditName(t.name);
                          setConfirmDeleteId(null);
                        }}
                        title="Đổi tên"
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === t.id ? (
                        <button
                          onClick={() => void run(async () => deleteTag(t.id))}
                          disabled={busy}
                          className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 whitespace-nowrap"
                        >
                          Xóa?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(t.id)}
                          title="Xóa tag (chỉ gỡ liên kết)"
                          className="text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] text-slate-400 dark:text-slate-600">
            Xóa tag chỉ gỡ liên kết khỏi từ / bài tập, không xóa nội dung.
          </p>
        </div>
      </div>
    </>
  );
}
