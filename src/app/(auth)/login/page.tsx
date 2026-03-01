import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Login",
};

export default function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-blue-50 p-6 dark:bg-slate-950">
			<div className="w-full max-w-md rounded-xl border border-blue-100 bg-white p-6 shadow-sm dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Login</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to access your HRIS dashboard.</p>
			</div>
		</div>
	);
}
