"use client";

import { useLocalStorage } from "usehooks-ts";
import Footbar from "@/src/components/layout/footbar";
import Sidebar from "@/src/components/layout/sidebar";
import Topbar from "@/src/components/layout/topbar";
import { useMounted } from "@/src/hooks/use-mounted";
import type { UserRole } from "@/src/modules/users/types/user.type";

type DashboardShellProps = {
  company: {
    name: string;
    logo: string | null;
  } | null;
  user: {
    name: string;
    email: string;
  };
  userRole: UserRole;
  children: React.ReactNode;
};

export default function DashboardShell({ company, user, userRole, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage<boolean>("dashboard.sidebar.open", true);
const mounted = useMounted();
  if (!mounted) {
    return null;
  }
  return (
    <div className="flex h-screen overflow-hidden bg-blue-50 dark:bg-slate-950">
      <div
        className={`relative z-20 shrink-0 transition-[width] duration-300 ease-in-out ${isSidebarOpen ? "w-72" : "w-20"}`}
      >
        <Sidebar company={company} collapsed={!isSidebarOpen} userRole={userRole} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-6 text-slate-900 dark:text-slate-100">{children}</main>
        <Footbar />
      </div>
    </div>
  );
}
