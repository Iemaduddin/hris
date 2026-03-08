export const EMPLOYEE_WIZARD_STEPS = [
	"personal",
	"position",
	"family",
	"education",
	"workHistory",
	"bankAccount",
	"bpjs",
	"document",
] as const;

export type EmployeeWizardStepKey = (typeof EMPLOYEE_WIZARD_STEPS)[number];

export type EmployeeWizardSummary = {
	id: string;
	employeeNumber: string;
	fullName: string;
	status: string;
	updatedAt: string;
};

export type EmployeeWizardOption = {
	value: string;
	label: string;
};

export type EmployeeWizardReferenceOptions = {
	users: EmployeeWizardOption[];
	organizationalUnits: EmployeeWizardOption[];
	positions: EmployeeWizardOption[];
	workLocations: EmployeeWizardOption[];
	genders: EmployeeWizardOption[];
	religions: EmployeeWizardOption[];
	bloodTypes: EmployeeWizardOption[];
	maritalStatuses: EmployeeWizardOption[];
	employeeStatuses: EmployeeWizardOption[];
	employmentTypes: EmployeeWizardOption[];
	familyRelations: EmployeeWizardOption[];
	educationDegrees: EmployeeWizardOption[];
	documentTypes: EmployeeWizardOption[];
};

export type EmployeeEmergencyContact = {
	name: string;
	phone: string;
	relation: string;
};

export type EmployeePersonalPayload = {
	id?: string;
	userId: string;
	employeeNumber: string;
	fullName: string;
	nickname: string;
	gender: string;
	birthPlace: string;
	birthDate: string;
	nationalId: string;
	taxId: string;
	religion: string;
	bloodType: string;
	maritalStatus: string;
	photo: string;
	personalEmail: string;
	workEmail: string;
	phone: string;
	emergencyContact: EmployeeEmergencyContact;
	currentAddress: string;
	currentCity: string;
	currentProvince: string;
	currentPostal: string;
	idAddress: string;
	idCity: string;
	idProvince: string;
	idPostal: string;
	status: string;
	employmentType: string;
	joinDate: string;
	probationEndDate: string;
	contractEndDate: string;
	resignDate: string;
	resignReason: string;
	terminationNote: string;
};

export type EmployeePositionPayload = {
	organizationalUnitId: string;
	positionId: string;
	workLocationId: string;
	isPrimary: boolean;
	isCurrent: boolean;
	effectiveDate: string;
	endDate: string;
	note: string;
};

export type EmployeeFamilyPayload = {
	name: string;
	relation: string;
	gender: string;
	birthDate: string;
	nationalId: string;
	occupation: string;
	isDependent: boolean;
	isBpjsDependent: boolean;
	isHeir: boolean;
};

export type EmployeeEducationPayload = {
	degree: string;
	institution: string;
	major: string;
	startYear: string;
	graduationYear: string;
	gpa: string;
	isHighest: boolean;
	documentUrl: string;
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

export type EmployeeBankAccountPayload = {
	bankName: string;
	bankCode: string;
	accountNumber: string;
	accountName: string;
	isPrimary: boolean;
};

export type EmployeeBpjsPayload = {
	bpjsHealthNumber: string;
	bpjsHealthClass: string;
	bpjsHealthDate: string;
	bpjsTkNumber: string;
	bpjsJhtDate: string;
	bpjsJpDate: string;
	bpjsJkkDate: string;
	bpjsJkmDate: string;
};

export type EmployeeDocumentPayload = {
	documentType: string;
	name: string;
	fileUrl: string;
	fileSize: string;
	mimeType: string;
	expiredAt: string;
	note: string;
	uploadedAt: string;
};

export type EmployeeWizardDetail = {
	employeeId: string;
	personal: EmployeePersonalPayload;
	positions: EmployeePositionPayload[];
	families: EmployeeFamilyPayload[];
	educations: EmployeeEducationPayload[];
	workHistories: EmployeeWorkHistoryPayload[];
	bankAccounts: EmployeeBankAccountPayload[];
	bpjs: EmployeeBpjsPayload;
	documents: EmployeeDocumentPayload[];
};

export type EmployeeWizardStepPayloadMap = {
	personal: EmployeePersonalPayload;
	position: EmployeePositionPayload[];
	family: EmployeeFamilyPayload[];
	education: EmployeeEducationPayload[];
	workHistory: EmployeeWorkHistoryPayload[];
	bankAccount: EmployeeBankAccountPayload[];
	bpjs: EmployeeBpjsPayload;
	document: EmployeeDocumentPayload[];
};

export type EmployeeWizardActionResult = {
	success: boolean;
	message: string;
	employeeId?: string;
	errors?: Record<string, string>;
};
