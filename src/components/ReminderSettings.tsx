import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  ChevronDown,
  Loader2,
  Send,
  Smartphone,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReminderState,
  enableReminders,
  disableReminders,
  type ReminderState,
} from "@/services/push";
import {
  listPushDevices,
  sendTestPush,
  runPushReminder,
  type PushDevice,
} from "@/services/vocabApi";

const STATE_TEXT: Record<ReminderState, string> = {
  unsupported: "Trình duyệt không hỗ trợ",
  "needs-install": "Cần cài app trước",
  denied: "Đã chặn thông báo",
  on: "Đang bật",
  off: "Đang tắt",
};

/** Nút chuông + popover bật/tắt nhắc ôn tập, xem thiết bị, gửi thử. */
export function ReminderSettings() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReminderState | null>(null);
  const [devices, setDevices] = useState<PushDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void getReminderState().then(setState);
  }, []);

  useEffect(() => {
    if (!open) return;
    void listPushDevices().then(setDevices).catch(() => setDevices([]));
  }, [open]);

  const refresh = async () => {
    setState(await getReminderState());
    await listPushDevices().then(setDevices).catch(() => {});
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    run(async () => {
      if (state === "on") {
        await disableReminders();
        setMessage({ kind: "ok", text: "Đã tắt nhắc nhở trên thiết bị này." });
      } else {
        const device = await enableReminders();
        setMessage({ kind: "ok", text: `Đã bật nhắc nhở cho "${device.label ?? "thiết bị này"}".` });
      }
    });

  const test = () =>
    run(async () => {
      const r = await sendTestPush();
      setMessage({
        kind: r.sent > 0 ? "ok" : "err",
        text:
          r.sent > 0
            ? `Đã gửi tới ${r.sent}/${r.devices} thiết bị — kiểm tra thông báo.`
            : `Không gửi được (thử ${r.devices} thiết bị, lỗi ${r.failed}, gỡ ${r.removed}).`,
      });
    });

  const runReminder = () =>
    run(async () => {
      const r = await runPushReminder();
      setMessage({
        kind: r.skipped ? "err" : "ok",
        text: r.skipped
          ? `Không gửi: ${r.skipped}`
          : `Đến hạn ${r.due.words} từ / ${r.due.exercises} bài — đã gửi tới ${r.sent}/${r.devices} thiết bị.`,
      });
    });

  const active = state === "on";

  return (
    <div className="shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        title="Nhắc ôn tập"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
          active
            ? "text-blue-700 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
        )}
      >
        {active ? <BellRing className="w-4 h-4 shrink-0" /> : <Bell className="w-4 h-4 shrink-0" />}
        <span className="hidden lg:inline">Nhắc</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-4 top-14 z-50 w-[min(92vw,22rem)] rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0d1424] shadow-2xl shadow-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nhắc ôn tập</h2>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  active
                    ? "text-blue-700 dark:text-blue-300 border-blue-500/40 bg-blue-500/10"
                    : "text-slate-500 border-slate-300 dark:border-slate-700"
                )}
              >
                {state ? STATE_TEXT[state] : "…"}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Server tự gửi thông báo lúc <span className="font-semibold">8h sáng</span> và{" "}
              <span className="font-semibold">20h tối</span> mỗi ngày, chỉ khi thật sự có từ đến hạn ôn.
            </p>

            {/* Trạng thái đặc biệt */}
            {state === "needs-install" && (
              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                Trên iPhone/iPad: bấm <b>Chia sẻ</b> → <b>Thêm vào MH chính</b>, mở app từ icon đó rồi bật lại.
              </div>
            )}
            {state === "denied" && (
              <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Bạn đã chặn thông báo cho trang này — mở cài đặt trình duyệt để cho phép lại.
              </div>
            )}
            {state === "unsupported" && (
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-100 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800/60 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Trình duyệt này không hỗ trợ thông báo đẩy.
              </div>
            )}

            {/* Bật / tắt */}
            {(state === "on" || state === "off") && (
              <button
                onClick={() => void toggle()}
                disabled={busy}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
                  active
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                )}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : active ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                {active ? "Tắt nhắc trên thiết bị này" : "Bật nhắc trên thiết bị này"}
              </button>
            )}

            {message && (
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  message.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {message.text}
              </p>
            )}

            {/* Thiết bị đã đăng ký */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Thiết bị đang bật {devices ? `(${devices.length})` : ""}
              </h3>
              {devices === null ? (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải…
                </p>
              ) : devices.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-600 italic">Chưa có thiết bị nào.</p>
              ) : (
                <ul className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {devices.map(d => (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-300/60 dark:border-slate-800/60 px-2.5 py-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="flex-1 min-w-0 truncate text-xs text-slate-700 dark:text-slate-300">
                        {d.label ?? "Không tên"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono truncate max-w-[90px]">
                        {d.endpointHint}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Công cụ */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => void test()}
                disabled={busy || !devices?.length}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi thử
              </button>
              <button
                onClick={() => void runReminder()}
                disabled={busy || !devices?.length}
                title="Chạy tay đúng việc cron làm hằng ngày"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
              >
                <Bell className="w-3.5 h-3.5" />
                Nhắc ngay
              </button>
            </div>

            <p className="flex items-start gap-1.5 text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
              <Trash2 className="w-3 h-3 shrink-0 mt-0.5" />
              Thiết bị bị push service báo hết hiệu lực sẽ tự bị gỡ khỏi danh sách.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
