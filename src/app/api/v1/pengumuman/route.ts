import { NextRequest } from "next/server";
import { fail, ok, requireApiSession } from "@/src/lib/api-v1";
import { getPengumumanSayaInti, getPeristiwaMingguIni } from "@/src/modules/employee/actions/pengumuman.actions";

/** GET: pengumuman tayang milik sendiri + peristiwa minggu ini (ultah/anniv). */
export async function GET(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);
	if (!ctx.karyawanId) return fail("Akun belum tertaut ke data karyawan.", 403);

	const [items, peristiwa] = await Promise.all([
		getPengumumanSayaInti(ctx.karyawanId),
		getPeristiwaMingguIni(),
	]);
	return ok({
		items: items.map((p) => ({
			id: p.id,
			judul: p.judul,
			isi: p.isi,
			unitNama: p.unitNama,
			tayangMulai: p.tayangMulai,
			tayangSelesai: p.tayangSelesai,
		})),
		peristiwa,
	});
}
