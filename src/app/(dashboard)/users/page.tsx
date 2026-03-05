import { requireUserRole } from "@/src/lib/auth-guard";
import UserDataForm from "@/src/modules/users/components/user-data-form";
import UsersTable from "@/src/modules/users/components/users-table";
import { getUserRoleOptions, getUserSummaries } from "@/src/modules/users/actions/user.actions";

export default async function UsersPage() {
	await requireUserRole(["SUPER_ADMIN", "ADMIN"]);
	const [users, roles] = await Promise.all([getUserSummaries(), getUserRoleOptions()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kelola Akun Pengguna</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Buat user baru dan atur role sesuai kebutuhan akses.</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tambah User</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Isi data user baru lalu simpan.</p>

				<UserDataForm roles={roles} users={users} />
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daftar User</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lakukan aksi single per user atau bulk action untuk beberapa user sekaligus.</p>

				<div className="mt-4">
					<UsersTable users={users} roles={roles} />
				</div>
			</div>
		</>
	);
}
