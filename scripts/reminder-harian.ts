/**
 * CLI pengingat harian — jadwalkan sekali sehari (mis. Windows Task Scheduler):
 *
 *   npm run reminder:harian
 *
 * Aman dijalankan berulang: notifikasi per tanggal tidak dikirim dua kali.
 */
import "dotenv/config";
import prisma from "@/src/lib/prisma";
import { jalankanPengingatHarian } from "@/src/modules/notifikasi/lib/reminder-harian";

const hasil = await jalankanPengingatHarian();
console.log(JSON.stringify(hasil, null, 2));
await prisma.$disconnect();
