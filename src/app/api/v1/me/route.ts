import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { decimalKeNumber } from "@/src/lib/decimal";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const [user, karyawan] = await Promise.all([
		prisma.user.findUnique({
			where: { id: ctx.userId },
			select: { id: true, name: true, email: true, role: true, emailVerified: true },
		}),
		ctx.karyawanId
			? prisma.karyawan.findUnique({
					where: { id: ctx.karyawanId },
					select: {
						id: true,
						nomorKaryawan: true,
						namaLengkap: true,
						status: true,
						posisiKaryawan: {
							where: { isCurrent: true },
							take: 1,
							select: {
								posisi: { select: { nama: true } },
								unitOrganisasi: { select: { nama: true } },
								// Koordinat & radius dipakai app untuk pratinjau
								// validasi lokasi sebelum clock-in (PRD mobile Bag. 5.4).
								lokasiKerja: {
									select: {
										id: true,
										nama: true,
										latitude: true,
										longitude: true,
										radiusMeter: true,
									},
								},
							},
						},
					},
				})
			: null,
	]);

	return ok({
		user,
		karyawan: karyawan
			? {
					...karyawan,
					posisiKaryawan: karyawan.posisiKaryawan.map((p) => ({
						...p,
						lokasiKerja: p.lokasiKerja
							? {
									id: p.lokasiKerja.id,
									nama: p.lokasiKerja.nama,
									latitude: decimalKeNumber(p.lokasiKerja.latitude),
									longitude: decimalKeNumber(p.lokasiKerja.longitude),
									radiusMeter: p.lokasiKerja.radiusMeter,
								}
							: null,
					})),
				}
			: null,
	});
}
