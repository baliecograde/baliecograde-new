import 'server-only';
import type { WasteCategory } from '@/types/waste';
export interface VisionResult {
  material: string | null;
  category: WasteCategory | null;
  confidence: number | null;
  reason: string | null;
  instruction: string | null;
  localContext: string | null;
}
const categories = new Set<WasteCategory>(['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3']);
export async function classifyWithDeepSeek(bytes: Uint8Array, mimeType: string): Promise<VisionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL;
  if (!apiKey || !model) throw new Error('AI_NOT_CONFIGURED');
  const imageBase64 = Buffer.from(bytes).toString('base64');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'Analisis foto. Kembalikan hanya JSON dengan keys material, category, confidence, reason, instruction, local_context. Jika objek bukan sampah atau sampah tidak terlihat jelas, category dan confidence harus null; reason jelaskan singkat kenapa (maksimal 25 kata). Jika sampah terdeteksi, category harus ORGANIK, ANORGANIK, RESIDU, atau B3, confidence angka 0..1, dan reason maksimal 25 kata menjelaskan material/kondisi utama. instruction maksimal 35 kata, ringkas namun mencakup langkah pemilahan dan peringatan keselamatan penting. material harus nama benda/material singkat. Jangan mengarang konteks budaya Bali; local_context null kecuali ada kaitan yang jelas.' },
        { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + imageBase64 } },
      ] }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR');
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI_EMPTY_RESPONSE');
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : null;
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) throw new Error('AI_INVALID_RESPONSE');
  const candidate = typeof parsed.category === 'string' ? parsed.category.toUpperCase() : null;
  return {
    material: typeof parsed.material === 'string' ? parsed.material.slice(0, 300) : null,
    category: candidate && categories.has(candidate as WasteCategory) ? candidate as WasteCategory : null,
    confidence,
    reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 1000) : null,
    instruction: typeof parsed.instruction === 'string' ? parsed.instruction.slice(0, 1200) : null,
    localContext: typeof parsed.local_context === 'string' ? parsed.local_context.slice(0, 1200) : null,
  };
}
