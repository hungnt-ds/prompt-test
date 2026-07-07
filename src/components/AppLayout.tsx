import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

/** Shell shared by every route: a persistent left sidebar plus the routed page. */
export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      <Sidebar />
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
