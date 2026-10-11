import Link from "next/link";
import type { ReactNode } from "react";

export function Panel({ title, href, linkText, children }: { title: string; href?: string; linkText?: string; children: ReactNode }) {
	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
				{href ? (
					<Link href={href} className="text-sm font-medium text-blue-600 hover:underline">
						{linkText ?? "Lihat"} →
					</Link>
				) : null}
			</div>
			{children}
		</div>
	);
}

export function Baris({ kiri, kanan }: { kiri: ReactNode; kanan?: ReactNode }) {
	return (
		<li className="flex items-center justify-between gap-3 border-b border-blue-50 py-2 text-sm last:border-0 dark:border-blue-900/40">
			<span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{kiri}</span>
			{kanan !== undefined ? <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">{kanan}</span> : null}
		</li>
	);
}

export function Kosong({ teks }: { teks: string }) {
	return <p className="py-2 text-sm text-slate-400 dark:text-slate-500">{teks}</p>;
}
