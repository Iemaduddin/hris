import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const posisi = await prisma.posisi.findFirst({ where: { nama: "Payroll Officer" }, select: { id: true } })
    ?? await prisma.posisi.findFirst({ select: { id: true } });
  const unit = await prisma.unitOrganisasi.findFirst({ where: { nama: { contains: "Keuangan" } }, select: { id: true } })
    ?? await prisma.unitOrganisasi.findFirst({ select: { id: true } });

  const uji = await prisma.karyawan.update({
    where: { id: "cmuugt0s60000qcuo43xi14xg" },
    data: {
      nik: "3273012501900004",
      npwp: "3273012501900004000",
      telepon: "0812-3456-7890",
      email: "employee@example.com",
      alamat: "Jl. Kenanga No. 21, Bangkalan, Jawa Timur 69112",
      tanggalLahir: new Date(Date.UTC(1990, 0, 25)),
      posisiKaryawan: { update: { where: { id: (await prisma.posisiKaryawan.findFirst({ where: { karyawanId: "cmuugt0s60000qcuo43xi14xg" }, select: { id: true } }))!.id }, data: { posisiId: posisi?.id ?? null, unitOrganisasiId: unit?.id ?? null } } },
    },
    select: { nomorKaryawan: true, nik: true, posisiKaryawan: { select: { posisiId: true, unitOrganisasiId: true } } },
  });
  console.log("profil uji:", JSON.stringify(uji));

  const iemad = await prisma.karyawan.findUnique({ where: { id: "cmt5xpcv80003gcuoud1zu534" }, select: { nik: true, telepon: true, alamat: true } });
  console.log("profil iemaduddin (opsional):", JSON.stringify(iemad));
}
main().finally(() => prisma.$disconnect());
