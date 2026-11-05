import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { computeActivitySeries, parseFilters, readAllFilteredRows } from '@/lib/waste-api';

export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const params = request.nextUrl.searchParams;
  const groupBy = params.get('group_by') ?? 'day';
  if (groupBy !== 'day') {
    return NextResponse.json({ error: { code: 'INVALID_GROUP_BY' } }, { status: 400 });
  }
  const filters = parseFilters(params);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  try {
    const rows = await readAllFilteredRows(
      createSupabaseAdminClient(),
      filters,
      'created_at,analysis_status,review_status',
    );
    const series = computeActivitySeries(rows, filters.start, filters.end);
    return NextResponse.json({
      data: series,
      meta: {
        timezone: 'Asia/Makassar',
        group_by: 'day',
        filters_applied: filters,
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}

