/**
 * Utilitas geolokasi untuk validasi radius presensi (PRD mobile Bag. 5.4).
 */

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Jarak antara dua koordinat dalam meter (rumus Haversine).
 * Akurasi cukup untuk radius lokasi kerja (ratusan meter).
 */
export function measureDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Validasi posisi perangkat terhadap lokasi kerja.
 *
 * @returns `null` bila tidak dapat dinilai (koordinat tidak lengkap,
 *          atau lokasi belum mengatur radius) — sesuai PRD mobile Bag. 5.4:
 *          absensi tetap dicatat, hanya flag-nya yang kosong.
 */
export function validateRadius(input: {
  latitude?: number | null;
  longitude?: number | null;
  site?: { latitude?: number | null; longitude?: number | null; radiusMeters?: number | null } | null;
}): boolean | null {
  const { latitude, longitude, site } = input;

  if (!site) return null;
  if (site.latitude == null || site.longitude == null) return null;
  if (site.radiusMeters == null || site.radiusMeters <= 0) return null;
  if (latitude == null || longitude == null) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const distance = measureDistanceMeters(latitude, longitude, Number(site.latitude), Number(site.longitude));
  return distance > site.radiusMeters;
}
