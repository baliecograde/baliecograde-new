import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { parseFilters, readAllFilteredRows } from '@/lib/waste-api';

export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const filters = parseFilters(request.nextUrl.searchParams);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  try {
    const rows = await readAllFilteredRows(createSupabaseAdminClient(), filters, 'trash_category,regency,district');
    const byCategory: Record<string, number> = { ORGANIK: 0, ANORGANIK: 0, RESIDU: 0, B3: 0, unclassified: 0 };
    const byRegency: Record<string, number> = {};
    for (const row of rows) {
      const category = typeof row.trash_category === 'string' ? row.trash_category : 'unclassified';
      byCategory[category] = (byCategory[category] ?? 0) + 1;
      const regency = typeof row.regency === 'string' ? row.regency : 'Tidak diketahui';
      byRegency[regency] = (byRegency[regency] ?? 0) + 1;
    }
    return NextResponse.json({ data: { total: rows.length, by_category: byCategory, by_regency: byRegency }, meta: { timezone: 'Asia/Makassar', filters_applied: filters } });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}
