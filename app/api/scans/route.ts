import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server';
import { classifyWithDeepSeek } from '@/lib/deepseek';
import { reverseGeocode } from '@/lib/reverse-geocode';
import { getConfidenceThreshold } from '@/lib/waste-api';
import sharp from 'sharp';
import { parseGpsFields, sniffImageMime } from '@/lib/scan-validation';

export const maxDuration = 60;
const MAX_BYTES = 10 * 1024 * 1024;

function fail(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BYTES + 1024 * 1024) return fail('REQUEST_TOO_LARGE', 413);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return fail('INVALID_IDEMPOTENCY_KEY', 400);
  }
  if (process.env.NODE_ENV === 'production' && process.env.SCAN_API_ENABLED !== 'true') return fail('SCAN_API_DISABLED', 503);
  if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_MODEL) return fail('AI_NOT_CONFIGURED', 503);

  let form: FormData;
  try { form = await request.formData(); } catch { return fail('INVALID_MULTIPART', 400); }
  const file = form.get('image');
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_BYTES) return fail('INVALID_FILE_SIZE', 400);
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const sourceMime = sniffImageMime(sourceBytes);
  if (!sourceMime || file.type !== sourceMime) return fail('INVALID_FILE_TYPE', 415);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await sharp(sourceBytes, { limitInputPixels: 40000000, failOn: 'error' }).rotate().jpeg({ quality: 88 }).toBuffer());
  } catch { return fail('INVALID_IMAGE_CONTENT', 415); }
  if (bytes.length > MAX_BYTES) return fail('IMAGE_NORMALIZATION_TOO_LARGE', 413);
  const mimeType = 'image/jpeg';
  const extension = 'jpg';
  const gps = parseGpsFields([form.get('latitude'), form.get('longitude'), form.get('location_accuracy_m'), form.get('location_captured_at')]);
  if (!gps) return fail('INVALID_GPS', 400);

  let admin;
  try { admin = createSupabaseAdminClient(); } catch { return fail('SERVER_NOT_CONFIGURED', 503); }
  let userId: string | null = null;
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data } = await sessionClient.auth.getUser();
    userId = data.user?.id ?? null;
  } catch { /* anonymous scan is allowed */ }

  const { data: existing } = await admin.from('waste_scans').select('id,analysis_status').eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json({ data: existing, duplicate: true }, { status: existing.analysis_status === 'pending' ? 202 : 200 });

  const { data: scan, error: insertError } = await admin.from('waste_scans').insert({
    idempotency_key: idempotencyKey,
    user_id: userId,
    analysis_status: 'pending',
    review_status: 'not_required',
    ...gps,
  }).select('id').single();
  if (insertError || !scan) {
    if (insertError?.code === '23505') {
      const { data: duplicate } = await admin.from('waste_scans').select('id,analysis_status').eq('idempotency_key', idempotencyKey).maybeSingle();
      if (duplicate) return NextResponse.json({ data: duplicate, duplicate: true }, { status: duplicate.analysis_status === 'pending' ? 202 : 200 });
    }
    return fail('DATABASE_ERROR', 503);
  }

  const imagePath = 'scans/' + scan.id + '/' + crypto.randomUUID() + '.' + extension;
  const { error: uploadError } = await admin.storage.from('waste-images').upload(imagePath, bytes, {
    contentType: mimeType, upsert: false, cacheControl: '300',
  });
  if (uploadError) {
    await admin.from('waste_scans').update({ analysis_status: 'failed', analysis_error_code: 'upload_failed' }).eq('id', scan.id);
    return fail('UPLOAD_FAILED', 502);
  }

  let region = { regency: null as string | null, district: null as string | null };
  if (gps.latitude !== null && gps.longitude !== null) {
    try { region = await reverseGeocode({ latitude: gps.latitude, longitude: gps.longitude }); } catch { /* unknown region stays null */ }
  }

  try {
    const result = await classifyWithDeepSeek(bytes, mimeType);
    const threshold = getConfidenceThreshold();
    const confidence = result.confidence === null ? null : Number(result.confidence.toFixed(5));
    const needsReview = result.category === null || confidence === null || confidence < threshold;
    const actionInstruction = result.category ? {
      ORGANIK: 'Pisahkan dan olah sebagai sampah organik atau kompos.',
      ANORGANIK: 'Bersihkan lalu pilah untuk didaur ulang atau setorkan ke bank sampah.',
      RESIDU: 'Buang terpisah dari sampah organik dan material daur ulang.',
      B3: 'Simpan dengan aman dan serahkan ke fasilitas pengumpulan limbah B3 resmi.',
    }[result.category] : 'Pisahkan sementara dan minta verifikasi sebelum membuang.';
    const row = {
      image_path: imagePath,
      regency: region.regency,
      district: region.district,
      material_detected: result.material,
      trash_category: result.category,
      confidence_score: confidence,
      action_instruction: actionInstruction,
      balinese_context_note: null,
      analysis_status: 'completed',
      analysis_error_code: null,
      review_status: needsReview ? 'pending' : 'not_required',
    };
    const { error } = await admin.from('waste_scans').update(row).eq('id', scan.id);
    if (error) throw new Error('DATABASE_UPDATE_FAILED');
    const { data: signed } = await admin.storage.from('waste-images').createSignedUrl(imagePath, 300);
    return NextResponse.json({
      data: {
        id: scan.id, material: result.material, category: result.category, confidence,
        reason: result.reason, instruction: actionInstruction, local_context: null,
        analysis_status: 'completed', review_status: row.review_status,
        regency: region.regency, district: region.district, image_url: signed?.signedUrl ?? null,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI_PROVIDER_ERROR';
    const code = /^[a-z0-9_]{1,64}$/.test(message) ? message.toLowerCase() : 'analysis_failed';
    await admin.from('waste_scans').update({
      image_path: imagePath, regency: region.regency, district: region.district,
      analysis_status: 'failed', analysis_error_code: code, review_status: 'not_required',
    }).eq('id', scan.id);
    return fail(code === 'ai_not_configured' ? 'AI_NOT_CONFIGURED' : 'ANALYSIS_FAILED', 502);
  }
}
