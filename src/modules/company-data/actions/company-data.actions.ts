"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/src/lib/prisma";
import { parseAndValidateCompanyData } from "../schemas/company-data.schema";
import type {
	CompanyActionResult,
	CompanyLocationOptions,
	CompanyLogoUploadResult,
	CompanyPreviewData,
} from "../types/company-data.type";

function mapCompanyToPreview(company: {
	id: string;
	nama: string;
	logo: string | null;
	npwp: string | null;
	telepon: string | null;
	email: string | null;
	website: string | null;
	alamat: string | null;
	provinsiId: string | null;
	kotaId: string | null;
	kecamatanId: string | null;
	desaId: string | null;
	kodePos: string | null;
}, locationNames: {
	provinceName: string | null;
	cityName: string | null;
	districtName: string | null;
	villageName: string | null;
}): CompanyPreviewData {
	return {
		id: company.id,
		name: company.nama,
		logo: company.logo,
		taxId: company.npwp,
		phone: company.telepon,
		email: company.email,
		website: company.website,
		address: company.alamat,
		provinceId: company.provinsiId,
		provinceName: locationNames.provinceName,
		cityId: company.kotaId,
		cityName: locationNames.cityName,
		districtId: company.kecamatanId,
		districtName: locationNames.districtName,
		villageId: company.desaId,
		villageName: locationNames.villageName,
		postalCode: company.kodePos,
	};
}

export async function getCompanyData(): Promise<CompanyPreviewData | null> {
	const company = await prisma.perusahaan.findFirst({
		orderBy: { createdAt: "asc" },
	});

	if (!company) return null;

	const [province, city, district, village] = await Promise.all([
		company.provinsiId ? prisma.provinsi.findUnique({ where: { id: company.provinsiId }, select: { nama: true } }) : null,
		company.kotaId ? prisma.kota.findUnique({ where: { id: company.kotaId }, select: { nama: true } }) : null,
		company.kecamatanId ? prisma.kecamatan.findUnique({ where: { id: company.kecamatanId }, select: { nama: true } }) : null,
		company.desaId ? prisma.desa.findUnique({ where: { id: company.desaId }, select: { nama: true } }) : null,
	]);

	return mapCompanyToPreview(company, {
		provinceName: province?.nama ?? null,
		cityName: city?.nama ?? null,
		districtName: district?.nama ?? null,
		villageName: village?.nama ?? null,
	});
}

export async function getCompanyLocationOptions(): Promise<CompanyLocationOptions> {
	const [provinces, cities, districts, villages] = await Promise.all([
		prisma.provinsi.findMany({
			orderBy: { nama: "asc" },
			select: { id: true, nama: true },
		}),
		prisma.kota.findMany({
			orderBy: { nama: "asc" },
			select: { id: true, nama: true, provinsiId: true },
		}),
		prisma.kecamatan.findMany({
			orderBy: { nama: "asc" },
			select: { id: true, nama: true, kotaId: true },
		}),
		prisma.desa.findMany({
			orderBy: { nama: "asc" },
			select: { id: true, nama: true, kecamatanId: true },
		}),
	]);

	return {
		provinces: provinces.map((p) => ({ id: p.id, name: p.nama })),
		cities: cities.map((c) => ({ id: c.id, name: c.nama, provinceId: c.provinsiId })),
		districts: districts.map((d) => ({ id: d.id, name: d.nama, cityId: d.kotaId })),
		villages: villages.map((v) => ({ id: v.id, name: v.nama, districtId: v.kecamatanId })),
	};
}

export async function createCompanyData(formData: FormData): Promise<CompanyActionResult> {
	const validation = parseAndValidateCompanyData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data perusahaan tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	await prisma.perusahaan.create({
		data: {
			nama: data.name,
			npwp: data.taxId,
			telepon: data.phone,
			email: data.email,
			website: data.website,
			alamat: data.address,
			provinsiId: data.provinceId,
			kotaId: data.cityId,
			kecamatanId: data.districtId,
			desaId: data.villageId,
			kodePos: data.postalCode
		},
	});

	revalidatePath("/settings/company-data");

	return {
		success: true,
		message: "Data perusahaan berhasil dibuat.",
	};
}

export async function updateCompanyData(formData: FormData): Promise<CompanyActionResult> {
	const validation = parseAndValidateCompanyData(formData);

	if (!validation.isValid) {
		const messages = Object.values(validation.errors).join("; ");
		return {
			success: false,
			message: `Data perusahaan tidak valid: ${messages}`,
			errors: validation.errors,
		};
	}

	const { data } = validation;

	if (!data.id) {
		return {
			success: false,
			message: "ID company tidak ditemukan untuk update.",
			errors: { id: "ID wajib ada untuk proses update." },
		};
	}

	await prisma.perusahaan.update({
		where: { id: data.id },
		data: {
			nama: data.name,
			npwp: data.taxId,
			telepon: data.phone,
			email: data.email,
			website: data.website,
			alamat: data.address,
			provinsiId: data.provinceId,
			kotaId: data.cityId,
			kecamatanId: data.districtId,
			desaId: data.villageId,
			kodePos: data.postalCode,
		},
	});

	revalidatePath("/settings/company-data");

	return {
		success: true,
		message: "Data perusahaan berhasil diperbarui.",
	};
}

export async function saveCompanyDataAction(formData: FormData): Promise<CompanyActionResult> {
	const companyId = String(formData.get("id") ?? "").trim();

	if (companyId) {
		return updateCompanyData(formData);
	}

	return createCompanyData(formData);
}

export async function submitCompanyDataAction(
	_prevState: CompanyActionResult | null,
	formData: FormData,
): Promise<CompanyActionResult> {
	return saveCompanyDataAction(formData);
}

export async function uploadCompanyLogoAction(formData: FormData): Promise<CompanyLogoUploadResult> {
	const companyId = String(formData.get("companyId") ?? "").trim();
	const file = formData.get("file");

	if (!companyId) {
		return {
			success: false,
			message: "Simpan data company terlebih dahulu sebelum upload logo.",
		};
	}

	if (!(file instanceof File)) {
		return {
			success: false,
			message: "File logo tidak valid.",
		};
	}

	if (!file.type.startsWith("image/")) {
		return {
			success: false,
			message: "File harus berupa gambar.",
		};
	}

	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);

	const { hapusFile, isStoragePath, simpanFile } = await import("@/src/lib/storage-local");

	const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : "jpg";

	const result = await simpanFile({
		buffer,
		originalName: `logo.${extension}`,
		mime: file.type,
		ownerType: "perusahaan",
		ownerId: companyId,
		subfolder: "logo",
		customName: "logo",
		jenis: "logo",
	});

	const previous = await prisma.perusahaan.findUnique({
		where: { id: companyId },
		select: { logo: true },
	});

	await prisma.perusahaan.update({
		where: { id: companyId },
		data: { logo: result.url },
	});

	if (previous?.logo && isStoragePath(previous.logo) && previous.logo !== result.url) {
		try {
			await hapusFile(previous.logo);
		} catch {
			// Logo lama gagal dihapus — abaikan agar upload tetap sukses.
		}
	}

	revalidatePath("/settings/company-data");

	return {
		success: true,
		message: "Logo berhasil disimpan.",
		logo: result.url,
	};
}
