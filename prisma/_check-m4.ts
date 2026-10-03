import "dotenv/config";
import prisma from "../src/lib/prisma";
import { notifikasiKeputusanPengajuan } from "../src/modules/approval/lib/approval-notify";

/**
 * UAT backend M4 (PRD mobile Bag. 5.8 / B8):
 * 1. POST /devices menyimpan pushToken.
 * 2. POST /devices tanpa pushToken TIDAK menghapus token lama.
 * 3. DELETE /devices mencabut token + menonaktifkan device.
 * 4. notifikasiKeputusanPengajuan() sukses memanggil Expo Push Service
 *    (token palsu → DeviceNotRegistered → otomatis dibersihkan).
 * Rerunnable; baris synthetic dihapus di akhir.
 */

const BASE = process.env.CHECK_API_URL ?? "http://127.0.0.1:3000/api/v1";
const EMAIL = "employee@example.com";
const PASSWORD = "Employee123!";
const DEVICE_ID = "uat-m4-device";
const TOKEN_PALSU = "ExponentPushToken[uat-fake-token]";

let gagal = 0;
function cek(nama: string, kondisi: boolean, detail?: unknown): void {
	console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
	if (!kondisi) gagal++;
}

async function api<T>(
	method: string,
	path: string,
	body?: unknown,
	token?: string,
): Promise<T> {
	const response = await fetch(`${BASE}${path}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return (await response.json()) as T;
}

async function main() {
	const user = await prisma.user.findUnique({ where: { email: EMAIL } });
	if (!user) throw new Error(`User ${EMAIL} tidak ditemukan.`);
	const karyawan = await prisma.karyawan.findFirst({ where: { userId: user.id } });
	if (!karyawan) throw new Error("Karyawan tidak tertaut ke user.");

	const login = await api<{ success: boolean; data: { token: string } }>(
		"POST",
		"/auth/login",
		{ email: EMAIL, password: PASSWORD },
	);
	const token = login.data?.token;
	if (!token) throw new Error("Login gagal.");

	const baca = () =>
		prisma.perangkatKaryawan.findUnique({
			where: { karyawanId_deviceId: { karyawanId: karyawan.id, deviceId: DEVICE_ID } },
		});

	// 1. Registrasi dengan pushToken
	await api("POST", "/devices", {
		deviceId: DEVICE_ID,
		deviceName: "UAT M4",
		platform: "ANDROID",
		pushToken: TOKEN_PALSU,
	}, token);
	let row = await baca();
	cek("POST /devices menyimpan pushToken", row?.pushToken === TOKEN_PALSU && row.isActive === true, {
		pushToken: row?.pushToken,
		isActive: row?.isActive,
	});

	// 2. Registrasi ulang tanpa pushToken → token lama bertahan
	await api("POST", "/devices", { deviceId: DEVICE_ID, deviceName: "UAT M4 v2" }, token);
	row = await baca();
	cek("POST tanpa pushToken tidak menghapus token lama", row?.pushToken === TOKEN_PALSU, {
		pushToken: row?.pushToken,
	});

	// 3. Unregister
	await api("DELETE", `/devices?deviceId=${encodeURIComponent(DEVICE_ID)}`, undefined, token);
	row = await baca();
	cek("DELETE /devices menonaktifkan + mencabut token", row?.isActive === false && row?.pushToken === null, {
		isActive: row?.isActive,
		pushToken: row?.pushToken,
	});

	// 4. Kirim notifikasi (token palsu → Expo balas DeviceNotRegistered → dibersihkan)
	const cuti = await prisma.pengajuanKetidakhadiran.findFirst({ select: { id: true } });
	const lembur = cuti ? null : await prisma.lembur.findFirst({ select: { id: true } });
	const dinas = cuti || lembur ? null : await prisma.dinasWFH.findFirst({ select: { id: true } });
	const target = cuti ? { type: "CUTI" as const, id: cuti.id } : lembur ? { type: "LEMBUR" as const, id: lembur.id } : dinas ? { type: "DINAS" as const, id: dinas.id } : null;

	if (!target) {
		console.log("SKIP — tidak ada data pengajuan untuk uji notifikasi.");
	} else {
		// Device synthetic untuk karyawan pemohon pengajuan tsb.
		const pemohon = cuti
			? (await prisma.pengajuanKetidakhadiran.findUnique({ where: { id: cuti.id }, select: { karyawanId: true } }))!.karyawanId
			: lembur
				? (await prisma.lembur.findUnique({ where: { id: lembur.id }, select: { karyawanId: true } }))!.karyawanId
				: (await prisma.dinasWFH.findUnique({ where: { id: dinas!.id }, select: { karyawanId: true } }))!.karyawanId;
		const deviceIdNotif = `${DEVICE_ID}-notify`;
		await prisma.perangkatKaryawan.upsert({
			where: { karyawanId_deviceId: { karyawanId: pemohon, deviceId: deviceIdNotif } },
			create: { karyawanId: pemohon, deviceId: deviceIdNotif, namaPerangkat: "UAT notify", platform: "ANDROID", pushToken: TOKEN_PALSU },
			update: { pushToken: TOKEN_PALSU, isActive: true },
		});

		let lempar: unknown = null;
		try {
			await notifikasiKeputusanPengajuan(target.type, target.id, "DISETUJUI");
		} catch (error) {
			lempar = error;
		}
		cek("notifikasiKeputusanPengajuan tidak melempar galat", lempar === null, lempar instanceof Error ? lempar.message : lempar);

		const barisNotif = await prisma.perangkatKaryawan.findUnique({
			where: { karyawanId_deviceId: { karyawanId: pemohon, deviceId: deviceIdNotif } },
		});
		const dibersihkan = barisNotif?.pushToken === null;
		console.log(
			`${dibersihkan ? "PASS" : "INFO"} — hasil Expo Push Service: ${dibersihkan ? "DeviceNotRegistered → token otomatis dibersihkan" : `token masih ada (${barisNotif?.pushToken}) — cek koneksi jaringan ke exp.host`}`,
		);

		await prisma.perangkatKaryawan.deleteMany({ where: { deviceId: deviceIdNotif } });
	}

	await prisma.perangkatKaryawan.deleteMany({ where: { deviceId: DEVICE_ID } });
	console.log(gagal === 0 ? "M4 CHECK: SEMUA LULUS" : `M4 CHECK: ${gagal} GAGAL`);
	if (gagal > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
