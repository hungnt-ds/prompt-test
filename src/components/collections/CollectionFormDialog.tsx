import { useEffect, useState } from "react";
import { X, Loader2, Check, FolderPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  listTags,
  type Collection,
  type Tag,
} from "@/services/vocabApi";

/** Slug do người dùng nhập được chuẩn hóa cho khớp pattern của API. */
function slugify(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Dialog tạo lộ trình mới hoặc sửa/xóa lộ trình có sẵn.
 * `parentId` để tạo thư mục con ngay bên trong một lộ trình.
 */
export function CollectionFormDialog({
  editing,
  parentId,
  parentTitle,
  onClose,
  onSaved,
  onDeleted,
}: {
  editing?: Collection;
  parentId?: number | null;
  parentTitle?: string;
  onClose: () => void;
  onSaved: (c: Collection) => void;
  onDeleted?: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  // Slug tự sinh theo tên cho tới khi người dùng tự sửa.
  const [slugOverride, setSlugOverride] = useState<string | null>(editing?.slug ?? null);
  const slug = slugOverride ?? slugify(title);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [difficulty, setDifficulty] = useState<number>(editing?.difficulty ?? 0);
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void listTags("collection").then(setAllTags).catch(() => {});
  }, []);

  const toggleTag = (name: string) =>
    setTags(prev => (prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]));

  const addNewTag = () => {
    const name = newTag.trim();
    if (!name) return;
    if (!tags.includes(name)) setTags(prev => [...prev, name]);
    setNewTag("");
  };

  const save = async () => {
    if (!title.trim() || !slug.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || null,
        difficulty: difficulty > 0 ? difficulty : null,
        tags,
        ...(editing ? {} : { parentId: parentId ?? null }),
      };
      const saved = editing ? await updateCollection(editing.id, body) : await createCollection(body);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCollection(editing.id);
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const tagNames = [...new Set([...allTags.map(t => t.name), ...tags])].sort();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(92vw,28rem)] max-h-[85vh] overflow-y-auto scrollbar-thin rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl shadow-black/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            {editing ? "Sửa lộ trình" : parentTitle ? `Thư mục con trong "${parentTitle}"` : "Tạo lộ trình mới"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">Tên lộ trình *</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            placeholder="Từ vựng VIP 90 Cô MP (2026)"
            className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">Slug (định danh, dùng cho URL) *</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlugOverride(e.target.value)}
            onBlur={() => setSlugOverride(s => (s === null ? null : slugify(s)))}
            placeholder="tu-vung-vip-90"
            className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">Mô tả</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-y"
          />
        </label>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500">Độ khó</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setDifficulty(n)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors",
                  difficulty === n
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500"
                )}
              >
                {n === 0 ? "—" : `${n}/5`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500">
            Tag nhóm (quyết định lộ trình nằm ở section nào)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tagNames.map(name => (
              <button
                key={name}
                onClick={() => toggleTag(name)}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-xs transition-colors",
                  tags.includes(name)
                    ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500"
                )}
              >
                {allTags.find(t => t.name === name)?.label ?? name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addNewTag())}
              placeholder="Nhóm mới, vd: Sách IELTS"
              className="flex-1 min-w-0 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addNewTag}
              disabled={!newTag.trim()}
              className="px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              Thêm
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => void save()}
            disabled={busy || !title.trim() || !slug.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editing ? "Lưu thay đổi" : "Tạo lộ trình"}
          </button>
          {editing &&
            (confirmDelete ? (
              <button
                onClick={() => void remove()}
                disabled={busy}
                className="px-3 py-2.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/40 hover:bg-red-500/20 whitespace-nowrap"
              >
                Xóa thật?
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Xóa lộ trình (từ vựng bên trong không bị xóa)"
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ))}
        </div>
        {editing && confirmDelete && (
          <p className="text-[10px] text-slate-500">
            Xóa cả nhánh con. Từ vựng / bài tập bên trong vẫn giữ nguyên, chỉ gỡ liên kết.
          </p>
        )}
      </div>
    </>
  );
}
