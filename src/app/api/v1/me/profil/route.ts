import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { decimalKeNumber } from "@/src/lib/decimal";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/**
 * Profil lengkap milik sendiri (PRD mobile Bag. 5.6 / B6).
 * Read-only: kontak, alamat, penempatan aktif, kontrak aktif.
 * NIK & NPWP ditampilkan ter-mask (mis. 3273••••••1234) sesuai Bag. 8.
 */
/** NIK/NPWP ditampilkan ter-mask (mis. 3273••••••1234) sesuai Bag. 8. */
function maskNilai(value: string | null | undefined): string | null {
	const raw = (value ?? "").trim();
	if (!raw) return null;
	if (raw.length <= 4) return "••••";
	const ekor = raw.slice(-4);
	const kepala = raw.slice(0, 4);
	return `${kepala}••••••${ekor}`;
}

export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const [user, karyawan] = await Promise.all([
		prisma.user.findUnique({
			where: { id: ctx.userId },
			select: { email: true, name: true, role: true },
		}),
		prisma.karyawan.findUnique({
			where: { id: ctx.karyawanId },
			select: {
				nomorKaryawan: true,
				namaLengkap: true,
				gender: true,
				tanggalLahir: true,
				nik: true,
				npwp: true,
				telepon: true,
				email: true,
				alamat: true,
				status: true,
				tanggalMasuk: true,
				tanggalResign: true,
				atasanLangsung: {
					select: { namaLengkap: true, nomorKaryawan: true, posisiKaryawan: { where: { isCurrent: true }, take: 1, select: { posisi: { select: { nama: true } } } } },
				},
				kontrakKerja: {
					where: { status: { in: ["AKTIF", "AKAN_BERAKHIR"] } },
					orderBy: { tanggalMulai: "desc" },
					take: 1,
					select: {
						nomorKontrak: true,
						jenisKontrak: true,
						tanggalMulai: true,
						tanggalSelesai: true,
						status: true,
					},
				},
				posisiKaryawan: {
					where: { isCurrent: true },
					take: 1,
					select: {
						tanggalEfektif: true,
						tanggalBerakhir: true,
						posisi: { select: { nama: true } },
						unitOrganisasi: { select: { nama: true } },
						lokasiKerja: {
							select: {
								nama: true,
								alamat: true,
								kota: true,
								provinsi: true,
								kodePos: true,
								latitude: true,
								longitude: true,
								radiusMeter: true,
							},
						},
					},
				},
			},
		}),
	]);

	if (!karyawan) return fail("Data karyawan tidak ditemukan.", 404);

	const penempatan = karyawan.posisiKaryawan[0] ?? null;
	const kontrak = karyawan.kontrakKerja[0] ?? null;
	const lokasi = penempatan?.lokasiKerja ?? null;

	return ok({
		profil: {
			nomorKaryawan: karyawan.nomorKaryawan,
			namaLengkap: karyawan.namaLengkap,
			gender: karyawan.gender,
			tanggalLahir: karyawan.tanggalLahir,
			// NIK/NPWP ditampilkan ter-mask ke seluruh peran, termasuk HR.
			nik: maskNilai(karyawan.nik),
			npwp: maskNilai(karyawan.npwp),
			telepon: karyawan.telepon,
			email: karyawan.email ?? user?.email ?? null,
			alamat: karyawan.alamat,
			status: karyawan.status,
			tanggalMasuk: karyawan.tanggalMasuk,
			tanggalResign: karyawan.tanggalResign,
			role: user?.role ?? null,
			atasanLangsung: karyawan.atasanLangsung
				? {
						namaLengkap: karyawan.atasanLangsung.namaLengkap,
						nomorKaryawan: karyawan.atasanLangsung.nomorKaryawan,
						posisi: karyawan.atasanLangsung.posisiKaryawan[0]?.posisi?.nama ?? null,
					}
				: null,
			penempatan: penempatan
				? {
						posisi: penempatan.posisi?.nama ?? null,
						unitOrganisasi: penempatan.unitOrganisasi?.nama ?? null,
						tanggalEfektif: penempatan.tanggalEfektif,
						tanggalBerakhir: penempatan.tanggalBerakhir,
						lokasi: lokasi
							? {
									nama: lokasi.nama,
									alamat: lokasi.alamat,
									kota: lokasi.kota,
									provinsi: lokasi.provinsi,
									kodePos: lokasi.kodePos,
									latitude: lokasi.latitude ? decimalKeNumber(lokasi.latitude) : null,
									longitude: lokasi.longitude ? decimalKeNumber(lokasi.longitude) : null,
									radiusMeter: lokasi.radiusMeter,
								}
							: null,
					}
				: null,
			kontrak: kontrak
				? {
						nomorKontrak: kontrak.nomorKontrak,
						jenisKontrak: kontrak.jenisKontrak,
						tanggalMulai: kontrak.tanggalMulai,
						tanggalSelesai: kontrak.tanggalSelesai,
						status: kontrak.status,
					}
				: null,
		},
	});
}
