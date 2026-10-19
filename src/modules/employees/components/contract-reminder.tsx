"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { syncContractStatus, type ExpiringContractItem } from "../actions/employee.actions";

type ContractReminderProps = {
	items: ExpiringContractItem[];
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

export default function ContractReminder({ items }: ContractReminderProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleSync() {
		startTransition(async () => {
			const result = await syncContractStatus(30);
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			toast.success(result.message);
			router.refresh();
		});
	}

	if (items.length === 0) return null;

	return (
		<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
						Kontrak Akan Berakhir ({items.length})
					</h2>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Kontrak dengan tanggal selesai dalam 30 hari ke depan.
					</p>
				</div>
				<button
					type="button"
					onClick={handleSync}
					disabled={isPending}
					className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isPending ? "Menyinkron..." : "Sinkron Status"}
				</button>
			</div>

			<ul className="mt-4 space-y-2">
				{items.map((item) => (
					<li
						key={item.id}
						className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm dark:border-amber-900/50 dark:bg-slate-900"
					>
						<div>
							<p className="font-medium text-slate-900 dark:text-slate-100">
								{item.employeeName} <span className="font-normal text-slate-500">({item.employeeNumber})</span>
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{item.contractNumber} • Berakhir {dateFormatter.format(new Date(item.endDate))}
							</p>
						</div>
						<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
							H-{item.remainingDays}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
