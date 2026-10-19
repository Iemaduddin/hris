import { LuBanknote, LuBadgeCheck, LuBriefcase, LuBuilding2, LuCalendarCheck, LuCalendarDays, LuCalendarRange, LuCalendarX, LuCircleDollarSign, LuFileSpreadsheet, LuFingerprint, LuHandCoins, LuHouse, LuLayers, LuList, LuListChecks, LuLogOut, LuMapPin, LuNetwork, LuPlane, LuMail, LuPencilLine, LuReceipt, LuRepeat, LuSend, LuSettings, LuStamp, LuTimer, LuTreePalm, LuTriangleAlert, LuUser, LuUserRoundCog, LuUsers, LuWallet, LuChartColumn } from "react-icons/lu";
import type { IconType } from "react-icons";
import type { UserRole } from "@/src/modules/users/types/user.type";

export type SidebarItem = {
	id: string;
	label: string;
	href?: string;
	icon?: IconType;
	allowedRoles?: UserRole[];
	children?: SidebarItem[];
};

export type SidebarSection = {
	id: string;
	label: string;
	allowedRoles?: UserRole[];
	items: SidebarItem[];
};

const HR_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR"];
const APPROVER_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR", "MANAJER", "FINANCE"];
const FINANCE_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR", "FINANCE"];
const REPORT_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR", "MANAJER", "FINANCE"];

export const sidebarSections: SidebarSection[] = [
	{
		id: "main",
		label: "Utama",
		items: [{ id: "dashboard", label: "Dashboard", href: "/", icon: LuHouse }],
	},
	{
		id: "tim",
		label: "Tim",
		allowedRoles: [...HR_ROLES, "MANAJER"],
		items: [{ id: "tim-saya", label: "Tim", href: "/team", icon: LuUsers }],
	},
	{
		id: "akun",
		label: "Akun",
		items: [
			{
				id: "presensi-saya",
				label: "Presensi",
				icon: LuCalendarCheck,
				children: [
					{ id: "presensi-bulanan-saya", label: "Rekap Bulanan", href: "/account/attendance", icon: LuCalendarCheck },
					{ id: "koreksi-saya", label: "Koreksi Presensi", href: "/account/attendance-corrections", icon: LuPencilLine },
				],
			},
			{ id: "pengajuan-saya", label: "Pengajuan", href: "/account/requests", icon: LuSend },
			{ id: "pengumuman-saya", label: "Pengumuman", href: "/account/announcements", icon: LuMail },
			{
				id: "keuangan-saya",
				label: "Keuangan",
				icon: LuWallet,
				children: [
					{ id: "slip-saya", label: "Slip Gaji", href: "/account/payslips", icon: LuWallet },
					{ id: "kasbon-saya", label: "Kasbon", href: "/account/salary-advances", icon: LuHandCoins },
					{ id: "reimbursement-saya", label: "Reimbursement", href: "/account/reimbursements", icon: LuReceipt },
					{ id: "uangdinas-saya", label: "Uang Dinas", href: "/account/business-travel", icon: LuPlane },
				],
			},
			{
				id: "administrasi-saya",
				label: "Administrasi",
				icon: LuFileSpreadsheet,
				children: [
					{ id: "update-data-saya", label: "Update Data", href: "/account/data-updates", icon: LuUser },
					{ id: "tukar-saya", label: "Tukar Shift", href: "/account/shift-swaps", icon: LuRepeat },
					{ id: "onboarding-saya", label: "Onboarding", href: "/account/onboarding", icon: LuListChecks },
					{ id: "disiplin-saya", label: "SP", href: "/account/disciplinary-actions", icon: LuTriangleAlert },
					{ id: "resign-saya", label: "Pengajuan Resign", href: "/account/offboarding", icon: LuLogOut },
				],
			},
		],
	},
	{
		id: "master-data",
		label: "Data Induk",
		allowedRoles: [...HR_ROLES, "MANAJER"],
		items: [
			{
				id: "users",
				label: "Akun Pengguna",
				href: "/users",
				icon: LuUserRoundCog,
				allowedRoles: HR_ROLES,
			},
			{
				id: "employees",
				label: "Employee",
				icon: LuUsers,
				allowedRoles: [...HR_ROLES, "MANAJER"],
				children: [
					{ id: "employee-list", label: "Data Employee", href: "/employees", icon: LuList, allowedRoles: HR_ROLES },
					{ id: "kontrak", label: "Kontrak", href: "/employees/contracts", icon: LuFileSpreadsheet, allowedRoles: HR_ROLES },
					{ id: "mutasi", label: "Mutasi / Promosi", href: "/employees/transfers", icon: LuRepeat, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "surat", label: "Surat Keluar", href: "/employees/letters", icon: LuMail, allowedRoles: HR_ROLES },
					{ id: "disiplin", label: "Disiplin / SP", href: "/employees/disciplinary-actions", icon: LuTriangleAlert, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "onboarding", label: "Onboarding", href: "/employees/onboarding", icon: LuListChecks, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "probation", label: "Probation", href: "/employees/probation", icon: LuBadgeCheck, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "offboarding", label: "Offboarding", href: "/employees/offboarding", icon: LuLogOut, allowedRoles: HR_ROLES },
					{ id: "pengumuman", label: "Pengumuman", href: "/employees/announcements", icon: LuMail, allowedRoles: HR_ROLES },
					{ id: "update-data", label: "Update Data", href: "/employees/data-updates", icon: LuUser, allowedRoles: HR_ROLES },
					{ id: "import", label: "Impor & Kualitas", href: "/employees/import", icon: LuFileSpreadsheet, allowedRoles: HR_ROLES },
				],
			},
		],
	},
	{
		id: "transactions",
		label: "Transaksi",
		allowedRoles: [...HR_ROLES, "MANAJER", "FINANCE"],
		items: [
			{
				id: "kehadiran",
				label: "Kehadiran",
				icon: LuFingerprint,
				allowedRoles: HR_ROLES,
				children: [
					{ id: "presensi", label: "Presensi Harian", href: "/attendance", icon: LuFingerprint, allowedRoles: HR_ROLES },
					{ id: "rekap", label: "Rekap Kehadiran", href: "/recap", icon: LuFileSpreadsheet, allowedRoles: HR_ROLES },
					{ id: "roster", label: "Roster & Penugasan", href: "/roster", icon: LuCalendarRange, allowedRoles: HR_ROLES },
				],
			},
			{
				id: "cuti-lembur-dinas",
				label: "Cuti, Lembur & Dinas",
				icon: LuTreePalm,
				allowedRoles: HR_ROLES,
				children: [
					{ id: "cuti", label: "Cuti & Izin", href: "/leave", icon: LuTreePalm, allowedRoles: HR_ROLES },
					{ id: "lembur", label: "Lembur", href: "/overtime", icon: LuTimer, allowedRoles: HR_ROLES },
					{ id: "dinas", label: "Dinas Luar & WFH", href: "/duty", icon: LuPlane, allowedRoles: HR_ROLES },
				],
			},
			{
				id: "approval",
				label: "Approval Center",
				href: "/approval",
				icon: LuStamp,
				allowedRoles: APPROVER_ROLES,
			},
			{
				id: "payroll",
				label: "Payroll",
				icon: LuBanknote,
				allowedRoles: FINANCE_ROLES,
				children: [
					{ id: "salary-run", label: "Salary Run", href: "/payroll", icon: LuCircleDollarSign },
					{ id: "thr", label: "THR Keagamaan", href: "/payroll/thr", icon: LuWallet },
					{ id: "kasbon", label: "Kasbon", href: "/payroll/salary-advances", icon: LuHandCoins },
					{ id: "reimbursement", label: "Reimbursement", href: "/payroll/reimbursements", icon: LuReceipt },
					{ id: "uang-dinas", label: "Uang Dinas", href: "/payroll/business-travel", icon: LuPlane },
					{
						id: "konfigurasi-payroll",
						label: "Konfigurasi Payroll",
						icon: LuSettings,
						children: [
							{ id: "komponen", label: "Komponen Gaji", href: "/payroll/salary-components", icon: LuReceipt },
							{ id: "aturan", label: "Aturan Payroll", href: "/payroll/settings", icon: LuSettings },
						],
					},
				],
			},
		],
	},
	{
		id: "reports",
		label: "Laporan & Audit",
		allowedRoles: REPORT_ROLES,
		items: [
			{ id: "laporan", label: "Laporan", href: "/reports", icon: LuChartColumn, allowedRoles: REPORT_ROLES },
			{ id: "audit", label: "Audit Log", href: "/audit", icon: LuList, allowedRoles: FINANCE_ROLES },
		],
	},
	{
		id: "settings",
		label: "Pengaturan",
		allowedRoles: HR_ROLES,
		items: [
			{ 
				id: "company-data", 
				label: "Data Perusahaan",
				icon: LuSettings,
				allowedRoles: HR_ROLES,
				children:[
					{ id: "company-data-item", label: "Profil", href: "/settings/company-data", icon: LuBuilding2 },
					{ id: "organizational-unit-item", label: "Struktur Organisasi", href: "/settings/organizational-unit", icon: LuNetwork },
					{ id: "job-grade-item", label: "Golongan Posisi", href: "/settings/job-grade", icon: LuLayers },
					{ id: "position-item", label: "Posisi", href: "/settings/position", icon: LuBriefcase },
					{ id: "work-location-item", label: "Lokasi Kerja", href: "/settings/work-location", icon: LuMapPin },
					{ id: "work-schedule-item", label: "Jadwal Kerja", href: "/settings/work-schedule", icon: LuCalendarDays },
					{ id: "shift-item", label: "Shift Kerja", href: "/settings/shift", icon: LuRepeat },
					{ id: "jenis-item", label: "Jenis Ketidakhadiran", href: "/settings/leave-types", icon: LuCalendarX },
					{ id: "surat-item", label: "Template Surat", href: "/settings/letter-templates", icon: LuMail },
				]
			 }
		],
	},
];

function isAllowed(allowedRoles: UserRole[] | undefined, userRole: UserRole): boolean {
	if (!allowedRoles || allowedRoles.length === 0) return true;
	return allowedRoles.includes(userRole);
}

export function filterSectionsByRole(sections: SidebarSection[], userRole: UserRole): SidebarSection[] {
	return sections
		.filter((section) => isAllowed(section.allowedRoles, userRole))
		.map((section) => ({
			...section,
			items: section.items
				.filter((item) => isAllowed(item.allowedRoles, userRole))
				.map((item) => ({
					...item,
					children: item.children?.filter((child) => isAllowed(child.allowedRoles, userRole)),
				})),
		}))
		.filter((section) => section.items.length > 0);
}
