import prisma from "@/src/lib/prisma";
import { recordAudit } from "@/src/modules/audit/lib/audit";

export const UPDATE_DATA_CATEGORIES = ["ALAMAT", "KONTAK", "KELUARGA", "PENDIDIKAN", "DOKUMEN"] as const;
export type DataUpdateCategoryInput = (typeof UPDATE_DATA_CATEGORIES)[number];

export function getCategoryLabel(k: string): string {
  return k === "ALAMAT"
    ? "Alamat"
    : k === "KONTAK"
      ? "Kontak"
      : k === "KELUARGA"
        ? "Keluarga"
        : k === "PENDIDIKAN"
          ? "Pendidikan"
          : k === "DOKUMEN"
            ? "Dokumen"
            : k;
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Key canonicalization at the transport boundary: mobile sends English keys,
 * older rows + the web form use Indonesian keys. Everything downstream works
 * on the Indonesian (master-mirroring) keys.
 */
const KEY_ALIASES: Record<string, string> = {
  address: "alamat",
  phone: "telepon",
  name: "nama",
  relation: "hubungan",
  birthDate: "tanggalLahir",
  occupation: "pekerjaan",
  degree: "gelar",
  institution: "institusi",
  major: "jurusan",
  startYear: "tahunMulai",
  graduationYear: "tahunLulus",
  gpa: "ipk",
  documentType: "jenisDokumen",
  fileUrl: "urlFile",
  expiryDate: "tanggalKadaluarsa",
  note: "catatan",
};

export function normalizeDataBaru(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    out[KEY_ALIASES[k] ?? k] = v;
  }
  return out;
}

/** Validasi newData per kategori. Return pesan error atau null bila valid. */
export function validateDataUpdate(category: string, newData: Record<string, unknown>): string | null {
  const data = normalizeDataBaru(newData);
  if (!(UPDATE_DATA_CATEGORIES as readonly string[]).includes(category)) return "Kategori tidak valid.";
  if (category === "ALAMAT") {
    if (!text(data["alamat"])) return "Alamat baru wajib diisi.";
    if (text(data["alamat"]).length > 500) return "Alamat maksimal 500 karakter.";
    return null;
  }
  if (category === "KONTAK") {
    const phone = text(data["telepon"]);
    const email = text(data["email"]);
    if (!phone && !email) return "Isi telepon atau email baru.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Format email tidak valid.";
    if (phone && phone.length > 30) return "Telepon maksimal 30 karakter.";
    return null;
  }
  if (category === "KELUARGA") {
    if (!text(data["nama"])) return "Nama anggota keluarga wajib diisi.";
    if (!["PASANGAN", "ANAK", "ORANG_TUA", "SAUDARA", "LAINNYA"].includes(text(data["hubungan"]))) {
      return "Hubungan tidak valid.";
    }
    if (!["LAKI_LAKI", "PEREMPUAN"].includes(text(data["gender"]))) return "Jenis kelamin tidak valid.";
    return null;
  }
  if (category === "PENDIDIKAN") {
    const degrees = [
      "SD",
      "SMP",
      "SMA_SMK",
      "D1",
      "D2",
      "D3",
      "D4",
      "S1",
      "S2",
      "S3",
      "LAINNYA",
    ];
    if (!degrees.includes(text(data["gelar"]))) return "Gelar tidak valid.";
    if (!text(data["institusi"])) return "Institusi wajib diisi.";
    return null;
  }
  if (category === "DOKUMEN") {
    const kinds = [
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
    ];
    if (!kinds.includes(text(data["jenisDokumen"]))) return "Jenis dokumen tidak valid.";
    if (!text(data["nama"])) return "Nama dokumen wajib diisi.";
    if (!text(data["urlFile"])) return "File dokumen wajib diunggah dulu.";
    return null;
  }
  return "Kategori tidak valid.";
}

/** Ringkasan satu baris untuk inbox approval. */
export function summarizeDataUpdate(category: string, newData: Record<string, unknown>): string {
  const data = normalizeDataBaru(newData);
  if (category === "ALAMAT") return `Alamat → ${text(data["alamat"]).slice(0, 60)}`;
  if (category === "KONTAK") {
    const parts = [];
    if (text(data["telepon"])) parts.push(text(data["telepon"]));
    if (text(data["email"])) parts.push(text(data["email"]));
    return `Kontak → ${parts.join(" • ")}`;
  }
  if (category === "KELUARGA") return `Keluarga: ${text(data["nama"])} (${text(data["hubungan"])})`;
  if (category === "PENDIDIKAN") return `Pendidikan: ${text(data["gelar"])} — ${text(data["institusi"])}`;
  if (category === "DOKUMEN") return `Dokumen: ${text(data["nama"])} (${text(data["jenisDokumen"])})`;
  return category;
}

function parseNullableDate(v: unknown): Date | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Terapkan usulan yang disetujui final ke tabel master.
 * Dipanggil sebagai onFinalApprove; mengembalikan gagal bila data tak valid
 * supaya status approval dikembalikan ke MENUNGGU (pola engine).
 */
export async function applyDataUpdate(id: string): Promise<{ success: boolean; message: string }> {
  const row = await prisma.updateDataRequest.findUnique({ where: { id } });
  if (!row) return { success: false, message: "Pengajuan tidak ditemukan." };
  const newData = normalizeDataBaru((row.dataBaru ?? {}) as Record<string, unknown>);
  const err = validateDataUpdate(row.kategori, newData);
  if (err) return { success: false, message: err };

  const employee = await prisma.karyawan.findUnique({
    where: { id: row.karyawanId },
    select: { id: true, alamat: true, telepon: true, email: true },
  });
  if (!employee) return { success: false, message: "Employee tidak ditemukan." };

  let sebelum: unknown = row.dataLama ?? null;
  let sesudah: unknown = newData;

  if (row.kategori === "ALAMAT") {
    sebelum = { alamat: employee.alamat };
    sesudah = { alamat: text(newData["alamat"]) };
    await prisma.karyawan.update({ where: { id: row.karyawanId }, data: { alamat: text(newData["alamat"]) } });
  } else if (row.kategori === "KONTAK") {
    const patch: { telepon?: string | null; email?: string | null } = {};
    if ("telepon" in newData) patch.telepon = text(newData["telepon"]) || null;
    if ("email" in newData) patch.email = text(newData["email"]) || null;
    sebelum = { telepon: employee.telepon, email: employee.email };
    sesudah = patch;
    await prisma.karyawan.update({ where: { id: row.karyawanId }, data: patch });
  } else if (row.kategori === "KELUARGA") {
    const data = {
      nama: text(newData["nama"]),
      hubungan: text(newData["hubungan"]) as never,
      gender: text(newData["gender"]) as never,
      tanggalLahir: parseNullableDate(newData["tanggalLahir"]),
      nik: text(newData["nik"]) || null,
      pekerjaan: text(newData["pekerjaan"]) || null,
    };
    if (row.targetId) {
      const existing = await prisma.keluargaKaryawan.findFirst({
        where: { id: row.targetId, karyawanId: row.karyawanId },
      });
      if (!existing) return { success: false, message: "Data keluarga tujuan tidak ditemukan." };
      sebelum = existing;
      const updated = await prisma.keluargaKaryawan.update({ where: { id: row.targetId }, data });
      sesudah = updated;
    } else {
      const created = await prisma.keluargaKaryawan.create({ data: { karyawanId: row.karyawanId, ...data } });
      sesudah = created;
    }
  } else if (row.kategori === "PENDIDIKAN") {
    const toInt = (v: unknown): number | null => {
      const n = Number.parseInt(text(v), 10);
      return Number.isFinite(n) ? n : null;
    };
    const toFloat = (v: unknown): number | null => {
      const n = Number.parseFloat(String(v ?? "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };
    const created = await prisma.pendidikanKaryawan.create({
      data: {
        karyawanId: row.karyawanId,
        gelar: text(newData["gelar"]) as never,
        institusi: text(newData["institusi"]),
        jurusan: text(newData["jurusan"]) || null,
        tahunMulai: toInt(newData["tahunMulai"]),
        tahunLulus: toInt(newData["tahunLulus"]),
        ipk: toFloat(newData["ipk"]),
        isHighest: newData["isHighest"] === true,
      },
    });
    sesudah = created;
  } else {
    const created = await prisma.dokumenKaryawan.create({
      data: {
        karyawanId: row.karyawanId,
        jenisDokumen: text(newData["jenisDokumen"]) as never,
        nama: text(newData["nama"]),
        urlFile: text(newData["urlFile"]),
        tanggalKadaluarsa: parseNullableDate(newData["tanggalKadaluarsa"]),
        catatan: `Verifikasi mandiri ${row.nomor}${text(newData["catatan"]) ? ` — ${text(newData["catatan"])}` : ""}`,
      },
    });
    sesudah = created;
  }

  const finalStep = await prisma.approvalStep.findFirst({
    where: { referensiType: "UPDATE_DATA", referensiId: id, status: "DISETUJUI" },
    orderBy: { tahap: "desc" },
    select: { diprosesOlehId: true },
  });
  await prisma.updateDataRequest.update({
    where: { id },
    data: { diputuskanOlehId: finalStep?.diprosesOlehId ?? null, diputuskanPada: new Date() },
  });
  await recordAudit({
    actorUserId: finalStep?.diprosesOlehId ?? null,
    aksi: "UPDATE_DATA.DITERAPKAN",
    entityType: "UpdateDataRequest",
    entityId: id,
    sebelum,
    sesudah,
    reason: row.alasan,
  });
  return { success: true, message: "Perubahan diterapkan ke data master." };
}
