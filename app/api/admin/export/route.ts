import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { csvEscape, parseFilters, readAllFilteredRows } from '@/lib/waste-api';

export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const filters = parseFilters(request.nextUrl.searchParams);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  try {
    const rows = await readAllFilteredRows(createSupabaseAdminClient(), filters, 'id,material_detected,trash_category,confidence_score,analysis_status,review_status,regency,district,created_at');
    const columns = ['id', 'material_detected', 'trash_category', 'confidence_score', 'analysis_status', 'review_status', 'regency', 'district', 'created_at'];
    const lines = [columns.map(csvEscape).join(',')];
    for (const row of rows) lines.push(columns.map((key) => csvEscape(row[key])).join(','));
    return new NextResponse('\uFEFF' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="baliecograde-scans.csv"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}
