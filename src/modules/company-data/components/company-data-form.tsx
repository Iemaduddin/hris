"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { submitCompanyDataAction } from "../actions/company-data.actions";
import type { CompanyActionResult, CompanyLocationOptions, CompanyPreviewData } from "../types/company-data.type";

function SubmitButton() {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{pending ? "Menyimpan..." : "Simpan Data Perusahaan"}
		</button>
	);
}

type CompanyDataFormProps = {
	company: CompanyPreviewData | null;
	locationOptions: CompanyLocationOptions;
};

export default function CompanyDataForm({ company, locationOptions }: CompanyDataFormProps) {
	const [state, formAction] = useActionState<CompanyActionResult | null, FormData>(submitCompanyDataAction, null);
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [provinceId, setProvinceId] = useState(company?.provinceId ?? "");
	const [cityId, setCityId] = useState(company?.cityId ?? "");
	const [districtId, setDistrictId] = useState(company?.districtId ?? "");
	const [villageId, setVillageId] = useState(company?.villageId ?? "");

	const provinceSelectOptions = useMemo(
		() => locationOptions.provinces.map((item) => ({ label: item.name, value: item.id })),
		[locationOptions.provinces],
	);

	const citySelectOptions = useMemo(
		() => locationOptions.cities.filter((item) => item.provinceId === provinceId).map((item) => ({ label: item.name, value: item.id })),
		[locationOptions.cities, provinceId],
	);

	const districtSelectOptions = useMemo(
		() => locationOptions.districts.filter((item) => item.cityId === cityId).map((item) => ({ label: item.name, value: item.id })),
		[locationOptions.districts, cityId],
	);

	const villageSelectOptions = useMemo(
		() => locationOptions.villages.filter((item) => item.districtId === districtId).map((item) => ({ label: item.name, value: item.id })),
		[locationOptions.villages, districtId],
	);

	useEffect(() => {
		setProvinceId(company?.provinceId ?? "");
		setCityId(company?.cityId ?? "");
		setDistrictId(company?.districtId ?? "");
		setVillageId(company?.villageId ?? "");
	}, [company?.provinceId, company?.cityId, company?.districtId, company?.villageId]);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = [
			"name",
			"taxId",
			"email",
			"phone",
			"website",
			"address",
			"provinceId",
			"cityId",
			"districtId",
			"villageId",
			"postalCode",
		] as const;

		for (const field of orderedFields) {
			if (!state.errors[field]) continue;

			const namedField = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
			if (namedField && namedField.tabIndex !== -1 && namedField.getAttribute("aria-hidden") !== "true") {
				namedField.scrollIntoView({ behavior: "smooth", block: "center" });
				namedField.focus({ preventScroll: true });
				return;
			}

			const selectTrigger = formRef.current?.querySelector<HTMLElement>(`[data-select-trigger-for="${field}"]`);
			if (selectTrigger) {
				selectTrigger.scrollIntoView({ behavior: "smooth", block: "center" });
				selectTrigger.focus({ preventScroll: true });
				return;
			}
		}
	}, [state]);

	useEffect(() => {
		if (!state?.success) return;

		toast.success(state.message || "Data perusahaan berhasil disimpan.");
		router.refresh();

	}, [state]);

	return (
		<form ref={formRef} action={formAction} className="mt-4">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			<input type="hidden" name="id" defaultValue={company?.id ?? ""} />
			<FloatingInput
				name="name"
				label="Nama Perusahaan"
				defaultValue={company?.name ?? ""}
				errorText={state?.errors?.name}
				required
			/>
			<FloatingInput
				name="taxId"
				label="NPWP"
				defaultValue={company?.taxId ?? ""}
				errorText={state?.errors?.taxId}
			/>
			<FloatingInput
				name="email"
				label="Email"
				type="email"
				defaultValue={company?.email ?? ""}
				errorText={state?.errors?.email}
			/>
			<FloatingInput
				name="phone"
				label="Telepon"
				type="tel"
				defaultValue={company?.phone ?? ""}
				errorText={state?.errors?.phone}
			/>
			<FloatingInput
				name="website"
				label="Website"
				type="url"
				defaultValue={company?.website ?? ""}
				errorText={state?.errors?.website}
			/>


			<FloatingSelect
				name="provinceId"
				label="Provinsi"
				value={provinceId}
				onValueChange={(nextValue) => {
					setProvinceId(nextValue);
					setCityId("");
					setDistrictId("");
					setVillageId("");
				}}
				options={provinceSelectOptions}
				errorText={state?.errors?.provinceId}
				searchable
			/>
			<FloatingSelect
				name="cityId"
				label="Kabupaten/Kota"
				value={cityId}
				onValueChange={(nextValue) => {
					setCityId(nextValue);
					setDistrictId("");
					setVillageId("");
				}}
				options={citySelectOptions}
				errorText={state?.errors?.cityId}
				disabled={!provinceId}
				searchable
			/>
			<FloatingSelect
				name="districtId"
				label="Kecamatan"
				value={districtId}
				onValueChange={(nextValue) => {
					setDistrictId(nextValue);
					setVillageId("");
				}}
				options={districtSelectOptions}
				errorText={state?.errors?.districtId}
				disabled={!cityId}
				searchable
			/>
			<FloatingSelect
				name="villageId"
				label="Kelurahan/Desa"
				value={villageId}
				onValueChange={(nextValue) => setVillageId(nextValue)}
				options={villageSelectOptions}
				errorText={state?.errors?.villageId}
				disabled={!districtId}
				searchable
			/>
			<FloatingInput
				name="postalCode"
				label="Kode Pos"
				defaultValue={company?.postalCode ?? ""}
				errorText={state?.errors?.postalCode}
			/>
			<FloatingInput
				name="address"
				label="Alamat"
				defaultValue={company?.address ?? ""}
				errorText={state?.errors?.address}
				containerClassName="md:col-span-2"
			/>
			</div>
			<div className="mt-4 flex items-center justify-end gap-4">
				<SubmitButton />
			</div>
		</form>
	);
}
