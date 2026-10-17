import nodemailer from "nodemailer";

/**
 * Email via SMTP (P4-3). Best-effort: tanpa konfigurasi SMTP
 * (SMTP_HOST/USER/PASS) pengiriman dilewat dengan peringatan —
 * in-app tetap tersimpan sebagai sumber kebenaran badge.
 */

let transporter: { sendMail: (message: { from: string; to: string; subject: string; text: string }) => Promise<unknown> } | null = null;
let configured = false;

function loadTransporter(): typeof transporter {
  if (configured) return transporter;
  configured = true;
  const host = process.env["SMTP_HOST"]?.trim();
  const user = process.env["SMTP_USER"]?.trim();
  const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) {
    console.warn("[email] SMTP belum dikonfigurasi (SMTP_HOST/USER/PASS) — email dilewat.");
    return null;
  }
  const port = Number(process.env["SMTP_PORT"] ?? "587");
  transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: (process.env["SMTP_SECURE"] ?? "").trim() === "1" || port === 465,
    auth: { user, pass },
  });
  return transporter;
}

/** Kirim email teks polos. Tak pernah melempar. */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const t = loadTransporter();
    if (!t) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
    const from = process.env["SMTP_FROM"]?.trim() || process.env["SMTP_USER"]?.trim() || "hris@localhost";
    await t.sendMail({ from, to, subject, text: body });
    return true;
  } catch (error) {
    console.warn("[email] Gagal mengirim:", error instanceof Error ? error.message : error);
    return false;
  }
}
