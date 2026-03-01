"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LuArrowDown, LuArrowUp, LuChevronDown, LuChevronUp } from "react-icons/lu";
import Button from "./button";

type SortDirection = "asc" | "desc";

type Primitive = string | number | boolean | Date | null | undefined;

export type DataTableColumn<TData> = {
	id: string;
	header: string;
	accessor?: keyof TData;
	render?: (row: TData) => ReactNode;
	sortable?: boolean;
	searchable?: boolean;
	responsiveHidden?: boolean;
	mobileLabel?: string;
	headerClassName?: string;
	cellClassName?: string;
	sortValue?: (row: TData) => Primitive;
	searchValue?: (row: TData) => string;
};

export type DataTableProps<TData> = {
	data: TData[];
	columns: DataTableColumn<TData>[];
	getRowId: (row: TData) => string;
	emptyMessage?: string;
	searchPlaceholder?: string;
	pageSizeOptions?: number[];
	initialPageSize?: number;
	onSelectionChange?: (selectedIds: string[]) => void;
};

function toSearchText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (value instanceof Date) return value.toISOString();
	return "";
}

function toSortValue(value: Primitive): string | number {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value.toLowerCase();
	if (typeof value === "boolean") return value ? 1 : 0;
	if (value instanceof Date) return value.getTime();
	return value;
}

function sortRows<TData>(rows: TData[], column: DataTableColumn<TData>, direction: SortDirection): TData[] {
	return [...rows].sort((a, b) => {
		const aRaw = column.sortValue?.(a) ?? (column.accessor ? (a[column.accessor] as Primitive) : undefined);
		const bRaw = column.sortValue?.(b) ?? (column.accessor ? (b[column.accessor] as Primitive) : undefined);

		const aValue = toSortValue(aRaw);
		const bValue = toSortValue(bRaw);

		if (aValue < bValue) return direction === "asc" ? -1 : 1;
		if (aValue > bValue) return direction === "asc" ? 1 : -1;
		return 0;
	});
}

export default function DataTable<TData>({
	data,
	columns,
	getRowId,
	emptyMessage = "No data found.",
	searchPlaceholder = "Search...",
	pageSizeOptions = [10, 20, 50],
	initialPageSize = 10,
	onSelectionChange,
}: DataTableProps<TData>) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [sortState, setSortState] = useState<{ columnId: string; direction: SortDirection } | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const searchableColumns = useMemo(
		() => columns.filter((column) => column.searchable || (!column.render && column.accessor)),
		[columns],
	);

	const filteredRows = useMemo(() => {
		if (!query.trim()) return data;
		const q = query.trim().toLowerCase();

		return data.filter((row) =>
			searchableColumns.some((column) => {
				const value =
					column.searchValue?.(row) ??
					(column.accessor ? toSearchText(row[column.accessor]) : column.render ? "" : "");
				return value.toLowerCase().includes(q);
			}),
		);
	}, [data, query, searchableColumns]);

	const sortedRows = useMemo(() => {
		if (!sortState) return filteredRows;
		const column = columns.find((item) => item.id === sortState.columnId);
		if (!column) return filteredRows;
		return sortRows(filteredRows, column, sortState.direction);
	}, [columns, filteredRows, sortState]);

	const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

	const paginatedRows = useMemo(() => {
		const start = (page - 1) * pageSize;
		return sortedRows.slice(start, start + pageSize);
	}, [page, pageSize, sortedRows]);

	const hiddenColumns = useMemo(() => columns.filter((column) => column.responsiveHidden), [columns]);

	useEffect(() => {
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [page, totalPages]);

	useEffect(() => {
		onSelectionChange?.(Array.from(selectedIds));
	}, [onSelectionChange, selectedIds]);

	useEffect(() => {
		setExpandedRows((prev) => {
			const next = new Set<string>();
			for (const id of prev) {
				if (paginatedRows.some((row) => getRowId(row) === id)) {
					next.add(id);
				}
			}
			return next;
		});
	}, [getRowId, paginatedRows]);

	const pageRowIds = paginatedRows.map((row) => getRowId(row));
	const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.has(id));
	const somePageSelected = pageRowIds.some((id) => selectedIds.has(id));

	const toggleSort = (columnId: string) => {
		setSortState((prev) => {
			if (!prev || prev.columnId !== columnId) {
				return { columnId, direction: "asc" };
			}
			if (prev.direction === "asc") {
				return { columnId, direction: "desc" };
			}
			return null;
		});
	};

	const toggleSelectAllPage = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allPageSelected) {
				for (const id of pageRowIds) next.delete(id);
			} else {
				for (const id of pageRowIds) next.add(id);
			}
			return next;
		});
	};

	const toggleSelectRow = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleExpandRow = (id: string) => {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-blue-900/60 dark:bg-slate-900">
			<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-1 items-center gap-2">
					<input
						type="text"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setPage(1);
						}}
						placeholder={searchPlaceholder}
						className="h-10 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 dark:border-blue-800 dark:bg-blue-900/30 dark:text-slate-100 dark:placeholder:text-slate-500"
					/>
				</div>

				<div className="flex items-center gap-2">
					{selectedIds.size > 0 && (
						<Button variant="soft" size="sm" onClick={() => setSelectedIds(new Set())}>
							Clear Selected ({selectedIds.size})
						</Button>
					)}
					<select
						value={pageSize}
						onChange={(event) => {
							setPageSize(Number(event.target.value));
							setPage(1);
						}}
						className="h-9 rounded-lg border border-blue-200 bg-blue-50 px-2 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-blue-800 dark:bg-blue-900/30 dark:text-slate-100"
					>
						{pageSizeOptions.map((size) => (
							<option key={size} value={size}>
								{size}/page
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full border-separate border-spacing-0 text-sm">
					<thead>
						<tr>
							<th className="w-10 border-b border-blue-100 px-2 py-3 text-left dark:border-blue-900/60">
								<input
									type="checkbox"
									checked={allPageSelected}
									ref={(input) => {
										if (input) input.indeterminate = !allPageSelected && somePageSelected;
									}}
									onChange={toggleSelectAllPage}
									className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
								/>
							</th>
							{columns.map((column) => {
								const isSorted = sortState?.columnId === column.id;
								const isHiddenMobile = column.responsiveHidden;
								return (
									<th
										key={column.id}
										className={`border-b border-blue-100 px-3 py-3 text-left font-semibold text-slate-700 dark:border-blue-900/60 dark:text-slate-100 ${
											isHiddenMobile ? "hidden md:table-cell" : ""
										} ${column.headerClassName ?? ""}`}
									>
										{column.sortable ? (
											<button
												type="button"
												onClick={() => toggleSort(column.id)}
												className="inline-flex items-center gap-1 text-left"
											>
												{column.header}
												{isSorted ? (
													sortState.direction === "asc" ? (
														<LuArrowUp className="h-4 w-4" />
													) : (
														<LuArrowDown className="h-4 w-4" />
													)
												) : null}
											</button>
										) : (
											column.header
										)}
									</th>
								);
							})}
							{hiddenColumns.length > 0 && <th className="w-10 border-b border-blue-100 py-3 dark:border-blue-900/60 md:hidden" />}
						</tr>
					</thead>
					<tbody>
						{paginatedRows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length + 2}
									className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
								>
									{emptyMessage}
								</td>
							</tr>
						) : (
							paginatedRows.map((row) => {
								const rowId = getRowId(row);
								const isSelected = selectedIds.has(rowId);
								const isExpanded = expandedRows.has(rowId);

								return (
									<>
										<tr key={rowId} className="hover:bg-blue-50/60 dark:hover:bg-blue-900/20">
											<td className="border-b border-blue-100 px-2 py-3 align-top dark:border-blue-900/60">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleSelectRow(rowId)}
													className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
												/>
											</td>

											{columns.map((column) => {
												const cell = column.render
													? column.render(row)
													: column.accessor
														? (row[column.accessor] as ReactNode)
														: null;

												return (
													<td
														key={`${rowId}-${column.id}`}
														className={`border-b border-blue-100 px-3 py-3 align-top text-slate-700 dark:border-blue-900/60 dark:text-slate-200 ${
															column.responsiveHidden ? "hidden md:table-cell" : ""
														} ${column.cellClassName ?? ""}`}
													>
														{cell}
													</td>
												);
											})}

											{hiddenColumns.length > 0 && (
												<td className="border-b border-blue-100 py-3 pr-2 text-right dark:border-blue-900/60 md:hidden">
													<button
														type="button"
														onClick={() => toggleExpandRow(rowId)}
														className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100"
														aria-label="Toggle row details"
													>
														{isExpanded ? <LuChevronUp className="h-4 w-4" /> : <LuChevronDown className="h-4 w-4" />}
													</button>
												</td>
											)}
										</tr>

										{hiddenColumns.length > 0 && isExpanded && (
											<tr key={`${rowId}-expanded`} className="md:hidden">
												<td colSpan={columns.length + 2} className="border-b border-blue-100 px-3 py-3 dark:border-blue-900/60">
													<div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/60 dark:bg-blue-900/20">
														<div className="space-y-2">
															{hiddenColumns.map((column) => {
																const cell = column.render
																	? column.render(row)
																	: column.accessor
																		? (row[column.accessor] as ReactNode)
																		: null;
																return (
																	<div key={`${rowId}-mobile-${column.id}`} className="grid grid-cols-3 gap-2 text-sm">
																		<span className="col-span-1 font-medium text-slate-500 dark:text-slate-400">
																			{column.mobileLabel ?? column.header}
																		</span>
																		<span className="col-span-2 text-slate-700 dark:text-slate-200">{cell}</span>
																	</div>
																);
															})}
														</div>
													</div>
												</td>
											</tr>
										)}
									</>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div className="mt-4 flex flex-col gap-3 border-t border-blue-100 pt-3 dark:border-blue-900/60 md:flex-row md:items-center md:justify-between">
				<p className="text-sm text-slate-600 dark:text-slate-300">
					Showing {(page - 1) * pageSize + (paginatedRows.length > 0 ? 1 : 0)}-
					{(page - 1) * pageSize + paginatedRows.length} of {sortedRows.length}
				</p>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
						Prev
					</Button>
					<span className="text-sm text-slate-600 dark:text-slate-300">
						Page {page} / {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
						disabled={page === totalPages}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
