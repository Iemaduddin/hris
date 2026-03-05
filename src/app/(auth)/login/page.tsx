import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import ThemeToggle from "@/src/components/ui/theme-toggle";
import LoginForm from "@/src/modules/auth/components/login-form";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import loginIllustration from "@/public/login-page.png";
export const metadata: Metadata = {
	title: "Login",
};

export default async function LoginPage() {
	const session = await getCurrentSession();
	if (session) {
		redirect("/");
	}

	const company = await getCompanyData();
	const companyName = company?.name?.trim() || "HRIS";
	const companyLogo = company?.logo || null;

	return (
		<div className="flex min-h-screen items-center bg-slate-100 p-4 dark:bg-slate-950 md:p-6">
			<div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.9)] md:min-h-175 md:grid-cols-2">
				<div className="relative hidden overflow-hidden bg-slate-900 p-10 text-slate-100 md:flex md:flex-col md:justify-between dark:bg-slate-950">
					<div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-3xl border border-white/15" />
					<div className="pointer-events-none absolute bottom-16 right-10 h-40 w-40 rounded-full border border-white/10" />
					<div className="pointer-events-none absolute bottom-8 left-8 h-16 w-16 rounded-xl bg-white/5" />

					<div>
						<span className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200">
							HR Platform
						</span>
						<h1 className="mt-6 text-4xl font-semibold leading-tight">
							{companyName}
						</h1>
						<p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
							Satu tempat untuk mengelola data karyawan, struktur organisasi, dan proses SDM secara efisien.
						</p>
					</div>
					<div className="h-80 w-full">
					<Image
						src={loginIllustration}
						alt="Login illustration"
						width={400}
						height={300}
						className="h-full w-full object-contain"
						/>
						</div>

					<div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4">
						<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 p-2">
							{companyLogo ? (
								<Image
									src={companyLogo}
									alt={`${companyName} logo`}
									width={96}
									height={96}
									className="h-full w-full object-contain"
									priority
								/>
							) : (
								<span className="text-sm font-bold tracking-wide">HR</span>
							)}
						</div>
						<div>
							<p className="text-xs uppercase tracking-wider text-slate-400">System</p>
							<p className="text-sm font-medium text-slate-100">Human Resource Information System</p>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-center p-6 md:p-12">
					<div className="relative w-full max-w-md">
						<div className="absolute right-0 top-0">
							<ThemeToggle className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" />
						</div>
						<div className="pt-14">
						<p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Welcome Back</p>
						<h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Masuk ke Akun Anda</h2>
						<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
							Gunakan email dan password yang terdaftar untuk melanjutkan ke dashboard.
						</p>
						<LoginForm />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
