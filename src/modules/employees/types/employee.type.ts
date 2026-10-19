export const EMPLOYEE_WIZARD_STEPS = [
	"personal",
	"position",
	"family",
	"education",
	"workHistory",
	"kontrak",
] as const;

export type EmployeeWizardStepKey = (typeof EMPLOYEE_WIZARD_STEPS)[number];

export type EmployeeWizardSummary = {
	id: string;
	employeeNumber: string;
	fullName: string;
	status: string;
	updatedAt: string;
};

export type EmployeeListItem = {
	id: string;
	employeeNumber: string;
	fullName: string;
	workEmail: string;
	phone: string;
	status: string;
	joinDate: string;
	positionName: string;
	unitName: string;
	workLocationName: string;
	updatedAt: string;
};

export type EmployeeWizardOption = {
	value: string;
	label: string;
};

export type EmployeeWizardReferenceOptions = {
	users: EmployeeWizardOption[];
	userNames: Record<string, string>;
	atasanOptions: EmployeeWizardOption[];
	organizationalUnits: EmployeeWizardOption[];
	positions: EmployeeWizardOption[];
	positionUnitMap: Record<string, string>;
	workLocations: EmployeeWizardOption[];
	jenisKelamin: EmployeeWizardOption[];
	statusKaryawan: EmployeeWizardOption[];
	statusPtkp: EmployeeWizardOption[];
	bankOptions: EmployeeWizardOption[];
	jenisKontrak: EmployeeWizardOption[];
	hubunganKeluarga: EmployeeWizardOption[];
	gelarPendidikan: EmployeeWizardOption[];
	jenisDokumen: EmployeeWizardOption[];
};

export type EmployeePersonalPayload = {
	id?: string;
	userId: string;
	directSupervisorId: string;
	employeeNumber: string;
	fullName: string;
	gender: string;
	birthDate: string;
	nationalId: string;
	taxId: string;
	ptkpStatus: string;
	bankNama: string;
	bankNorek: string;
	bankAtasNama: string;
	workEmail: string;
	phone: string;
	address: string;
	status: string;
	joinDate: string;
	resignDate: string;
};

export type EmployeePositionPayload = {
	organizationalUnitId: string;
	positionId: string;
	workLocationId: string;
	isPrimary: boolean;
	isCurrent: boolean;
	effectiveDate: string;
	note: string;
};

export type EmployeeFamilyPayload = {
	name: string;
	relation: string;
	gender: string;
	birthDate: string;
	nationalId: string;
	occupation: string;
};

export type EmployeeEducationPayload = {
	degree: string;
	institution: string;
	major: string;
	startYear: string;
	graduationYear: string;
	gpa: string;
	isHighest: boolean;
	ijazah: string;
	transkrip: string;
};

export type EmployeeWorkHistoryPayload = {
	companyName: string;
	position: string;
	startDate: string;
	endDate: string;
	lastSalary: string;
	reasonLeaving: string;
	referencePhone: string;
};

export type EmployeeContractPayload = {
	contractNumber: string;
	contractType: string;
	startDate: string;
	endDate: string;
	status: string;
	baseSalary: string;
	note: string;
};

export type EmployeeDocumentPayload = {
	documentType: string;
	name: string;
	fileUrl: string;
	fileSize: string;
	mimeType: string;
	expiredAt: string;
	note: string;
};

export type EmployeeWizardDetail = {
	employeeId: string;
	personal: EmployeePersonalPayload;
	positions: EmployeePositionPayload[];
	families: EmployeeFamilyPayload[];
	educations: EmployeeEducationPayload[];
	workHistories: EmployeeWorkHistoryPayload[];
	kontrak: EmployeeContractPayload[];
};

export type EmployeeWizardStepPayloadMap = {
	personal: EmployeePersonalPayload;
	position: EmployeePositionPayload[];
	family: EmployeeFamilyPayload[];
	education: EmployeeEducationPayload[];
	workHistory: EmployeeWorkHistoryPayload[];
	kontrak: EmployeeContractPayload[];
};

export type EmployeeWizardActionResult = {
	success: boolean;
	message: string;
	employeeId?: string;
	employeeNumber?: string;
	errors?: Record<string, string>;
};
