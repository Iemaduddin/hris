"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
	name: string;
	logo: string | null;
	taxId: string | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	address: string | null;
	provinceId: string | null;
	cityId: string | null;
	districtId: string | null;
	villageId: string | null;
	postalCode: string | null;
}, locationNames: {
	provinceName: string | null;
	cityName: string | null;
	districtName: string | null;
	villageName: string | null;
}): CompanyPreviewData {
	return {
		id: company.id,
		name: company.name,
		logo: company.logo,
		taxId: company.taxId,
		phone: company.phone,
		email: company.email,
		website: company.website,
		address: company.address,
		provinceId: company.provinceId,
		provinceName: locationNames.provinceName,
		cityId: company.cityId,
		cityName: locationNames.cityName,
		districtId: company.districtId,
		districtName: locationNames.districtName,
		villageId: company.villageId,
		villageName: locationNames.villageName,
		postalCode: company.postalCode,
	};
}

export async function getCompanyData(): Promise<CompanyPreviewData | null> {
	const company = await prisma.company.findFirst({
		orderBy: { createdAt: "asc" },
	});

	if (!company) return null;

	const [province, city, district, village] = await Promise.all([
		company.provinceId ? prisma.province.findUnique({ where: { id: company.provinceId }, select: { name: true } }) : null,
		company.cityId ? prisma.city.findUnique({ where: { id: company.cityId }, select: { name: true } }) : null,
		company.districtId ? prisma.district.findUnique({ where: { id: company.districtId }, select: { name: true } }) : null,
		company.villageId ? prisma.village.findUnique({ where: { id: company.villageId }, select: { name: true } }) : null,
	]);

	return mapCompanyToPreview(company, {
		provinceName: province?.name ?? null,
		cityName: city?.name ?? null,
		districtName: district?.name ?? null,
		villageName: village?.name ?? null,
	});
}

export async function getCompanyLocationOptions(): Promise<CompanyLocationOptions> {
	const [provinces, cities, districts, villages] = await Promise.all([
		prisma.province.findMany({
			orderBy: { name: "asc" },
			select: { id: true, name: true },
		}),
		prisma.city.findMany({
			orderBy: { name: "asc" },
			select: { id: true, name: true, provinceId: true },
		}),
		prisma.district.findMany({
			orderBy: { name: "asc" },
			select: { id: true, name: true, cityId: true },
		}),
		prisma.village.findMany({
			orderBy: { name: "asc" },
			select: { id: true, name: true, districtId: true },
		}),
	]);

	return { provinces, cities, districts, villages };
}

export async function createCompanyData(formData: FormData): Promise<CompanyActionResult> {
	const validation = parseAndValidateCompanyData(formData);

	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { data } = validation;

	await prisma.company.create({
		data: {
			name: data.name,
			taxId: data.taxId,
			phone: data.phone,
			email: data.email,
			website: data.website,
			address: data.address,
			provinceId: data.provinceId,
			cityId: data.cityId,
			districtId: data.districtId,
			villageId: data.villageId,
			postalCode: data.postalCode
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
		return {
			success: false,
			message: "Validasi gagal.",
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

	await prisma.company.update({
		where: { id: data.id },
		data: {
			name: data.name,
			taxId: data.taxId,
			phone: data.phone,
			email: data.email,
			website: data.website,
			address: data.address,
			provinceId: data.provinceId,
			cityId: data.cityId,
			districtId: data.districtId,
			villageId: data.villageId,
			postalCode: data.postalCode,
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
			message: "Simpan data company terlebih dahulu sebelum upload avatar.",
		};
	}

	if (!(file instanceof File)) {
		return {
			success: false,
			message: "File avatar tidak valid.",
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
	const uploadDirectory = path.join(process.cwd(), "public", "uploads", "company");
	await mkdir(uploadDirectory, { recursive: true });

	const extension = file.type === "image/webp" ? "webp" : "jpg";
	const fileName = `company-logo-${companyId}-${randomUUID()}.${extension}`;
	const absolutePath = path.join(uploadDirectory, fileName);
	const relativePath = `/uploads/company/${fileName}`;

	await writeFile(absolutePath, buffer);

	await prisma.company.update({
		where: { id: companyId },
		data: { logo: relativePath },
	});

	revalidatePath("/settings/company-data");

	return {
		success: true,
		message: "Avatar berhasil disimpan.",
		logo: relativePath,
	};
}
