export type ScheduleAssignmentFormValues = {
	id?: number;
	karyawanId: string;
	jadwalKerjaId: number;
	tanggalMulai: string;
	tanggalSelesai: string | null;
};

export type ScheduleAssignmentValidationErrors = Partial<Record<keyof ScheduleAssignmentFormValues, string>>;

export type ScheduleAssignmentValidationResult =
	| {
		isValid: true;
		data: ScheduleAssignmentFormValues;
	}
	| {
		isValid: false;
		errors: ScheduleAssignmentValidationErrors;
	};

export type ScheduleAssignmentActionResult = {
	success: boolean;
	message: string;
	id?: number;
	errors?: ScheduleAssignmentValidationErrors;
};

export type ScheduleAssignmentListItem = {
	id: number;
	karyawanId: string;
	jadwalKerjaId: number;
	tanggalMulai: Date;
	tanggalSelesai: Date | null;
	createdAt: Date;
	karyawan: {
		namaLengkap: string;
		nomorKaryawan: string;
	};
	jadwalKerja: {
		hari: string;
		isHariKerja: boolean;
		jamMasuk: Date | null;
		jamKeluar: Date | null;
		kalenderKerja: {
			nama: string;
		};
	};
};

export type KaryawanOption = {
	id: string;
	namaLengkap: string;
	nomorKaryawan: string;
};

export type JadwalKerjaOption = {
	id: number;
	hari: string;
	isHariKerja: boolean;
	jamMasuk: Date | null;
	jamKeluar: Date | null;
	kalenderKerja: {
		nama: string;
	};
};
