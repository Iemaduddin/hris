import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Bersihkan sisa data UAT (pengajuan berpenanda "UAT") dari DB dev:
 * - kembalikan saldo cuti yang terpotong (mutasi PENGURANGAN),
 * - hapus mutasi, tahap approval, dan pengajuannya.
 * Idempoten: tidak ada baris UAT -> tidak ada yang diubah.
 * Data demo "Demo dokumentasi" TIDAK disentuh.
 */
async function main() {
	const uat = await prisma.pengajuanKetidakhadiran.findMany({
		where: { alasan: { contains: "UAT" } },
		select: { id: true, nomorPengajuan: true },
	});
	console.log(`pengajuan UAT: ${uat.length}`);

	for (const p of uat) {
		const mutasi = await prisma.mutasiSaldoCuti.findMany({
			where: { referensiId: p.id, tipe: "PENGURANGAN" },
			select: { id: true, saldoCutiId: true, jumlah: true },
		});
		for (const m of mutasi) {
			const saldo = await prisma.saldoCuti.findUnique({ where: { id: m.saldoCutiId }, select: { saldoAkhir: true } });
			if (saldo) {
				await prisma.saldoCuti.update({
					where: { id: m.saldoCutiId },
					data: { saldoAkhir: Number(saldo.saldoAkhir) + Number(m.jumlah) },
				});
			}
			await prisma.mutasiSaldoCuti.delete({ where: { id: m.id } });
		}
		const steps = await prisma.approvalStep.deleteMany({ where: { referensiType: "CUTI", referensiId: p.id } });
		await prisma.pengajuanKetidakhadiran.delete({ where: { id: p.id } });
		console.log(`  ${p.nomorPengajuan}: saldo +${mutasi.reduce((a, m) => a + Number(m.jumlah), 0)}, ${steps.count} tahap dihapus`);
	}

	const sisa = await prisma.pengajuanKetidakhadiran.count({ where: { alasan: { contains: "UAT" } } });
	const e2e = await prisma.saldoCuti.findFirst({
		where: { karyawan: { nomorKaryawan: "EMP-E2E-001" }, tahun: 2026 },
		select: { saldoAwal: true, saldoAkhir: true },
	});
	console.log(`sisa UAT: ${sisa} | saldo E2E 2026: ${e2e?.saldoAkhir}/${e2e?.saldoAwal}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
