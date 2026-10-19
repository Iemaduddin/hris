/**
 * CLI pengingat harian — jadwalkan sekali sehari (mis. Windows Task Scheduler):
 *
 *   npm run reminder:harian
 *
 * Aman dijalankan berulang: notifikasi per tanggal tidak dikirim dua kali.
 */
import "dotenv/config";
import prisma from "@/src/lib/prisma";
import { runDailyReminder } from "@/src/modules/notifications/lib/daily-reminder";

const hasil = await runDailyReminder();
console.log(JSON.stringify(hasil, null, 2));
await prisma.$disconnect();
