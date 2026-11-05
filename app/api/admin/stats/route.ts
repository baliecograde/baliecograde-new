import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { computeSummaryStats, parseFilters, readAllFilteredRows } from '@/lib/waste-api';

/**
 * GET /api/admin/stats
 * Endpoint agregasi kompatibilitas UI AdminDashboardPage (total, by_category, by_regency, uncertain_count).
 * Default hanya menghitung sampah terdeteksi (exclude uncertain/non-sampah), mendukung ?include_uncertain=true.
 */
export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const filters = parseFilters(request.nextUrl.searchParams);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  try {
    const queryFilters = filters.category ? filters : { ...filters, include_uncertain: true };
    const rows = await readAllFilteredRows(
      createSupabaseAdminClient(),
      queryFilters,
      'trash_category,analysis_status,review_status,regency,district',
    );
    const summary = computeSummaryStats(rows, Boolean(filters.include_uncertain));
    return NextResponse.json({
      data: {
        total: summary.total_scans,
        by_category: {
          ...summary.by_category,
          unclassified: summary.unclassified,
        },
        by_regency: summary.by_regency,
        uncertain_count: summary.uncertain_count,
        pending_reviews: summary.pending_reviews,
      },
      meta: {
        timezone: 'Asia/Makassar',
        include_uncertain: Boolean(filters.include_uncertain),
        filters_applied: filters,
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}
