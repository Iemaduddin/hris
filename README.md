# HRIS Web & API

Aplikasi web HRIS sekaligus backend REST API untuk <a href="https://github.com/Iemaduddin/hris">Mobile Apps HRIS</a>. Dibangun
dengan Next.js App Router dan digunakan untuk mengelola data karyawan,
presensi, pengajuan, persetujuan, payroll, serta administrasi HR.

## Tech stack

- Next.js 16 + React 19 + Tailwind CSS 4
- Better-Auth (login email/password)
- Prisma 7 + PostgreSQL
- Zod untuk validasi
- React Toastify untuk notifikasi UI
- Local file storage untuk lampiran dan dokumen

## Fitur

- **Organisasi**: data perusahaan, unit organisasi, jabatan, job grade, lokasi
  kerja, dan bagan organisasi
- **Karyawan**: wizard data karyawan, keluarga, pendidikan, riwayat kerja,
  onboarding, kontrak, probation, transfer, disiplin, dan offboarding
- **Pengguna**: manajemen user, role, akun pribadi, dan pengaturan
- **Presensi**: absensi, koreksi presensi, roster, shift swap, penugasan
  jadwal, kalender kerja, hari libur, dan rekap
- **Pengajuan**: cuti dan saldo cuti, dinas, lembur, reimbursement, salary
  advance, business travel, update data, dan surat
- **Persetujuan**: alur bertahap dengan notifikasi in-app, push, dan email
- **Payroll**: komponen gaji, salary run, slip gaji, THR, verifikasi, dan
  laporan
- **Notifikasi**: inbox notifikasi, preferensi, dan pengingat harian
- **REST API v1** (`/api/v1/*`) untuk aplikasi mobile
- **Koleksi API**: `mobile-api.postman_collection.json`


## Preview

### Dashboard


![Dashboard Admin/HR](docs/preview/web-dashboard.png)


### Presensi dan koreksi presensi
![Presensi](docs/preview/web-koreksi-presensi.png)
![Dashboard Admin/HR](docs/preview/web-koreksi-presensi.png)


### Pengajuan dan persetujuan
![Pengajuan Cuti/Lembur/Dinas/WFH](docs/preview/web-pengajuan.png)
![Persetujuan](docs/preview/web-approval.png)

### Karyawan dan organisasi

![Manage Data Karyawan](docs/preview/web-data-karyawan.png)
![Data Organisasi](docs/preview/web-struktur-organisasi.png)

### Payroll dan slip gaji
![Payroll](docs/preview/web-payrol.png)
![Slip Gaji](docs/preview/web-slip-gaji.png)

### Rekap Kehadiran

![Presensi](docs/preview/web-rekapan-presensi.png)

### Administrasi

![Presensi](docs/preview/web-update-data.png)



## Prasyarat

- Node.js 22
- PostgreSQL 15+
- Aplikasi mobile: lihat repository `mobile-hris`

## Konfigurasi (`.env`)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hris?schema=public"
BETTER_AUTH_SECRET="isi-string-acak"
BETTER_AUTH_URL=http://localhost:3000

# Opsional: dipakai untuk link absolut slip dan surat.
# Jika kosong, aplikasi memakai BETTER_AUTH_URL.
APP_URL=http://localhost:3000
```

> Ganti `BETTER_AUTH_URL` (dan `APP_URL`) jika menjalankan aplikasi pada port
> atau domain lain. Variabel `GOOGLE_OAUTH_*` dan `GOOGLE_DRIVE_FOLDER_ID`
> tidak dipakai lagi dan aman dihapus dari `.env` lokal.

## Cara menjalankan

```powershell
npm install
npx prisma migrate dev
npm run dev -- -p 3000
```

Buka `http://localhost:3000`. Jika port bentrok, gunakan port lain dan
sesuaikan `BETTER_AUTH_URL` serta `EXPO_PUBLIC_API_URL` di mobile.

Akun demo dibuat melalui seed:

| Email | Password | Role |
|---|---|---|
| `employee@example.com` | `Employee123!` | Employee |
| `manager@example.com` | `Manager123!` | Manager |
| `admin@example.com` | `Admin123!` | Admin HR |
| `finance@example.com` | `Finance123!` | Finance |
| `superadmin@example.com` | `SuperAdmin123!` | Super Admin |

Jalankan `npm run seed:all` untuk mengisi ulang data master dan data demo.

## Skrip

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Menjalankan server development dengan Turbopack |
| `npm run build` / `npm start` | Build dan menjalankan aplikasi production |
| `npm run lint` | Menjalankan ESLint |
| `npx tsc --noEmit` | Menjalankan type-check |
| `npm run seed:all` | Mengisi ulang data master dan data demo |
| `npm run seed:demo-besar` | Mengisi dataset demo besar secara idempoten |
| `npm run reminder:harian` | Menjalankan job pengingat harian |

## API v1

Endpoint utama:

- `GET /api/v1/me`, `/attendance`, `/schedule`, `/payslips`,
  `/announcements`
- `GET /api/v1/leave`, `/overtime`, `/duty`, `/approval`
- `GET/POST /api/v1/attendance-corrections`, `/shift-swaps`
- `GET/POST /api/v1/reimbursements`, `/salary-advances`,
  `/business-travel`
- `GET/POST /api/v1/data-updates`
- `POST /api/v1/auth/login`
- `POST/DELETE /api/v1/devices` untuk registrasi push token

Endpoint lain yang tersedia: `/home`, `/notifications`, `/team`,
`/employees`, `/onboarding`, `/leave/balance`, `/leave/types`,
`/approval/timeline`, `/attendance/day`, `/attendance/history`,
`/me/profile`, `/me/password`, dan `/auth/logout`.

Endpoint yang membutuhkan autentikasi menggunakan:

```text
Authorization: Bearer <token>
```

Detail request dan response tersedia di `mobile-api.postman_collection.json`.
