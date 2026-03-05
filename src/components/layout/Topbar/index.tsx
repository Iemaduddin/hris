"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  LuBell,
  LuChevronDown,
  LuLogOut,
  LuMoon,
  LuPanelLeft,
  LuSun,
  LuUser,
} from "react-icons/lu";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { toast } from "react-toastify";

type OpenMenu = "notification" | "avatar" | null;

type TopbarProps = {
  user: {
    name: string;
    email: string;
  };
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

function getInitialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Topbar({ user, isSidebarOpen, onToggleSidebar }: TopbarProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const initials = useMemo(() => getInitialsFromName(user.name), [user.name]);
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const curentTime = useMemo(() => {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, "0");
	const minutes = now.getMinutes().toString().padStart(2, "0");
	return `${hours}:${minutes}`;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };
  const iconTriggerClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition hover:bg-blue-100  dark:bg-blue-900/30 dark:text-blue-100 dark:hover:bg-blue-800/60";

  const isDark = mounted && resolvedTheme === "dark";

  const handleThemeToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    }catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Gagal melakukan logout. Silakan coba lagi.");
    }
  }

  return (
    <header className="flex h-18 items-center justify-between border-b border-blue-100 bg-white px-6 dark:border-blue-900/60 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={iconTriggerClass}
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          title={isSidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
        >
          <LuPanelLeft className={`h-4 w-4 transition-transform ${isSidebarOpen ? "" : "rotate-180"}`} />
        </button>
        <p className="text-slate-500 dark:text-slate-300">{currentDate} - {curentTime}</p>
      </div>
	  

      <div ref={wrapperRef} className="relative flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            className={iconTriggerClass}
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <LuMoon className="h-4 w-4" />
            ) : (
              <LuSun className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            className={iconTriggerClass}
            onClick={() => toggleMenu("notification")}
            aria-label="Open notifications"
          >
            <LuBell className="h-4 w-4" />
          </button>
          {openMenu === "notification" && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-blue-50 p-3 shadow-sm  dark:bg-blue-900/30">
              <p className="text-sm text-slate-600 dark:text-slate-300">No new notifications</p>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-100  dark:bg-blue-900/30 dark:text-blue-100 dark:hover:bg-blue-800/60"
            onClick={() => toggleMenu("avatar")}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-semibold text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                {initials}
              </span>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
              </div>
            </div>
            <LuChevronDown
              className={`h-4 w-4 transition-transform ${openMenu === "avatar" ? "rotate-180" : ""}`}
            />
          </button>
          {openMenu === "avatar" && (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LuUser className="h-4 w-4" />
                Profile
              </button>
              <button

                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LuLogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
