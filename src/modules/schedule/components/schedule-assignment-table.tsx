"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DataTable from "@/src/components/ui/data-table";
import ConfirmDialog from "@/src/components/ui/confirm-dialog";
import { deleteScheduleAssignment } from "../actions/schedule.actions";
import { getScheduleAssignmentColumns } from "./schedule-assignment-columns";
import ScheduleAssignmentForm from "./schedule-assignment-form";
import type {
	ScheduleAssignmentListItem,
	ScheduleAssignmentFormValues,
	KaryawanOption,
	JadwalKerjaOption,
} from "../types/schedule.type";

type ScheduleAssignmentTableProps = {
	assignments: ScheduleAssignmentListItem[];
	karyawan: KaryawanOption[];
	jadwalKerja: JadwalKerjaOption[];
};

export default function ScheduleAssignmentTable({
	assignments,
	karyawan,
	jadwalKerja,
}: ScheduleAssignmentTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignmentFormValues | undefined>(undefined);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<ScheduleAssignmentListItem | null>(null);

	const handleEdit = (row: ScheduleAssignmentListItem) => {
		setSelectedAssignment({
			id: row.id,
			karyawanId: row.karyawanId,
			jadwalKerjaId: row.jadwalKerjaId,
			tanggalMulai: new Date(row.tanggalMulai).toISOString().split("T")[0],
			tanggalSelesai: row.tanggalSelesai ? new Date(row.tanggalSelesai).toISOString().split("T")[0] : null,
		});

		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleDeleteClick = (row: ScheduleAssignmentListItem) => {
		setDeleteTarget(row);
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = () => {
		if (!deleteTarget) return;

		setIsDeleteDialogOpen(false);

		startTransition(async () => {
			const result = await deleteScheduleAssignment(deleteTarget.id);
			if (!result.success) {
				toast.error(result.message || "Gagal menghapus penugasan jadwal.");
				return;
			}

			toast.success(result.message || "Penugasan jadwal berhasil dihapus.");
			setDeleteTarget(null);
			router.refresh();
		});
	};

	const handleFormSuccess = () => {
		setSelectedAssignment(undefined);
	};

	const columns = getScheduleAssignmentColumns(handleEdit, handleDeleteClick);

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
					{selectedAssignment ? "Edit Penugasan Jadwal" : "Tambah Penugasan Jadwal"}
				</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					{selectedAssignment
						? "Ubah data penugasan jadwal di bawah ini."
						: "Assign jadwal kerja/shift ke karyawan."}
				</p>

				<ScheduleAssignmentForm
					karyawan={karyawan}
					jadwalKerja={jadwalKerja}
					selectedAssignment={selectedAssignment}
					onSuccess={handleFormSuccess}
				/>
			</div>

			<DataTable
				data={assignments}
				columns={columns}
				getRowId={(row) => String(row.id)}
				sortable
				searchable
				emptyMessage="Belum ada penugasan jadwal."
				searchPlaceholder="Cari berdasarkan nama karyawan..."
				initialPageSize={10}
				initialSortState={{ columnId: "tanggalMulai", direction: "desc" }}
			/>

			<ConfirmDialog
				open={isDeleteDialogOpen}
				title="Konfirmasi Hapus Penugasan"
				description={`Penugasan jadwal untuk "${deleteTarget?.karyawan.namaLengkap}" akan dihapus permanen. Lanjutkan?`}
				confirmText="Ya, Hapus"
				cancelText="Batal"
				isLoading={isPending}
				onCancel={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteConfirm}
			/>
		</div>
	);
}
