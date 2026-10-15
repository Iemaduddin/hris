import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { maskNilai } from "@/src/lib/masking";
import { getEmployeeWizardDetail } from "@/src/modules/employee/actions/employee.actions";

export default async function ProfilSayaPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true },
	});
	if (!karyawan) {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
				<h1 className="text-2xl font-semibold">Profil Saya</h1>
				<p className="mt-2 text-sm">Akun belum tertaut ke data karyawan. Hubungi HR.</p>
			</div>
		);
	}

	const detail = await getEmployeeWizardDetail(karyawan.id);
	if (!detail) redirect("/");

	const p = detail.personal;
	const current = detail.positions.find((x) => x.isCurrent) ?? detail.positions[0];

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{p.fullName}</h1>
				<p className="mt-2 text-sm text-slate-500">
					{p.employeeNumber} • {p.status.replaceAll("_", " ")}
				</p>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
			<Section title="Data Pribadi">
				<Row label="NIK" value={maskNilai(p.nationalId) ?? "-"} />
					<Row label="Jenis Kelamin" value={p.gender.replaceAll("_", " ")} />
					<Row label="Tanggal Lahir" value={p.birthDate || "-"} />
					<Row label="Email" value={p.workEmail || "-"} />
					<Row label="Telepon" value={p.phone || "-"} />
					<Row label="Alamat" value={p.address || "-"} />
					<Row label="Tanggal Masuk" value={p.joinDate || "-"} />
				</Section>

				<Section title="Penempatan Aktif">
					{current ? (
						<>
							<Row label="Efektif Sejak" value={current.effectiveDate || "-"} />
							<Row label="Catatan" value={current.note || "-"} />
						</>
					) : (
						<p className="text-sm text-slate-500">Belum ada penempatan.</p>
					)}
				</Section>

				<Section title={`Keluarga (${detail.families.length})`}>
					{detail.families.length === 0 ? (
						<p className="text-sm text-slate-500">Tidak ada data.</p>
					) : (
						detail.families.map((f, i) => (
							<Row key={i} label={`${f.name} (${f.relation.replaceAll("_", " ")})`} value={f.occupation || "-"} />
						))
					)}
				</Section>

				<Section title={`Pendidikan (${detail.educations.length})`}>
					{detail.educations.length === 0 ? (
						<p className="text-sm text-slate-500">Tidak ada data.</p>
					) : (
						detail.educations.map((e, i) => (
							<Row key={i} label={`${e.degree} — ${e.institution}`} value={e.graduationYear || "-"} />
						))
					)}
				</Section>

				<Section title={`Kontrak (${detail.kontrak.length})`}>
					{detail.kontrak.length === 0 ? (
						<p className="text-sm text-slate-500">Tidak ada data.</p>
					) : (
						detail.kontrak.map((k, i) => (
							<Row key={i} label={`${k.contractNumber} (${k.contractType})`} value={`${k.startDate} – ${k.endDate || "…"} • ${k.status}`} />
						))
					)}
				</Section>
			</div>
		</>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
			<div className="mt-3 space-y-2">{children}</div>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 text-sm">
			<span className="text-slate-500">{label}</span>
			<span className="text-right font-medium text-slate-900 dark:text-slate-100">{value}</span>
		</div>
	);
}
