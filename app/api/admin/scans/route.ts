import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { buildFilteredQuery, parseFilters, safeScanDto, type ParseFilterOptions } from '@/lib/waste-api';
import { parsePagination } from '@/lib/scan-validation';
import { mayIssueScanImageUrl } from '@/lib/scan-access';

export async function handleAdminScansGet(request: NextRequest, filterOptions?: ParseFilterOptions) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const params = request.nextUrl.searchParams;
  const filters = parseFilters(params, filterOptions);
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  const pagination = parsePagination(params.get('page'), params.get('page_size'));
  if (!pagination) return NextResponse.json({ error: { code: 'INVALID_PAGINATION' } }, { status: 400 });
  const { page, pageSize } = pagination;
  try {
    const supabase = createSupabaseAdminClient();
    const query = buildFilteredQuery(
      supabase,
      'id,user_id,material_detected,trash_category,confidence_score,action_instruction,balinese_context_note,analysis_status,review_status,regency,district,created_at,image_path',
      filters,
      true,
    )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    const rows = await Promise.all(
      ((data ?? []) as unknown as Record<string, unknown>[]).map(async (row) => {
        const dto = safeScanDto(row);
        let image_url: string | null = null;
        if (typeof row.image_path === 'string' && mayIssueScanImageUrl({ user_id: typeof row.user_id === 'string' ? row.user_id : null }, guard.userId, true)) {
          const { data: signed } = await supabase.storage.from('waste-images').createSignedUrl(row.image_path, 300);
          image_url = signed?.signedUrl ?? null;
        }
        return {
          id: dto.id,
          material: dto.material,
          category: dto.category,
          confidence: dto.confidence,
          instruction: dto.instruction,
          local_context: dto.local_context,
          analysis_status: dto.analysis_status,
          review_status: dto.review_status,
          regency: dto.regency,
          district: dto.district,
          scanned_at: dto.scanned_at,
          image_url,
        };
      }),
    );
    const total = count ?? 0;
    return NextResponse.json({
      data: rows,
      meta: {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
        include_uncertain: Boolean(filters.include_uncertain),
        timezone: 'Asia/Makassar',
      },
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}

/**
 * GET /api/admin/scans
 * Mengambil daftar pemindaian yang terdeteksi sebagai sampah (default: exclude uncertain/non-sampah).
 * Mendukung filter ?category=ORGANIK|ANORGANIK|RESIDU|B3, regency, district, search, start_date, end_date, page, page_size.
 */
export async function GET(request: NextRequest) {
  return handleAdminScansGet(request);
}
