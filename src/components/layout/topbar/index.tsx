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
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";
import { toast } from "react-toastify";
import { useMounted } from "@/src/hooks/use-mounted";
import {
  getNotificationSummary,
  markNotifications,
  type NotificationItem,
} from "@/src/modules/notifikasi/actions/notifikasi.actions";

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
  const mounted = useMounted();
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

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<NotificationItem[]>([]);

  async function loadNotifications() {
    try {
      const summary = await getNotificationSummary();
      setUnreadCount(summary.unreadCount);
      setLatest(summary.latest);
    } catch {
      // abaikan — badge pelengkap
    }
  }

  useEffect(() => {
    let active = true;
    const refresh = () => {
      getNotificationSummary()
        .then((summary) => {
          if (!active) return;
          setUnreadCount(summary.unreadCount);
          setLatest(summary.latest);
        })
        .catch(() => {
          // abaikan — badge pelengkap
        });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  async function handleOpenNotifications() {
    toggleMenu("notification");
    await loadNotifications();
  }

  async function handleMarkAll() {
    await markNotifications("all");
    await loadNotifications();
  }
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
            onClick={handleOpenNotifications}
            aria-label="Open notifications"
          >
            <LuBell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {openMenu === "notification" && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-blue-100 bg-white p-3 shadow-lg dark:border-blue-900/60 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifikasi</p>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAll} className="text-xs text-blue-600 hover:underline">
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              {latest.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No new notifications</p>
              ) : (
                <ul className="space-y-2">
                  {latest.map((n) => (
                    <li key={n.id} className={`rounded-xl p-2 text-sm ${n.isRead ? "text-slate-500" : "bg-blue-50 font-medium text-slate-900 dark:bg-blue-900/30 dark:text-slate-100"}`}>
                      {n.url ? (
                        <Link href={n.url} onClick={() => setOpenMenu(null)}>
                          {n.title}
                        </Link>
                      ) : (
                        <span>{n.title}</span>
                      )}
                      <p className="truncate text-xs font-normal text-slate-500">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpenMenu(null)}
                className="mt-2 block text-center text-xs text-blue-600 hover:underline"
              >
                Lihat semua
              </Link>
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
