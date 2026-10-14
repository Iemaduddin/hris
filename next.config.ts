import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
  // --- CORS untuk klien eksternal (mobile dev via `expo start --web`) ---
  // Web HRIS berjalan same-origin sehingga tidak terpengaruh; endpoint API
  // memakai `Authorization: Bearer` sehingga tidak butuh `credentials`.
  // Preflight OPTIONS dijawab otomatis Next (204) — header di bawah ikut
  // menempel karena diterapkan per-path tanpa memandang method.
  // Kompatibilitas: path lama /akun* dan /api/v1/me/profil (versi mobile lama).
  async redirects() {
    return [
      { source: "/akun/:path*", destination: "/account/:path*", permanent: true },
      { source: "/api/akun/:path*", destination: "/api/account/:path*", permanent: true },
      { source: "/api/v1/me/profil", destination: "/api/v1/me/profile", permanent: true },
    ];
  },
  async headers() {    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, Accept",
          },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
