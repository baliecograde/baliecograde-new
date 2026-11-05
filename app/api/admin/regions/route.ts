import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { computeRegionStats, parseFilters, readAllFilteredRows } from '@/lib/waste-api';

export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const params = request.nextUrl.searchParams;
  const limitParam = params.get('limit');
  let limit: number | null = null;
  if (limitParam !== null && limitParam !== '') {
    const parsedLimit = Number(limitParam);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json({ error: { code: 'INVALID_LIMIT' } }, { status: 400 });
    }
    limit = parsedLimit;
  }
  const filters = parseFilters(params);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  try {
    const rows = await readAllFilteredRows(
      createSupabaseAdminClient(),
      filters,
      'regency,district,analysis_status,review_status',
    );
    const regions = computeRegionStats(rows);
    return NextResponse.json({
      data: limit ? regions.slice(0, limit) : regions,
      meta: {
        timezone: 'Asia/Makassar',
        filters_applied: filters,
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}

