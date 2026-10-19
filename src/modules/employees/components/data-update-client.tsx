"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import {
	submitDataUpdate,
	cancelDataUpdate,
	createDataUpdate,
	type DataUpdateItem,
} from "@/src/modules/employees/actions/data-updates.actions";

const KATEGORI_OPTIONS = [
	{ value: "ALAMAT", label: "Alamat" },
	{ value: "KONTAK", label: "Kontak (telepon/email)" },
	{ value: "KELUARGA", label: "Keluarga" },
	{ value: "PENDIDIKAN", label: "Pendidikan" },
	{ value: "DOKUMEN", label: "Dokumen" },
];

const HUBUNGAN_OPTIONS = [
	{ value: "PASANGAN", label: "Pasangan" },
	{ value: "ANAK", label: "Anak" },
	{ value: "ORANG_TUA", label: "Orang Tua" },
	{ value: "SAUDARA", label: "Saudara" },
	{ value: "LAINNYA", label: "Lainnya" },
];

const GENDER_OPTIONS = [
	{ value: "LAKI_LAKI", label: "Laki-laki" },
	{ value: "PEREMPUAN", label: "Perempuan" },
];

const GELAR_OPTIONS = ["SD", "SMP", "SMA_SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3", "LAINNYA"].map((g) => ({
	value: g,
	label: g.replace("_", "/"),
}));

const DOKUMEN_OPTIONS = [
	"KTP",
	"NPWP",
	"IJAZAH",
	"TRANSKRIP",
	"PAKLARING",
	"SERTIFIKAT",
	"KONTRAK_KERJA",
	"FOTO",
	"KARTU_KELUARGA",
	"BPJS_KESEHATAN",
	"BPJS_KETENAGAKERJAAN",
	"CV",
	"LAINNYA",
].map((d) => ({ value: d, label: d.replaceAll("_", " ") }));

export default function UpdateDataClient({
	userId,
	items,
	saatIni,
	keluarga,
}: {
	userId: string;
	items: DataUpdateItem[];
	saatIni: { alamat: string; telepon: string; email: string };
	keluarga: Array<{ id: string; nama: string; hubungan: string }>;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [category, setKategori] = useState("ALAMAT");
	const [reason, setAlasan] = useState("");
	const [lampiran, setLampiran] = useState("");
	const [form, setForm] = useState<Record<string, string>>({});

	function set(k: string, v: string) {
		setForm((prev) => ({ ...prev, [k]: v }));
	}

	function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
		startTransition(async () => {
			const result = await action;
			if (!result.success) toast.error(result.message);
			else {
				toast.success(result.message);
				setForm({});
				setAlasan("");
				setLampiran("");
			}
			router.refresh();
		});
	}

	function handleBuat() {
		if (!reason.trim()) {
			toast.error("Alasan perubahan wajib diisi.");
			return;
		}
		const newData: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(form)) {
			if (v !== "") newData[k] = v;
		}
		if (category === "KELUARGA" && form["targetId"] === "baru") delete newData["targetId"];
		runAction(
			createDataUpdate(
				{
					category,
					targetId: category === "KELUARGA" && form["targetId"] && form["targetId"] !== "baru" ? form["targetId"] : undefined,
					newData,
					reason: reason,
					attachmentUrl: lampiran,
				},
				userId,
			),
		);
	}

	const kolom: DataTableColumn<DataUpdateItem>[] = [
		{ id: "number", header: "Nomor", accessor: "number" },
		{
			id: "category",
			header: "Kategori",
			render: (r) => <span>{r.category}</span>,
			sortValue: (r) => r.category,
			searchValue: (r) => r.category,
		},
		{ id: "summary", header: "Usulan", accessor: "summary" },
		{
			id: "status",
			header: "Status",
			render: (r) => <span>{r.status.replaceAll("_", " ")}</span>,
			sortValue: (r) => r.status,
			searchValue: (r) => r.status,
		},
		{
			id: "aksi",
			header: "Aksi",
			headerClassName: "text-right",
			cellClassName: "text-right",
			sortable: false,
			searchable: false,
			render: (r) =>
				r.status === "DRAFT" ? (
					<button
						type="button"
						disabled={isPending}
						onClick={() => runAction(submitDataUpdate(r.id, userId))}
						className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
					>
						Ajukan ke HR
					</button>
				) : ["DRAFT", "DIAJUKAN"].includes(r.status) ? (
					<button
						type="button"
						disabled={isPending}
						onClick={() => runAction(cancelDataUpdate(r.id, userId))}
						className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
					>
						Batalkan
					</button>
				) : (
					<span className="text-xs text-slate-400">-</span>
				),
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usulkan Perubahan Data</h2>
				<p className="mt-1 text-xs text-slate-500">
					Usulan diverifikasi HR sebelum diterapkan. Data sensitif (NIK, rekening, status) hanya bisa diubah HR.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<FloatingSelect name="category" label="Kategori" value={category} onValueChange={setKategori} options={KATEGORI_OPTIONS} searchable={false} />
					<FloatingInput name="reason" label="Alasan perubahan" value={reason} onChange={(e) => setAlasan(e.currentTarget.value)} />
					<FloatingInput name="lampiran" label="URL Bukti (opsional)" value={lampiran} onChange={(e) => setLampiran(e.currentTarget.value)} />
				</div>

				{category === "ALAMAT" && (
					<div className="mt-4 grid grid-cols-1 gap-4">
						<p className="text-xs text-slate-500">Saat ini: {saatIni.alamat || "-"}</p>
						<FloatingInput name="alamat" label="Alamat Baru" value={form["alamat"] ?? ""} onChange={(e) => set("alamat", e.currentTarget.value)} />
					</div>
				)}

				{category === "KONTAK" && (
					<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						<FloatingInput name="telepon" label={`Telepon Baru (saat ini: ${saatIni.telepon || "-"})`} value={form["telepon"] ?? ""} onChange={(e) => set("telepon", e.currentTarget.value)} />
						<FloatingInput name="email" label={`Email Baru (saat ini: ${saatIni.email || "-"})`} value={form["email"] ?? ""} onChange={(e) => set("email", e.currentTarget.value)} />
					</div>
				)}

				{category === "KELUARGA" && (
					<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingSelect
							name="targetId"
							label="Target"
							value={form["targetId"] ?? "baru"}
							onValueChange={(v) => set("targetId", v)}
							options={[{ value: "baru", label: "Anggota baru" }, ...keluarga.map((k) => ({ value: k.id, label: `${k.nama} (${k.hubungan})` }))]}
						/>
						<FloatingInput name="nama" label="Nama" value={form["nama"] ?? ""} onChange={(e) => set("nama", e.currentTarget.value)} />
						<FloatingSelect name="hubungan" label="Hubungan" value={form["hubungan"] ?? ""} onValueChange={(v) => set("hubungan", v)} options={HUBUNGAN_OPTIONS} searchable={false} />
						<FloatingSelect name="gender" label="Jenis Kelamin" value={form["gender"] ?? ""} onValueChange={(v) => set("gender", v)} options={GENDER_OPTIONS} searchable={false} />
						<FloatingInput name="tanggalLahir" label="Tanggal Lahir" type="date" value={form["tanggalLahir"] ?? ""} onChange={(e) => set("tanggalLahir", e.currentTarget.value)} />
						<FloatingInput name="nik" label="NIK (opsional)" value={form["nik"] ?? ""} onChange={(e) => set("nik", e.currentTarget.value)} />
						<FloatingInput name="pekerjaan" label="Pekerjaan (opsional)" value={form["pekerjaan"] ?? ""} onChange={(e) => set("pekerjaan", e.currentTarget.value)} />
					</div>
				)}

				{category === "PENDIDIKAN" && (
					<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingSelect name="gelar" label="Gelar" value={form["gelar"] ?? ""} onValueChange={(v) => set("gelar", v)} options={GELAR_OPTIONS} />
						<FloatingInput name="institusi" label="Institusi" value={form["institusi"] ?? ""} onChange={(e) => set("institusi", e.currentTarget.value)} />
						<FloatingInput name="jurusan" label="Jurusan (opsional)" value={form["jurusan"] ?? ""} onChange={(e) => set("jurusan", e.currentTarget.value)} />
						<FloatingInput name="tahunMulai" label="Tahun Mulai (opsional)" value={form["tahunMulai"] ?? ""} onChange={(e) => set("tahunMulai", e.currentTarget.value)} />
						<FloatingInput name="tahunLulus" label="Tahun Lulus (opsional)" value={form["tahunLulus"] ?? ""} onChange={(e) => set("tahunLulus", e.currentTarget.value)} />
						<FloatingInput name="ipk" label="IPK (opsional)" value={form["ipk"] ?? ""} onChange={(e) => set("ipk", e.currentTarget.value)} />
					</div>
				)}

				{category === "DOKUMEN" && (
					<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
						<FloatingSelect name="jenisDokumen" label="Jenis Dokumen" value={form["jenisDokumen"] ?? ""} onValueChange={(v) => set("jenisDokumen", v)} options={DOKUMEN_OPTIONS} />
						<FloatingInput name="nama" label="Nama Dokumen" value={form["nama"] ?? ""} onChange={(e) => set("nama", e.currentTarget.value)} />
						<FloatingInput name="urlFile" label="URL File (unggah dulu via Files)" value={form["urlFile"] ?? ""} onChange={(e) => set("urlFile", e.currentTarget.value)} />
						<FloatingInput name="tanggalKadaluarsa" label="Kadaluarsa (opsional)" type="date" value={form["tanggalKadaluarsa"] ?? ""} onChange={(e) => set("tanggalKadaluarsa", e.currentTarget.value)} />
						<FloatingInput name="catatan" label="Catatan (opsional)" value={form["catatan"] ?? ""} onChange={(e) => set("catatan", e.currentTarget.value)} />
					</div>
				)}

				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={handleBuat}
						disabled={isPending}
						className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
					>
						Buat Draf
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usulan Saya</h2>
				<div className="mt-4">
					<DataTable data={items} columns={kolom} getRowId={(r) => r.id} emptyMessage="Belum ada usulan." />
				</div>
			</div>
		</div>
	);
}
