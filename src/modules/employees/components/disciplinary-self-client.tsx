"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { acknowledgeDisiplin } from "@/src/modules/employees/actions/disciplinary.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type MyDisciplinaryActionRow = {
  id: string;
  number: string;
  levelLabel: string;
  title: string;
  publishedAt: string;
  active: boolean;
  status: string;
};

export default function MyDisciplinaryActionsClient({
  userId,
  items,
}: {
  userId: string;
  items: MyDisciplinaryActionRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAck(id: string) {
    if (!confirm("Tandai sudah dibaca dan dipahami?")) return;
    startTransition(async () => {
      const r = await acknowledgeDisiplin(id, userId);
      if (!r.success) toast.error(r.message);
      else toast.success(r.message);
      router.refresh();
    });
  }

  const letterColumns: DataTableColumn<MyDisciplinaryActionRow>[] = [
    {
      id: "surat",
      header: "Surat",
      render: (d) => <span className="font-medium">{d.levelLabel} • {d.number}</span>,
      sortValue: (d) => `${d.levelLabel} ${d.number}`,
      searchValue: (d) => `${d.levelLabel} ${d.number} ${d.title}`,
    },
    { id: "title", header: "Judul", accessor: "title" },
    {
      id: "status",
      header: "Status",
      render: (d) => <span>{d.status.replaceAll("_", " ")}</span>,
      sortValue: (d) => d.status,
      searchValue: (d) => d.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (d) => (
        <div className="inline-flex gap-2">
          <Link href={`/account/disciplinary-actions/${d.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Baca
          </Link>
          {d.status === "DITERBITKAN" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAck(d.id)}
              className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              Tanda Tangani
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
      <div className="mt-2">
        <DataTable
          data={items}
          columns={letterColumns}
          getRowId={(d) => d.id}
          emptyMessage="Tidak ada surat peringatan."
        />
      </div>
    </div>
  );
}
