import { NextRequest, NextResponse } from 'next/server';
import { analyzeWasteWithDeepSeek, DeepSeekError } from '@/lib/server/deepseek';
import { resolveLocationFromCoordinates, LocationValidationError } from '@/lib/server/geocoding';
import type { AnalyzeScanSuccessResponse, ApiErrorResponse } from '@/types/api';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeScanSuccessResponse | ApiErrorResponse>> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      {
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be multipart/form-data',
        },
      },
      { status: 415 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid form data';
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: `Failed to parse multipart form data: ${message}`,
        },
      },
      { status: 400 }
    );
  }

  const imageEntry = formData.get('image');
  if (!imageEntry || !(imageEntry instanceof Blob)) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_IMAGE',
          message: 'Field "image" is required and must be an image file',
        },
      },
      { status: 400 }
    );
  }

  const mimeType = imageEntry.type || 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_IMAGE_TYPE',
          message: `Supported formats are image/jpeg, image/png, image/webp. Received: ${mimeType}`,
        },
      },
      { status: 415 }
    );
  }

  if (imageEntry.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds 10MB limit. Received: ${(imageEntry.size / (1024 * 1024)).toFixed(2)}MB`,
        },
      },
      { status: 413 }
    );
  }

  // Parse and strictly validate GPS coordinates (user location is required)
  const latRaw = formData.get('latitude');
  const lngRaw = formData.get('longitude');
  const accRaw = formData.get('accuracy');
  const capturedAtRaw = formData.get('captured_at');

  if (latRaw === null || latRaw === '' || lngRaw === null || lngRaw === '') {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_COORDINATES',
          message: 'Izin lokasi diperlukan. Koordinat GPS latitude dan longitude wajib disertakan.',
        },
      },
      { status: 400 }
    );
  }

  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  const accuracy = accRaw !== null && accRaw !== '' ? Number(accRaw) : null;
  const capturedAt = typeof capturedAtRaw === 'string' && capturedAtRaw.trim() ? capturedAtRaw.trim() : null;

  let location;
  try {
    location = await resolveLocationFromCoordinates(
      isNaN(latitude) ? null : latitude,
      isNaN(longitude) ? null : longitude,
      accuracy !== null && isNaN(accuracy) ? null : accuracy,
      capturedAt
    );
  } catch (err: unknown) {
    if (err instanceof LocationValidationError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.statusCode }
      );
    }

    const message = err instanceof Error ? err.message : 'Invalid GPS coordinates';
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_COORDINATES',
          message,
        },
      },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await imageEntry.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const aiResult = await analyzeWasteWithDeepSeek(imageBuffer, mimeType);

    const responsePayload: AnalyzeScanSuccessResponse = {
      data: {
        id: crypto.randomUUID(),
        analysis_status: aiResult.analysis_status,
        material: aiResult.material_detected,
        category: aiResult.trash_category,
        confidence: aiResult.confidence_score,
        instruction: aiResult.action_instruction,
        local_context: aiResult.balinese_context_note,
        regency: location.regency,
        district: location.district,
        scanned_at: new Date().toISOString(),
        image_url: null,
      },
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof DeepSeekError) {
      return NextResponse.json(
        {
          error: {
            code: 'DEEPSEEK_API_ERROR',
            message: err.message,
            details: err.details ?? null,
          },
        },
        { status: err.statusCode }
      );
    }

    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message,
        },
      },
      { status: 500 }
    );
  }
}

