import type { DataTableColumn } from "@/src/components/ui/data-table";
import type { ScheduleAssignmentListItem } from "../types/schedule.type";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

const hariLabel: Record<string, string> = {
	SENIN: "Senin",
	SELASA: "Selasa",
	RABU: "Rabu",
	KAMIS: "Kamis",
	JUMAT: "Jumat",
	SABTU: "Sabtu",
	MINGGU: "Minggu",
};

export function getScheduleAssignmentColumns(
	onEdit: (row: ScheduleAssignmentListItem) => void,
	onDelete: (row: ScheduleAssignmentListItem) => void,
): DataTableColumn<ScheduleAssignmentListItem>[] {
	return [
		{
			id: "namaKaryawan",
			header: "Karyawan",
			render: (row) => (
				<div>
					<p className="font-medium text-slate-900 dark:text-slate-100">{row.karyawan.namaLengkap}</p>
					<p className="text-xs text-slate-500 dark:text-slate-400">{row.karyawan.nomorKaryawan}</p>
				</div>
			),
			searchValue: (row) => `${row.karyawan.namaLengkap} ${row.karyawan.nomorKaryawan}`,
			sortable: true,
			sortValue: (row) => row.karyawan.namaLengkap,
		},
		{
			id: "kalenderKerja",
			header: "Kalender",
			render: (row) => row.jadwalKerja.kalenderKerja.nama,
			sortable: true,
			sortValue: (row) => row.jadwalKerja.kalenderKerja.nama,
		},
		{
			id: "jadwal",
			header: "Jadwal",
			render: (row) => (
				<div>
					<p className="font-medium text-slate-900 dark:text-slate-100">
						{hariLabel[row.jadwalKerja.hari] ?? row.jadwalKerja.hari}
					</p>
					{row.jadwalKerja.jamMasuk && row.jadwalKerja.jamKeluar && (
						<p className="text-xs text-slate-500 dark:text-slate-400">
							{timeFormatter.format(new Date(row.jadwalKerja.jamMasuk))} - {timeFormatter.format(new Date(row.jadwalKerja.jamKeluar))}
						</p>
					)}
				</div>
			),
			searchValue: (row) => hariLabel[row.jadwalKerja.hari] ?? row.jadwalKerja.hari,
			sortable: true,
			sortValue: (row) => row.jadwalKerja.hari,
		},
		{
			id: "tanggalMulai",
			header: "Tanggal Mulai",
			render: (row) => dateFormatter.format(new Date(row.tanggalMulai)),
			sortable: true,
			sortValue: (row) => new Date(row.tanggalMulai),
		},
		{
			id: "tanggalSelesai",
			header: "Tanggal Selesai",
			render: (row) => row.tanggalSelesai ? dateFormatter.format(new Date(row.tanggalSelesai)) : "-",
			sortable: true,
			sortValue: (row) => row.tanggalSelesai ? new Date(row.tanggalSelesai) : new Date("9999-12-31"),
			responsiveHidden: true,
		},
		{
			id: "actions",
			header: "Aksi",
			render: (row) => (
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onEdit(row)}
						className="inline-flex h-8 items-center justify-center rounded-lg bg-amber-500 px-3 text-xs font-medium text-white transition hover:bg-amber-600"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => onDelete(row)}
						className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700"
					>
						Hapus
					</button>
				</div>
			),
		},
	];
}
