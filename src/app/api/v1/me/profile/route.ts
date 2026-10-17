import { NextRequest } from "next/server";
import prisma from "@/src/lib/prisma";
import { decimalKeNumber } from "@/src/lib/decimal";
import { maskNilai } from "@/src/lib/masking";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";

/** Profil lengkap milik sendiri (read-only). NIK/NPWP selalu ter-mask. */

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
        dokumenKaryawan: {
          where: { jenisDokumen: "FOTO" },
          orderBy: { tanggalUnggah: "desc" },
          take: 1,
          select: { urlFile: true },
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
  const site = penempatan?.lokasiKerja ?? null;

  return ok({
    profile: {
      employeeNumber: karyawan.nomorKaryawan,
      fullName: karyawan.namaLengkap,
      gender: karyawan.gender,
      birthDate: karyawan.tanggalLahir,
      // NIK/NPWP ditampilkan ter-mask ke seluruh peran, termasuk HR.
      nik: maskNilai(karyawan.nik),
      npwp: maskNilai(karyawan.npwp),
      photoUrl: karyawan.dokumenKaryawan[0]?.urlFile ?? null,
      phone: karyawan.telepon,
      email: karyawan.email ?? user?.email ?? null,
      address: karyawan.alamat,
      status: karyawan.status,
      joinDate: karyawan.tanggalMasuk,
      resignDate: karyawan.tanggalResign,
      role: user?.role ?? null,
      directManager: karyawan.atasanLangsung
        ? {
            fullName: karyawan.atasanLangsung.namaLengkap,
            employeeNumber: karyawan.atasanLangsung.nomorKaryawan,
            position: karyawan.atasanLangsung.posisiKaryawan[0]?.posisi?.nama ?? null,
          }
        : null,
      placement: penempatan
        ? {
            position: penempatan.posisi?.nama ?? null,
            orgUnit: penempatan.unitOrganisasi?.nama ?? null,
            effectiveDate: penempatan.tanggalEfektif,
            endDate: penempatan.tanggalBerakhir,
            location: site
              ? {
                  name: site.nama,
                  address: site.alamat,
                  city: site.kota,
                  province: site.provinsi,
                  postalCode: site.kodePos,
                  latitude: site.latitude ? decimalKeNumber(site.latitude) : null,
                  longitude: site.longitude ? decimalKeNumber(site.longitude) : null,
                  radiusMeters: site.radiusMeter,
                }
              : null,
          }
        : null,
      contract: kontrak
        ? {
            contractNumber: kontrak.nomorKontrak,
            contractType: kontrak.jenisKontrak,
            startDate: kontrak.tanggalMulai,
            endDate: kontrak.tanggalSelesai,
            status: kontrak.status,
          }
        : null,
    },
  });
}
