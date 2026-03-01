import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Dashboard",
};

export default function DashboardPage() {
    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Welcome to your dashboard. Here you can find an overview of your activities and statistics.</p>
        </div>
    );
}