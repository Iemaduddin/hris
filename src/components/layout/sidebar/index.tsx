"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { LuBanknote, LuBadgeCheck, LuBriefcase, LuBuilding2, LuCalendarCheck, LuCalendarDays, LuCalendarPlus, LuCalendarRange, LuCalendarX, LuChevronDown, LuCircleDollarSign, LuFileSpreadsheet, LuFingerprint, LuHandCoins, LuHouse, LuLayers, LuList, LuListChecks, LuLogOut, LuMapPin, LuNetwork, LuPlane, LuReceipt, LuRepeat, LuSend, LuSettings, LuStamp, LuTimer, LuTreePalm, LuUser, LuUserRoundCog, LuUsers, LuWallet, LuChartColumn } from "react-icons/lu";
import type { IconType } from "react-icons";
import type { UserRole } from "@/src/modules/users/types/user.type";
import Button from "../../ui/button";
import Image from "next/image";
import { authClient } from "@/src/lib/auth-client";
import { toast } from "react-toastify";

type SidebarCompany = {
	name: string;
	logo: string | null;
} | null;

type SidebarItem = {
	id: string;
	label: string;
	href?: string;
	icon?: IconType;
	allowedRoles?: UserRole[];
	children?: SidebarItem[];
};

type SidebarSection = {
	id: string;
	label: string;
	allowedRoles?: UserRole[];
	items: SidebarItem[];
};

const HR_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR"];
const APPROVER_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR", "MANAJER"];
const FINANCE_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR", "FINANCE"];
const REPORT_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_HR", "MANAJER", "FINANCE"];

const sidebarSections: SidebarSection[] = [
	{
		id: "main",
		label: "Main",
		items: [{ id: "dashboard", label: "Dashboard", href: "/", icon: LuHouse }],
	},
	{
		id: "akun",
		label: "Akun",
		items: [
			{ id: "profil-saya", label: "Profil Saya", href: "/account/profile", icon: LuUser },
			{ id: "presensi-saya", label: "Presensi Saya", href: "/account/attendance", icon: LuCalendarCheck },
			{ id: "pengajuan-saya", label: "Pengajuan Saya", href: "/account/requests", icon: LuSend },
			{ id: "slip-saya", label: "Slip Gaji Saya", href: "/account/payslip", icon: LuWallet },
			{ id: "kasbon-saya", label: "Kasbon Saya", href: "/account/kasbon", icon: LuHandCoins },
			{ id: "onboarding-saya", label: "Onboarding Saya", href: "/account/onboarding", icon: LuListChecks },
			{ id: "resign-saya", label: "Pengajuan Resign", href: "/account/offboarding", icon: LuLogOut },
		],
	},
	{
		id: "master-data",
		label: "Master Data",
		allowedRoles: HR_ROLES,
		items: [
			{
				id: "users",
				label: "Users Management",
				href: "/users",
				icon: LuUserRoundCog,
				allowedRoles: HR_ROLES,
			},
			{
				id: "employees",
				label: "Employees",
				href: "/employees",
				icon: LuUsers,
				allowedRoles: [...HR_ROLES, "MANAJER"],
				children: [
					{ id: "employee-list", label: "Employee List", href: "/employees", icon: LuList, allowedRoles: HR_ROLES },
					{ id: "mutasi", label: "Mutasi / Promosi", href: "/employees/mutasi", icon: LuRepeat, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "onboarding", label: "Onboarding", href: "/employees/onboarding", icon: LuListChecks, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "probation", label: "Probation", href: "/employees/probation", icon: LuBadgeCheck, allowedRoles: [...HR_ROLES, "MANAJER"] },
					{ id: "offboarding", label: "Offboarding", href: "/employees/offboarding", icon: LuLogOut, allowedRoles: HR_ROLES },
				],
			},
		],
	},
	{
		id: "transactions",
		label: "Transactions",
		allowedRoles: HR_ROLES,
		items: [
			{
				id: "schedule",
				label: "Penugasan Jadwal",
				href: "/schedule",
				icon: LuCalendarPlus,
				allowedRoles: HR_ROLES,
			},
			{
				id: "roster",
				label: "Roster & Penugasan",
				href: "/roster",
				icon: LuCalendarRange,
				allowedRoles: HR_ROLES,
			},
			{
				id: "presensi",
				label: "Presensi Harian",
				href: "/attendance",
				icon: LuFingerprint,
				allowedRoles: HR_ROLES,
			},
			{
				id: "rekap",
				label: "Rekap Kehadiran",
				href: "/recap",
				icon: LuFileSpreadsheet,
				allowedRoles: HR_ROLES,
			},
			{
				id: "cuti",
				label: "Cuti & Izin",
				href: "/leave",
				icon: LuTreePalm,
				allowedRoles: HR_ROLES,
			},
			{
				id: "lembur",
				label: "Lembur",
				href: "/overtime",
				icon: LuTimer,
				allowedRoles: HR_ROLES,
			},
			{
				id: "dinas",
				label: "Dinas & WFH",
				href: "/duty",
				icon: LuPlane,
				allowedRoles: HR_ROLES,
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
					{ id: "kasbon", label: "Kasbon", href: "/payroll/kasbon", icon: LuHandCoins },
					{ id: "komponen", label: "Komponen Gaji", href: "/payroll/salary-components", icon: LuReceipt },
					{ id: "aturan", label: "Aturan Payroll", href: "/payroll/settings", icon: LuSettings },
				],
			},
		],
	},
	{
		id: "reports",
		label: "Reports",
		allowedRoles: REPORT_ROLES,
		items: [{ id: "laporan", label: "Laporan", href: "/reports", icon: LuChartColumn, allowedRoles: REPORT_ROLES }],
	},
	{
		id: "settings",
		label: "Settings",
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
				]
			 }
		],
	},
];

const normalizePath = (path: string) => (path === "/" ? "/" : path.replace(/\/$/, ""));

function isAllowed(allowedRoles: UserRole[] | undefined, userRole: UserRole): boolean {
	if (!allowedRoles || allowedRoles.length === 0) return true;
	return allowedRoles.includes(userRole);
}

function filterSectionsByRole(sections: SidebarSection[], userRole: UserRole): SidebarSection[] {
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

const isItemActive = (item: SidebarItem, pathname: string): boolean => {
	const currentPath = normalizePath(pathname);

	if (item.href && normalizePath(item.href) === currentPath) {
		return true;
	}

	return Boolean(item.children?.some((child) => isItemActive(child, currentPath)));
};

type SidebarEntryProps = {
	item: SidebarItem;
	depth: number;
	pathname: string;
	openItems: Record<string, boolean>;
	setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
	collapsed: boolean;
	openFlyoutId: string | null;
	setOpenFlyoutId: Dispatch<SetStateAction<string | null>>;
};

type FlyoutEntryProps = {
	item: SidebarItem;
	pathname: string;
	openItems: Record<string, boolean>;
	setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
	depth?: number;
};

function FlyoutEntry({ item, pathname, openItems, setOpenItems, depth = 0 }: FlyoutEntryProps) {
	const hasChildren = Boolean(item.children?.length);
	const opened = openItems[item.id] ?? false;
	const active = isItemActive(item, pathname);
	const ItemIcon = item.icon;

	const baseClass = [
		"flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors",
		depth === 0 ? "px-3" : "px-3 pl-8",
		active
			? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100"
			: "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-900/30",
	].join(" ");

	const content = (
		<>
			{ItemIcon && <ItemIcon className="h-4 w-4" />}
			<span className="flex-1 truncate text-sm font-medium">{item.label}</span>
			{hasChildren && <LuChevronDown className={`h-4 w-4 transition-transform ${opened ? "rotate-180" : ""}`} />}
		</>
	);

	return (
		<li>
			{hasChildren ? (
				<button
					type="button"
					onClick={() => setOpenItems((prev) => ({ ...prev, [item.id]: !opened }))}
					className={baseClass}
				>
					{content}
				</button>
			) : (
				<Link href={item.href ?? "#"} className={baseClass}>
					{content}
				</Link>
			)}

			{hasChildren && opened && (
				<ul className="mt-1 space-y-1">
					{item.children?.map((child) => (
						<FlyoutEntry
							key={child.id}
							item={child}
							pathname={pathname}
							openItems={openItems}
							setOpenItems={setOpenItems}
							depth={depth + 1}
						/>
					))}
				</ul>
			)}
		</li>
	);
}

function SidebarEntry({ item, depth, pathname, openItems, setOpenItems, collapsed, openFlyoutId, setOpenFlyoutId }: SidebarEntryProps) {
	const hasChildren = Boolean(item.children?.length);
	const active = isItemActive(item, pathname);
	const opened = openItems[item.id] ?? false;
	const isFlyoutOpen = openFlyoutId === item.id;

	const paddingLeftClass = collapsed ? "px-0 justify-center" : depth === 0 ? "pl-3" : depth === 1 ? "pl-9" : "pl-12";

	const baseClass = [
		"relative flex w-full items-center rounded-xl py-2 transition-colors",
		collapsed ? "gap-0" : "gap-2",
		paddingLeftClass,
		active
			? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-800"
			: "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-900/30",
	].join(" ");

	const lineClass = active
		? `absolute ${collapsed ? "-right-2 h-8" : "-right-4 h-10"} top-1/2  w-1 -translate-y-1/2 bg-orange-500 dark:bg-orange-400`
		: "hidden";
	const ItemIcon = item.icon;

	const content = (
		<>
			<span className={lineClass} />
			{ItemIcon && (
				<span className={active ? "text-blue-700 dark:text-blue-100" : "text-slate-500 dark:text-slate-400"}>
					<ItemIcon className={depth === 0 ? "h-5 w-5" : "h-4.5 w-4.5"} />
				</span>
			)}
			{!collapsed && <span className="flex-1 truncate text-left font-medium">{item.label}</span>}
			{hasChildren && (
				<LuChevronDown
					className={`${collapsed ? "absolute right-1 h-3.5 w-3.5" : "mr-1 h-5 w-5"} transition-transform ${collapsed ? (isFlyoutOpen ? "rotate-180" : "") : (opened ? "rotate-180" : "")}`}
				/>
			)}
		</>
	);

	return (
		<li className="relative">
			{hasChildren ? (
				<button
					type="button"
					onClick={() => {
						if (collapsed) {
							setOpenFlyoutId((prev) => (prev === item.id ? null : item.id));
							return;
						}
						setOpenItems((prev) => ({ ...prev, [item.id]: !opened }));
					}}
					className={baseClass}
					title={collapsed ? item.label : undefined}
				>
					{content}
				</button>
			) : (
				<Link href={item.href ?? "#"} className={baseClass} title={collapsed ? item.label : undefined}>
					{content}
				</Link>
			)}

			{hasChildren && !collapsed && opened && (
				<ul className="mt-1 space-y-1">
					{item.children?.map((child) => (
						<SidebarEntry
							key={child.id}
							item={child}
							depth={Math.min(depth + 1, 2)}
							pathname={pathname}
							openItems={openItems}
							setOpenItems={setOpenItems}
							collapsed={collapsed}
							openFlyoutId={openFlyoutId}
							setOpenFlyoutId={setOpenFlyoutId}
						/>
					))}
				</ul>
			)}

			{hasChildren && collapsed && isFlyoutOpen && (
				<div className="absolute left-full top-0 z-30 ml-2 w-64 rounded-xl border border-blue-100 bg-white p-2 shadow-lg dark:border-blue-900/60 dark:bg-slate-900">
					<p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</p>
					<ul className="space-y-1">
						{item.children?.map((child) => (
							<FlyoutEntry
								key={child.id}
								item={child}
								pathname={pathname}
								openItems={openItems}
								setOpenItems={setOpenItems}
							/>
						))}
					</ul>
				</div>
			)}
		</li>
	);
}

type SidebarProps = {
	company: SidebarCompany;
	collapsed?: boolean;
	userRole: UserRole;
};

export default function Sidebar({ company, collapsed = false, userRole }: SidebarProps) {
	const pathname = usePathname();
	const  router = useRouter();
	const visibleSections = useMemo(() => filterSectionsByRole(sidebarSections, userRole), [userRole]);
	const defaultOpenState = useMemo(() => {
		const open: Record<string, boolean> = {};

		const walk = (items: SidebarItem[]) => {
			for (const item of items) {
				if (item.children?.length) {
					open[item.id] = isItemActive(item, pathname);
					walk(item.children);
				}
			}
		};

		for (const section of visibleSections) {
			walk(section.items);
		}

		return open;
	}, [pathname, visibleSections]);

	const [openItems, setOpenItems] = useState<Record<string, boolean>>(defaultOpenState);
	const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);

	useEffect(() => {
		setOpenItems(defaultOpenState);
	}, [defaultOpenState]);

	useEffect(() => {
		setOpenFlyoutId(null);
	}, [pathname, collapsed]);

	  const handleSignOut = async () => {
		try {
		  await authClient.signOut();
		  router.push("/login");
		  router.refresh();
		}catch (error) {
		  console.error("Error during sign out:", error);
		  toast.error("Gagal melakukan logout. Silakan coba lagi.");
		}
	  }
	return (
		<aside className="relative z-20 flex h-full w-full shrink-0 flex-col border-r border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900">
			<div className={`flex items-center p-4 ${collapsed ? "justify-center" : "gap-2"}`}>
				{company?.logo ? (
					<Image src={company.logo} alt="Company Logo" width={32} height={32} className="h-12 w-12 rounded-2xl object-cover" />
				) : (
					<div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
						HR
					</div>
				)}
				{!collapsed && (
					<div className="flex flex-col">
						<h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">H R I S</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">{company?.name || "Nama Perusahaan"}</p>
					</div>
				)}
			</div>

			<nav className={`flex-1 py-4 ${collapsed ? "overflow-visible px-2" : "overflow-y-auto px-4"}`}>
				<div className="space-y-5">
					{visibleSections.map((section) => (
						<div key={section.id}>
							{!collapsed && (
								<p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
									{section.label}
								</p>
							)}
							<ul className="space-y-1">
								{section.items.map((item) => (
									<SidebarEntry
										key={item.id}
										item={item}
										depth={0}
										pathname={pathname}
										openItems={openItems}
										setOpenItems={setOpenItems}
										collapsed={collapsed}
										openFlyoutId={openFlyoutId}
										setOpenFlyoutId={setOpenFlyoutId}
									/>
								))}
							</ul>
						</div>
					))}
				</div>
			</nav>

			<div className={`py-4 ${collapsed ? "px-2" : "px-4"}`}>
				<Button
				onClick={handleSignOut}
					variant="danger"
					title="Logout"
					aria-label="Logout"
					rightIcon={<LuLogOut className="h-4 w-4" />}
					fullWidth={!collapsed}
				>
					{collapsed ? "" : "Logout"}
				</Button>
			</div>
		</aside>
	);
}

