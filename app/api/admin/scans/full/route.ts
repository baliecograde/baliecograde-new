import { type NextRequest } from 'next/server';
import { handleAdminScansGet } from '@/app/api/admin/scans/route';

/**
 * GET /api/admin/scans/full
 * Mengambil seluruh daftar pemindaian termasuk hasil uncertain / non-sampah (include_uncertain = true).
 * Digunakan saat tombol badge "Show Non-Sampah" diaktifkan pada Admin Dashboard.
 */
export async function GET(request: NextRequest) {
  return handleAdminScansGet(request, { includeUncertain: true });
}
