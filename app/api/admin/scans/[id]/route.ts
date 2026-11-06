import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { DEFAULT_CATEGORY_INSTRUCTIONS, safeScanDto } from '@/lib/waste-api';
import { isValidUuid, parseReviewPatch } from '@/lib/scan-validation';

/**
 * PATCH /api/admin/scans/[id]
 * Verifikasi dan koreksi klasifikasi scan oleh admin (mengubah category ke ORGANIK|ANORGANIK|RESIDU|B3
 * atau null jika non-sampah/false detection DeepSeek, mengubah review_status, material, atau instruction).
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: { code: 'INVALID_SCAN_ID' } }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
  }

  const patch = parseReviewPatch(body);
  if (!patch) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    review_status: patch.review_status,
  };
  if (patch.category !== undefined) {
    updates.trash_category = patch.category;
    if (patch.category !== null && !patch.instruction) {
      updates.action_instruction = DEFAULT_CATEGORY_INSTRUCTIONS[patch.category];
    } else if (patch.category === null && !patch.instruction) {
      updates.action_instruction = 'Objek ditandai sebagai bukan sampah / tidak terklasifikasi oleh admin.';
    }
  }
  if (patch.material !== undefined) {
    updates.material_detected = patch.material;
  }
  if (patch.instruction !== undefined) {
    updates.action_instruction = patch.instruction;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('waste_scans')
      .update(updates)
      .eq('id', id)
      .select(
        'id,material_detected,trash_category,confidence_score,action_instruction,balinese_context_note,analysis_status,review_status,regency,district,created_at,image_path',
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }

    const dto = safeScanDto(data as Record<string, unknown>);
    let image_url: string | null = null;
    if (typeof dto.image_path === 'string') {
      const { data: signed } = await supabase.storage.from('waste-images').createSignedUrl(dto.image_path, 300);
      image_url = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      data: {
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
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}

/**
 * DELETE /api/admin/scans/[id]
 * Menghapus satu record scan beserta file gambarnya di bucket waste-images.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: { code: 'INVALID_SCAN_ID' } }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from('waste_scans')
      .select('id,image_path')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }

    if (typeof existing.image_path === 'string' && existing.image_path.length > 0) {
      await supabase.storage.from('waste-images').remove([existing.image_path]);
    }

    const { error: deleteError } = await supabase.from('waste_scans').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ data: { deleted_id: id } });
  } catch {
    return NextResponse.json({ error: { code: 'DATABASE_ERROR' } }, { status: 503 });
  }
}
