import { connection, NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { DEFAULT_CATEGORY_INSTRUCTIONS, safeScanDto } from '@/lib/waste-api';
import { isValidUuid, parseReviewPatch } from '@/lib/scan-validation';

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
  if (patch.category) {
    updates.trash_category = patch.category;
    updates.action_instruction = DEFAULT_CATEGORY_INSTRUCTIONS[patch.category];
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

