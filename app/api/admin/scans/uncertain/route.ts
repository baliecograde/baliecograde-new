import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { buildFilteredQuery, parseFilters, readAllFilteredRows, safeScanDto } from '@/lib/waste-api';
import { parseBulkDeletePayload, parsePagination } from '@/lib/scan-validation';

/**
 * GET /api/admin/scans/uncertain
 * Mengambil khusus daftar scan berstatus uncertain / non-sampah (trash_category IS NULL)
 * beserta meta.all_ids untuk fitur "Select All Uncertain/Non-Sampah" di Admin Dashboard.
 */
export async function GET(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const params = request.nextUrl.searchParams;
  const filters = parseFilters(params, { onlyUncertain: true });
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });
  const pagination = parsePagination(params.get('page'), params.get('page_size'));
  if (!pagination) return NextResponse.json({ error: { code: 'INVALID_PAGINATION' } }, { status: 400 });
  const { page, pageSize } = pagination;

  try {
    const supabase = createSupabaseAdminClient();
    const [pageResult, allIdRows] = await Promise.all([
      buildFilteredQuery(
        supabase,
        'id,material_detected,trash_category,confidence_score,action_instruction,balinese_context_note,analysis_status,review_status,regency,district,created_at,image_path',
        filters,
        true,
      )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1),
      readAllFilteredRows(supabase, filters, 'id'),
    ]);

    if (pageResult.error) throw pageResult.error;
    const rows = await Promise.all(
      ((pageResult.data ?? []) as unknown as Record<string, unknown>[]).map(async (row) => {
        const dto = safeScanDto(row);
        let image_url: string | null = null;
        if (typeof row.image_path === 'string') {
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

    const allIds = allIdRows.map((row) => String(row.id)).filter(Boolean);
    const total = pageResult.count ?? allIds.length;
    return NextResponse.json({
      data: rows,
      meta: {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
        all_ids: allIds,
        timezone: 'Asia/Makassar',
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}

/**
 * DELETE /api/admin/scans/uncertain
 * Quick deletion untuk menghapus seluruh scan uncertain/non-sampah (?all=true atau body { all: true })
 * atau daftar ID terpilih (body { ids: string[] }), sekaligus menghapus objek gambar di Storage.
 */
export async function DELETE(request: NextRequest) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const params = request.nextUrl.searchParams;
  const filters = parseFilters(params, { onlyUncertain: true });
  if (!filters) return NextResponse.json({ error: { code: 'INVALID_FILTER' } }, { status: 400 });

  let rawBody: unknown = null;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
    }
  }

  const bulkTarget = parseBulkDeletePayload(rawBody, params.get('all'));
  if (!bulkTarget) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    let targetRows: Array<{ id: string; image_path: string | null }> = [];

    if (bulkTarget.mode === 'ids') {
      const { data, error } = await supabase
        .from('waste_scans')
        .select('id,image_path')
        .is('trash_category', null)
        .in('id', bulkTarget.ids);
      if (error) throw error;
      targetRows = (data ?? []) as Array<{ id: string; image_path: string | null }>;
    } else {
      const rows = await readAllFilteredRows(supabase, filters, 'id,image_path');
      targetRows = rows.map((row) => ({
        id: String(row.id),
        image_path: typeof row.image_path === 'string' ? row.image_path : null,
      }));
    }

    if (targetRows.length === 0) {
      return NextResponse.json({ data: { deleted_count: 0, deleted_ids: [] } });
    }

    const targetIds = targetRows.map((row) => row.id);
    const imagePaths = targetRows
      .map((row) => row.image_path)
      .filter((path): path is string => typeof path === 'string' && path.length > 0);

    if (imagePaths.length > 0) {
      await supabase.storage.from('waste-images').remove(imagePaths);
    }

    const { error: deleteError } = await supabase
      .from('waste_scans')
      .delete()
      .is('trash_category', null)
      .in('id', targetIds);
    if (deleteError) throw deleteError;

    return NextResponse.json({
      data: {
        deleted_count: targetIds.length,
        deleted_ids: targetIds,
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}

