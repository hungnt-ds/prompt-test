import { useState } from "react";
import { Settings2, ChevronDown, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase, getApiKey, setApiConfig, checkHealth } from "@/services/vocabApi";

/**
 * Collapsible vocab-api connection settings (base URL + API key).
 * Values persist in localStorage; every page's next request picks them up.
 */
export function ApiSettings({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState(getApiBase);
  const [key, setKey] = useState(getApiKey);
  const [health, setHealth] = useState<"idle" | "checking" | "ok" | "fail">("idle");

  const save = (nextBase: string, nextKey: string) => {
    setApiConfig(nextBase, nextKey);
    setHealth("idle");
    onSaved?.();
  };

  const testConnection = async () => {
    setHealth("checking");
    setHealth((await checkHealth()) ? "ok" : "fail");
  };

  return (
    <div className="shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        title="Cài đặt kết nối API"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
      >
        <Settings2 className="w-4 h-4 shrink-0" />
        <span className="hidden md:inline">API</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-4 top-14 z-50 w-[min(90vw,380px)] rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Kết nối vocab-api</h2>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Base URL</span>
            <input
              type="text"
              value={base}
              onChange={e => {
                setBase(e.target.value);
                save(e.target.value, key);
              }}
              placeholder="http://localhost:8787 (để trống = cùng origin)"
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500">API key (Bearer)</span>
            <input
              type="password"
              value={key}
              onChange={e => {
                setKey(e.target.value);
                save(base, e.target.value);
              }}
              placeholder="dev-key"
              autoComplete="off"
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void testConnection()}
              disabled={health === "checking"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {health === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Kiểm tra kết nối
            </button>
            {health === "ok" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </span>
            )}
            {health === "fail" && (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <XCircle className="w-3.5 h-3.5" /> Không kết nối được
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-600 leading-relaxed">
            Cấu hình lưu trên trình duyệt. Khi dev, để trống Base URL — Vite proxy sang{" "}
            <span className="font-mono">localhost:8787</span>. API key mặc định:{" "}
            <span className="font-mono">dev-key</span>.
          </p>
        </div>
      )}
    </div>
  );
}
