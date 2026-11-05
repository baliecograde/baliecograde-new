import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { computeSummaryStats, parseFilters, readAllFilteredRows } from '@/lib/waste-api';

export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const filters = parseFilters(request.nextUrl.searchParams);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  try {
    const rows = await readAllFilteredRows(
      createSupabaseAdminClient(),
      filters,
      'trash_category,analysis_status,review_status,regency,district',
    );
    const summary = computeSummaryStats(rows);
    return NextResponse.json({
      data: {
        total: summary.total_scans,
        by_category: {
          ...summary.by_category,
          unclassified: summary.unclassified,
        },
        by_regency: summary.by_regency,
        pending_reviews: summary.pending_reviews,
      },
      meta: { timezone: 'Asia/Makassar', filters_applied: filters },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}
