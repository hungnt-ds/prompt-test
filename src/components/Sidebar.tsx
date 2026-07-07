import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Type, AudioLines, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Type;
  /** Only match this exact path (used for the root route). */
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Prompt", icon: Type, end: true },
  { to: "/ipa", label: "Học IPA", icon: AudioLines },
];

const STORAGE_KEY = "sidebar:collapsed";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "shrink-0 h-screen flex flex-col border-r border-zinc-800/60 bg-[#0a0a0a] text-zinc-100 transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Brand + collapse toggle */}
      <div className="h-16 flex items-center gap-2 px-3 shrink-0 border-b border-zinc-800/60">
        {!collapsed && (
          <span className="flex-1 min-w-0 truncate text-sm font-bold tracking-tight text-zinc-100">
            Prompt&nbsp;·&nbsp;IPA
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 h-11 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
