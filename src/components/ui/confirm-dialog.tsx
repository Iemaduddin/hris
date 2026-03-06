"use client";

import { LuTrash } from "react-icons/lu";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 md:p-7">
        <div className="mx-auto mb-5 flex w-fit items-center justify-center rounded-full bg-red-100 p-6 dark:bg-red-950/40">
            <LuTrash className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-center text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{description}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-blue-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
