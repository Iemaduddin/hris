# HRIS Web & API

Aplikasi web HRIS sekaligus backend API untuk mobile. Dibangun dengan Next.js App Router.

## Tech stack

- Next.js 16 + React 19 + Tailwind CSS 4
- Better-Auth (login email/password) + Prisma 7 + PostgreSQL
- Zod (validasi), react-toastify (notifikasi UI)

## Fitur

- **Organisasi**: data perusahaan, unit organisasi, jabatan, job grade, lokasi kerja (lat/long + radius)
- **Karyawan**: form wizard, pengingat kontrak, bagan organisasi
- **Pengguna**: manajemen user & role, halaman akun saya
- **Presensi**: absensi, roster, penugasan jadwal, shift, kalender kerja & libur, rekap
- **Pengajuan**: cuti (saldo), dinas, lembur — riwayat status + timeline
- **Persetujuan**: alur bertahap + notifikasi push ke HP saat disetujui/ditolak
- **Payroll & laporan**: komponen gaji, run penggajian, slip, laporan
- **REST API v1** (`/api/v1/*`) untuk aplikasi mobile + koleksi Postman (`mobile-api.postman_collection.json`)
- **Berkas**: storage lokal (`storage/`, jangan di-commit) via `/api/files`

## Prasyarat

- Node.js 22, PostgreSQL 15+
- Aplikasi mobile: lihat repo `mobile-hris`

## Konfigurasi (`.env`)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/hris?schema=public"
BETTER_AUTH_SECRET="isi-string-acak"
BETTER_AUTH_URL=http://localhost:3000   # samakan dengan port -- -p
```

> Ganti `BETTER_AUTH_URL` jika menjalankan di port lain.

## Cara menjalankan

```powershell
npm install
npx prisma migrate dev      # sekali saja / saat skema berubah
npm run dev -- -p 3000
```

Buka `http://localhost:3000`. Ganti port bila bentrok: `npm run dev -- -p 3001`
(dan sesuaikan `BETTER_AUTH_URL` + `EXPO_PUBLIC_API_URL` di mobile).

Akun demo dibuat via seed (`prisma/seed*.ts`): `employee@example.com` dan `admin@example.com`.

## Skrip

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | server dev (Turbopack) |
| `npm run build` / `npm start` | build & jalan produksi |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | typecheck |
| `npx tsx prisma/_check-m4.ts` | cek kesehatan milestone M4 |

## API v1 (ringkas)

`GET /api/v1/me`, `/leave`, `/duty`, `/overtime`, `/payslip`, `/schedule`,
`/attendance`, `/approval` · `POST /api/v1/auth/login`, `/leave`, `/approval`,
`/devices` (registrasi pushToken) — butuh header `Authorization: Bearer <token>`.
