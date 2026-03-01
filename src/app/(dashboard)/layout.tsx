import Footbar from "@/src/components/layout/Footbar";
import Sidebar from "@/src/components/layout/Sidebar";
import Topbar from "@/src/components/layout/Topbar";

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex h-screen overflow-hidden bg-blue-50 dark:bg-slate-950">
			<Sidebar />
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<Topbar />
				<main className="min-h-0 flex-1 overflow-y-auto p-6 text-slate-900 dark:text-slate-100">{children}</main>
				<Footbar />
			</div>
		</div>
	);
}
