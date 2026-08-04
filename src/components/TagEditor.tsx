import { useEffect, useState } from "react";
import { Plus, Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { listTags, type Tag, type TagType } from "@/services/vocabApi";

/** Server chuẩn hóa tên tag về lowercase-kebab — preview trước cho người dùng. */
function normalizeTagName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Popover sửa tag của một từ / bài tập: bật tắt tag có sẵn hoặc gõ tag mới
 * (tag chưa tồn tại được API tự tạo khi PUT). Gọi onSave với danh sách cuối.
 */
export function TagEditor({
  current,
  tagType = "word",
  onSave,
  onClose,
}: {
  current: string[];
  /** Tag thuộc loại nào — cùng tên ở hai type là hai tag độc lập. */
  tagType?: TagType;
  onSave: (tags: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(current);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listTags(tagType).then(setAllTags).catch(() => {});
  }, [tagType]);

  // Tag đang chọn nhưng chưa có trong danh sách chung (mới gõ) cũng hiện chip.
  const names = [...new Set([...allTags.map(t => t.name), ...selected])].sort();

  const toggle = (name: string) =>
    setSelected(prev => (prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]));

  const addNew = () => {
    const name = normalizeTagName(newTag);
    if (!name) return;
    if (!selected.includes(name)) setSelected(prev => [...prev, name]);
    setNewTag("");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full mt-2 z-50 w-[min(88vw,20rem)] rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl shadow-black/60 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">Sửa tag</h4>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
          {names.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-600 italic">Chưa có tag nào.</span>}
          {names.map(name => (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={cn(
                "px-2.5 py-1 rounded-full border text-xs transition-colors",
                selected.includes(name)
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-600"
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addNew()}
            placeholder="Tag mới (vd: unit-4)…"
            className="flex-1 min-w-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
          />
          <button
            onClick={addNew}
            disabled={!normalizeTagName(newTag)}
            title="Thêm vào danh sách chọn"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {newTag && normalizeTagName(newTag) !== newTag.trim() && (
          <p className="text-[10px] text-slate-400 dark:text-slate-600">
            Sẽ lưu thành: <span className="font-mono text-slate-600 dark:text-slate-400">{normalizeTagName(newTag)}</span>
          </p>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <button
          onClick={() => void save()}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Lưu tag
        </button>
      </div>
    </>
  );
}
