import "dotenv/config";
import { hapusFile } from "../src/lib/storage-local";

/**
 * UAT backend P0-8 (hutang mobile):
 * 1. GET /api/v1/home mengembalikan agregat beranda.
 * 2. GET /api/v1/me/profile lengkap + NIK/NPWP ter-mask.
 * 3. POST /api/files menerima Bearer (B9) — respons {success:true,...path}.
 * Rerunnable; file uji dihapus di akhir.
 */

const BASE = process.env.CHECK_API_URL ?? "http://127.0.0.1:3000";
const EMAIL = "employee@example.com";
const PASSWORD = "Employee123!";

let gagal = 0;
function cek(nama: string, kondisi: boolean, detail?: unknown): void {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ""}`);
  if (!kondisi) gagal++;
}

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${BASE}${path}`, init);
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

async function main() {
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = (login.body as { success?: boolean; data?: { token?: string } })?.data?.token;
  cek("login mengembalikan Bearer token", typeof token === "string" && token.length > 0);
  if (!token) throw new Error("Login gagal.");
  const auth = { Authorization: `Bearer ${token}` };

  const home = await api("/api/v1/home", { headers: auth });
  const dh = (home.body as { success?: boolean; data?: Record<string, unknown> })?.data;
  cek("GET /home 200 + success", home.status === 200 && !!dh, home.status);
  cek(
    "GET /home berisi 5 kunci agregat",
    !!dh && ["presensi", "saldoCuti", "pengajuanBerjalan", "slipTerakhir", "shiftHariIni"].every((k) => k in dh),
    dh ? Object.keys(dh) : null,
  );

  const profil = await api("/api/v1/me/profile", { headers: auth });
  const dp = (profil.body as { success?: boolean; data?: { profil?: Record<string, unknown> } })?.data?.profil;
  cek("GET /me/profile 200 + nomorKaryawan", profil.status === 200 && typeof dp?.nomorKaryawan === "string", profil.status);
  const nik = dp?.nik as string | null;
  cek("NIK ter-mask atau null", nik === null || (typeof nik === "string" && nik.includes("•")), nik);

  const form = new FormData();
  form.set("ownerType", "pengajuan");
  form.set("ownerId", "uji-p08");
  form.set("file", new Blob(["%PDF-1.4 uji-p08"], { type: "application/pdf" }), "uji.pdf");
  const up = await api("/api/files", { method: "POST", headers: auth, body: form });
  const dup = up.body as { success?: boolean; path?: string; error?: string };
  cek("POST /files Bearer sukses", up.status === 200 && dup?.success === true && typeof dup?.path === "string", {
    status: up.status,
    body: up.body,
  });
  if (dup?.path) {
    await hapusFile(dup.path);
    console.log("INFO — file uji dihapus:", dup.path);
  }

  const tanpaAuth = await api("/api/v1/home");
  cek("GET /home tanpa token → 401", tanpaAuth.status === 401, tanpaAuth.status);

  console.log(gagal === 0 ? "P08 CHECK: SEMUA LULUS" : `P08 CHECK: ${gagal} GAGAL`);
  if (gagal > 0) process.exitCode = 1;
}

main();
