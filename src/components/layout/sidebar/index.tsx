"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { LuChevronDown } from "react-icons/lu";
import type { UserRole } from "@/src/modules/users/types/user.type";
import Image from "next/image";
import { filterSectionsByRole, sidebarSections, type SidebarItem } from "./sections";

type SidebarCompany = {
	name: string;
	logo: string | null;
} | null;


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

	return (
		<aside className="relative z-20 flex h-full w-full shrink-0 flex-col border-r border-blue-100 bg-white dark:border-blue-900/60 dark:bg-slate-900">
			<div className={`flex items-center p-4 ${collapsed ? "justify-center" : "gap-2"}`}>
				{company?.logo ? (
					<Image src={company.logo} alt="Company Logo" width={32} height={32} className="h-12 w-12 rounded-2xl object-cover" />
				) : (
					<Image src="/logo.webp" alt="HRIS Logo" width={48} height={48} className="h-12 w-12 rounded-2xl object-cover" />
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
		</aside>
	);
}

