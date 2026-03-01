"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { LuChevronDown, LuFileText, LuHouse, LuLogOut, LuUsers, LuCircleDot } from "react-icons/lu";
import type { IconType } from "react-icons";
import Button from "../../ui/button";

type SidebarItem = {
	id: string;
	label: string;
	href?: string;
	icon?: IconType;
	children?: SidebarItem[];
};

const sidebarItems: SidebarItem[] = [
	{ id: "dashboard", label: "Dashboard", href: "/", icon: LuHouse },
	{
		id: "employees",
		label: "Employees",
		href: "/employees",
		icon: LuUsers,
		children: [
			{ id: "employee-list", label: "Employee List", href: "/employees", icon: LuFileText },
			{
				id: "attendance",
				label: "Attendance",
				icon: LuFileText,
				children: [
					{ id: "daily-attendance", label: "Daily", href: "/employees/attendance/daily", icon: LuFileText },
					{ id: "monthly-attendance", label: "Monthly", href: "/employees/attendance/monthly", icon: LuFileText },
				],
			},
			{
				id: "payroll",
				label: "Payroll",
				icon: LuFileText,
				children: [
					{ id: "salary-run", label: "Salary Run", href: "/employees/payroll/salary-run", icon: LuFileText },
					{
						id: "payslip",
						label: "Payslip",
						icon: LuFileText,
						children: [
							{ id: "download", label: "Download", href: "/employees/payroll/payslip/download", icon: LuFileText },
						],
					},
				],
			},
		],
	},
	{ id: "reports", label: "Reports", href: "/reports", icon: LuFileText },
];

const normalizePath = (path: string) => (path === "/" ? "/" : path.replace(/\/$/, ""));

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
};

function SidebarEntry({ item, depth, pathname, openItems, setOpenItems }: SidebarEntryProps) {
	const hasChildren = Boolean(item.children?.length);
	const active = isItemActive(item, pathname);
	const opened = openItems[item.id] ?? false;

	const paddingLeftClass = depth === 0 ? "pl-3" : depth === 1 ? "pl-9" : "pl-12";

	const baseClass = [
		"relative flex w-full items-center gap-2 rounded-xl py-2 transition-colors",
		paddingLeftClass,
		active
			? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-800"
			: "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-900/30",
	].join(" ");

	const lineClass = active ? "absolute -right-4 top-1/2 h-10 w-1 -translate-y-1/2 bg-orange-500 dark:bg-orange-400" : "hidden";
	const ItemIcon = item.icon ?? LuCircleDot;

	const content = (
		<>
			<span className={lineClass} />
			<span className={active ? "text-blue-700 dark:text-blue-100" : "text-slate-500 dark:text-slate-400"}>
				<ItemIcon className={depth === 0 ? "h-4 w-4" : "h-3.5 w-3.5"} />
			</span>
			<span className="flex-1 truncate text-left font-medium">{item.label}</span>
			{hasChildren && (
				<LuChevronDown
					className={`h-5 w-5 mr-1 transition-transform ${opened ? "rotate-180" : ""} ${active ? "text-white" : "text-slate-500 dark:text-slate-400"
						}`}
				/>
			)}
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
						<SidebarEntry
							key={child.id}
							item={child}
							depth={Math.min(depth + 1, 2)}
							pathname={pathname}
							openItems={openItems}
							setOpenItems={setOpenItems}
						/>
					))}
				</ul>
			)}
		</li>
	);
}

export default function Sidebar() {
	const pathname = usePathname();

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

		walk(sidebarItems);
		return open;
	}, [pathname]);

	const [openItems, setOpenItems] = useState<Record<string, boolean>>(defaultOpenState);

	useEffect(() => {
		setOpenItems(defaultOpenState);
	}, [defaultOpenState]);

	return (
		<aside className="flex h-screen w-72 flex-col border-r border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900">
			<div className="p-6">
				<h1 className="text-xl text-center font-bold tracking-tight text-slate-900 dark:text-slate-100">H R I S</h1>
			</div>

			<nav className="flex-1 overflow-y-auto px-4 py-4">
				<ul className="space-y-1">
					{sidebarItems.map((item) => (
						<SidebarEntry
							key={item.id}
							item={item}
							depth={0}
							pathname={pathname}
							openItems={openItems}
							setOpenItems={setOpenItems}
						/>
					))}
				</ul>
			</nav>

			<div className="border-t border-blue-100 px-4 py-4 dark:border-blue-900/60">
				<Button
					variant="danger"
					title="Logout"
					aria-label="Logout"
					rightIcon={<LuLogOut className="h-4 w-4" />}
					fullWidth
				>
					Logout
				
				</Button>
			</div>
		</aside>
	);
}
