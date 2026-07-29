import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  BookOpen,
  ListChecks,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiSettings } from "@/components/ApiSettings";
import { importMarkdownFiles, type MultiImportResult } from "@/services/vocabApi";

const VOCAB_TEMPLATE = `---
type: vocab
tags: [ielts, unit-3]        # áp cho mọi từ trong file
---

## meticulous /məˈtɪkjələs/  # «## headword /phát âm/» — phát âm optional
- adj. showing great attention to detail      # «- pos. định nghĩa»
  - She kept meticulous records.              # list lồng cấp 2 = câu ví dụ
- adv. (meticulously) in a careful way

> Note: Collocates: meticulous records / planning.
> Marks: favorite            # favorite, difficult
> Tags: adjectives           # tag riêng, gộp với tags của file`;

const EXERCISE_TEMPLATE = `---
type: exercise
title: Phrasal Verbs — Set 1   # bắt buộc
slug: phrasal-verbs-set-1      # optional, unique — import lại sẽ upsert
tags: [phrasal-verbs, b2]
---

## mcq
What does "give up" most nearly mean?

- [ ] to donate something
- [x] to stop trying           # đúng 1 đáp án [x], 2–8 lựa chọn
- [ ] to increase gradually

> Explanation: "Give up" means to quit or abandon an effort.

## cloze
She decided to {{give up|quit}} smoking, and she {{succeeded}}.
# mỗi {{...}} là một chỗ trống; | tách các đáp án chấp nhận`;

type UploadState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done"; result: MultiImportResult }
  | { status: "error"; error: string };

export function ExerciseUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"upsert" | "create">("upsert");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [showGuide, setShowGuide] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | File[]) => {
    const mdFiles = [...list].filter(f => f.name.endsWith(".md") || f.type === "text/markdown");
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...mdFiles.filter(f => !names.has(f.name))];
    });
    setUpload({ status: "idle" });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUpload({ status: "sending" });
    try {
      const result = await importMarkdownFiles(files, mode);
      setUpload({ status: "done", result });
    } catch (e) {
      setUpload({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 pl-16 pr-4 md:px-6 shrink-0 border-b border-slate-300/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/exercises"
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Import file Markdown</h1>
            <p className="hidden sm:block text-[11px] text-slate-500">
              Nạp từ vựng &amp; bài tập từ file .md — tự nhận diện loại từng file
            </p>
          </div>
        </div>
        <ApiSettings />
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              dragging
                ? "border-blue-500/60 bg-blue-500/5"
                : "border-slate-300 dark:border-slate-800 hover:border-slate-500 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900/40"
            )}
          >
            <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Kéo thả file .md vào đây, hoặc bấm để chọn</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
              Chọn được nhiều file — mỗi file là <span className="font-mono">type: vocab</span> hoặc{" "}
              <span className="font-mono">type: exercise</span> trong frontmatter
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,text/markdown"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map(f => (
                <div
                  key={f.name}
                  className="flex items-center gap-3 rounded-lg border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 px-3 py-2"
                >
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm text-slate-800 dark:text-slate-200 font-mono">{f.name}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-600">{(f.size / 1024).toFixed(1)} KB</span>
                  <button
                    onClick={() => setFiles(prev => prev.filter(x => x.name !== f.name))}
                    className="text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mode + submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={mode}
              onChange={e => setMode(e.target.value as "upsert" | "create")}
              className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
            >
              <option value="upsert">Upsert — trùng thì cập nhật, giữ tiến độ ôn tập</option>
              <option value="create">Create — trùng thì báo conflict, không ghi đè</option>
            </select>
            <button
              onClick={() => void handleUpload()}
              disabled={files.length === 0 || upload.status === "sending"}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {upload.status === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {upload.status === "sending" ? "Đang nạp…" : `Nạp ${files.length || ""} file lên API`}
            </button>
          </div>

          {/* Error */}
          {upload.status === "error" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              {upload.error}
            </div>
          )}

          {/* Per-file results */}
          {upload.status === "done" && (
            <div className="space-y-2">
              {upload.result.files.map(f => (
                <div
                  key={f.name}
                  className={cn(
                    "rounded-xl border p-3 space-y-1.5",
                    f.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {f.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
                    {f.type && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {f.type === "vocab" ? <BookOpen className="w-3 h-3" /> : <ListChecks className="w-3 h-3" />}
                        {f.type}
                      </span>
                    )}
                    {f.ok && (
                      <span className="ml-auto text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        +{f.created} mới · {f.updated} cập nhật
                      </span>
                    )}
                  </div>
                  {!f.ok && f.errors.length > 0 && (
                    <ul className="pl-6 space-y-0.5">
                      {f.errors.map((err, i) => (
                        <li key={i} className="text-xs text-red-700 dark:text-red-300">
                          Dòng {err.line}: {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {f.ok && f.items.some(it => it.action === "conflict") && (
                    <p className="pl-6 text-xs text-amber-600 dark:text-amber-400">
                      {f.items.filter(it => it.action === "conflict").length} mục bị trùng (conflict) — không ghi đè.
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-slate-500">
                Item mới sẽ xuất hiện ngay trong danh sách và hàng ôn tập (thẻ trạng thái{" "}
                <span className="font-mono">new</span>).
              </p>
            </div>
          )}

          {/* Format guide */}
          <div className="rounded-xl border border-slate-300/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 overflow-hidden">
            <button
              onClick={() => setShowGuide(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors"
            >
              Định dạng file .md
              <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", showGuide && "rotate-180")} />
            </button>
            {showGuide && (
              <div className="px-4 pb-4 grid lg:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Từ vựng (type: vocab)
                  </h3>
                  <pre className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 overflow-x-auto scrollbar-thin">
                    {VOCAB_TEMPLATE}
                  </pre>
                </div>
                <div className="space-y-2 min-w-0">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <ListChecks className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Bài tập (type: exercise)
                  </h3>
                  <pre className="rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 overflow-x-auto scrollbar-thin">
                    {EXERCISE_TEMPLATE}
                  </pre>
                </div>
                <p className="lg:col-span-2 text-[11px] text-slate-400 dark:text-slate-600 leading-relaxed">
                  File có lỗi cú pháp sẽ bị từ chối kèm số dòng, các file khác vẫn được nạp bình thường. File mẫu:
                  thư mục <span className="font-mono">samples/</span> trong repo.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
