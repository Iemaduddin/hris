"use client";

import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import type { PersonalStepProps } from "../types/step-props.type";

export default function PersonalStep({ value, onChange, errorMap, referenceOptions }: PersonalStepProps) {
	function update(field: keyof typeof value, val: string) {
		onChange((prev) => ({ ...prev, [field]: val }));
	}

	function getError(field: string) {
		return errorMap[field];
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			<FloatingSelect
				name="userId"
				label="Akun User"
				value={value.userId}
				onValueChange={(val) => {
					const autoName = val ? referenceOptions.userNames[val] ?? "" : "";
					onChange((prev) => ({
						...prev,
						userId: val,
						fullName: autoName || prev.fullName,
					}));
				}}
				options={referenceOptions.users}
				placeholder="Pilih akun user"
				required
			/>
			<FloatingInput
				name="fullName"
				label="Nama Lengkap"
				value={value.fullName}
				onChange={(e) => update("fullName", e.target.value)}
				errorText={getError("fullName")}
				required
			/>

		<FloatingInput
			name="employeeNumber"
			label="Nomor Employee"
			value={value.employeeNumber || "(Digenerate otomatis: KODECABANG.TAHUN.URUT di tahap Penempatan)"}
			onChange={() => {}}
			disabled
			errorText={getError("employeeNumber")}
		/>

			<FloatingSelect
				name="gender"
				label="Jenis Kelamin"
				searchable={false}
				value={value.gender}
				onValueChange={(val) => update("gender", val)}
				options={referenceOptions.jenisKelamin}
				errorText={getError("gender")}
			/>

			<FloatingInput
				name="birthDate"
				label="Tanggal Lahir"
				type="date"
				value={value.birthDate}
				onChange={(e) => update("birthDate", e.target.value)}
			/>
			<FloatingInput
				name="nationalId"
				label="NIK KTP"
				value={value.nationalId}
				onChange={(e) => update("nationalId", e.target.value)}
			/>
		<FloatingInput
			name="taxId"
			label="NPWP"
			value={value.taxId}
			onChange={(e) => update("taxId", e.target.value)}
		/>
		<FloatingSelect
			name="ptkpStatus"
			label="Status PTKP (PPh 21 TER)"
			value={value.ptkpStatus}
			onValueChange={(val) => update("ptkpStatus", val)}
			options={referenceOptions.statusPtkp}
			errorText={getError("ptkpStatus")}
		/>
		<FloatingSelect
			name="bankNama"
			label="Bank (disbursement gaji)"
			value={value.bankNama}
			onValueChange={(val) => update("bankNama", val)}
			options={referenceOptions.bankOptions}
			placeholder="Pilih bank"
			errorText={getError("bankNama")}
		/>
		<FloatingInput
			name="bankNorek"
			label="No. Rekening"
			value={value.bankNorek}
			onChange={(e) => update("bankNorek", e.target.value)}
			errorText={getError("bankNorek")}
		/>
		<FloatingInput
			name="bankAtasNama"
			label="Rekening Atas Nama"
			value={value.bankAtasNama}
			onChange={(e) => update("bankAtasNama", e.target.value)}
			errorText={getError("bankAtasNama")}
		/>

			<FloatingInput
				name="workEmail"
				label="Email Kantor"
				value={value.workEmail}
				onChange={(e) => update("workEmail", e.target.value)}
			/>
			<FloatingInput
				name="phone"
				label="No. HP"
				value={value.phone}
				onChange={(e) => update("phone", e.target.value)}
			/>

			<FloatingInput
				name="address"
				label="Alamat"
				value={value.address}
				onChange={(e) => update("address", e.target.value)}
			/>

			<FloatingSelect
				name="status"
				label="Status Employee"
				value={value.status}
				onValueChange={(val) => update("status", val)}
				options={referenceOptions.statusKaryawan}
			/>
		<FloatingInput
			name="joinDate"
			label="Tanggal Masuk"
			type="date"
			value={value.joinDate || new Date().toISOString().split("T")[0]}
			onChange={(e) => update("joinDate", e.target.value)}
			errorText={getError("joinDate")}
			required
		/>
		<FloatingSelect
			name="directSupervisorId"
			label="Atasan Langsung"
			value={value.directSupervisorId}
			onValueChange={(val) => update("directSupervisorId", val)}
			options={referenceOptions.atasanOptions}
			placeholder="Pilih atasan langsung"
			errorText={getError("directSupervisorId")}
		/>
	</div>
	);
}
