"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  deleteUserAction,
} from "../actions/user.actions";
import type { UserSummary } from "../types/user.type";

type UserActionsCellProps = {
  user: UserSummary;
};

export default function UserActionsCell({ user }: UserActionsCellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleEditUser = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editUserId", user.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDeleteUser = () => {
    if (user.role === "SUPER_ADMIN") {
      toast.error("User dengan role Super Admin tidak boleh dihapus.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);

      const result = await deleteUserAction(formData);
      if (!result.success) {
        toast.error(result.message || "Gagal menghapus user.");
        return;
      }

      toast.success(result.message || "User berhasil dihapus.");
      router.refresh();
    });
  };

  return (
    <div className="flex min-w-40 items-center gap-2">

      <button
        type="button"
        onClick={handleEditUser}
        disabled={isPending}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-500 px-3 text-xs font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Edit
      </button>

      <button
        type="button"
        onClick={handleDeleteUser}
        disabled={isPending || user.role === "SUPER_ADMIN"}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Hapus
      </button>
    </div>
  );
}
