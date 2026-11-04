import type { CanonicalCategory, DeepSeekAnalysisResult } from '@/types/api';

const CANONICAL_CATEGORIES: CanonicalCategory[] = ['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3'];

const SYSTEM_PROMPT = `Anda adalah sistem pakar klasifikasi sampah cerdas BaliEcoGrade berbasis konteks kearifan lokal Bali.
Tugas Anda menganalisis gambar sampah dan memberikan klasifikasi presisi dalam format JSON valid.

Aturan Klasifikasi:
1. trash_category WAJIB salah satu dari: "ORGANIK", "ANORGANIK", "RESIDU", "B3".
   - ORGANIK: Sisa makanan, daun, bunga/canang sari bekas, janur, buah, sisa dapur nabati/hewani.
   - ANORGANIK: Botol plastik, gelas plastik, kaleng aluminium, kardus, kertas bersih, kaca.
   - RESIDU: Plastik sachet multilapis kotor, puntung rokok, popok/pembalut, tisu bekas, styrofoam kotor, sisa abu dupa.
   - B3: Baterai bekas, lampu neon/bohlam, botol pestisida/insektisida, limbah medis, kemasan kimia berbahaya.
2. confidence_score bernilai desimal float antara 0.0 sampai 1.0.
3. action_instruction berisi instruksi pemilahan ringkas, jelas, dan dapat langsung dipraktikkan dalam bahasa Indonesia.
4. balinese_context_note berisi relevansi budaya/adat Bali jika relevan (misal: penanganan sisa upacara, canang sari, daksina, pura, banjar). Jika tidak ada kaitan lokal khusus, isi null.
5. analysis_status: "completed" jika objek sampah terdeteksi jelas. "uncertain" jika gambar buram, tidak jelas, atau objek bukan sampah. Jika confidence_score < 0.60, set "uncertain".

Keluarkan HANYA JSON objek tunggal tanpa teks tambahan dengan format:
{
  "material_detected": string,
  "trash_category": "ORGANIK" | "ANORGANIK" | "RESIDU" | "B3",
  "confidence_score": number,
  "action_instruction": string,
  "balinese_context_note": string | null,
  "analysis_status": "completed" | "uncertain"
}`;

export class DeepSeekError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'DeepSeekError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function analyzeWasteWithDeepSeek(
  imageBuffer: Buffer,
  mimeType: string
): Promise<DeepSeekAnalysisResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new DeepSeekError('DEEPSEEK_API_KEY is not configured on the server', 500);
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const base64Data = imageBuffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Klasifikasikan jenis material sampah pada gambar ini dan tentukan kategori pemilahannya.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_object',
    },
    temperature: 0.1,
    max_tokens: 500,
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network failure calling DeepSeek API';
    throw new DeepSeekError(`Failed to connect to DeepSeek API: ${message}`, 502);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new DeepSeekError(
      `DeepSeek API responded with HTTP ${response.status}`,
      response.status >= 500 ? 502 : response.status,
      errorBody
    );
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== 'string') {
    throw new DeepSeekError('DeepSeek API returned empty or invalid completion content', 502, data);
  }

  let parsed: Record<string, unknown>;
  try {
    const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(cleanContent);
  } catch {
    throw new DeepSeekError('Failed to parse DeepSeek response as JSON', 502, rawContent);
  }

  const rawCategory = String(parsed.trash_category || '').toUpperCase() as CanonicalCategory;
  const category = CANONICAL_CATEGORIES.includes(rawCategory) ? rawCategory : 'RESIDU';

  let confidence = Number(parsed.confidence_score);
  if (isNaN(confidence) || confidence < 0) {
    confidence = 0.5;
  } else if (confidence > 1) {
    confidence = confidence <= 100 ? confidence / 100 : 1.0;
  }
  confidence = Math.round(confidence * 100) / 100;

  const status: DeepSeekAnalysisResult['analysis_status'] =
    confidence < 0.60 || parsed.analysis_status === 'uncertain' ? 'uncertain' : 'completed';

  return {
    material_detected: String(parsed.material_detected || 'Material tidak dikenal'),
    trash_category: category,
    confidence_score: confidence,
    action_instruction: String(parsed.action_instruction || 'Pilah sampah sesuai kategori yang ditentukan.'),
    balinese_context_note: parsed.balinese_context_note ? String(parsed.balinese_context_note) : null,
    analysis_status: status,
  };
}

