import Footbar from "@/src/components/layout/Footbar";
import Sidebar from "@/src/components/layout/Sidebar";
import Topbar from "@/src/components/layout/Topbar";

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex min-h-screen bg-blue-50 dark:bg-slate-950">
			<Sidebar />
			<div className="flex min-w-0 flex-1 flex-col">
				<Topbar />
				<main className="flex-1 p-6 text-slate-900 dark:text-slate-100">{children}</main>
				<Footbar />
			</div>
		</div>
	);
}
