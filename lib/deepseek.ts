import 'server-only';
import type { WasteCategory } from '@/types/waste';
export interface VisionResult {
  material: string | null; category: WasteCategory | null; confidence: number | null;
  instruction: string | null; localContext: string | null;
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
        { type: 'text', text: 'Analyze the waste photo. Return JSON keys material, category, confidence, instruction, local_context. category must be ORGANIK, ANORGANIK, RESIDU, B3, or null if unclassifiable. confidence is 0..1 or null. Do not invent Balinese cultural claims; local_context must be null unless supported by provided context.' },
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
    confidence, instruction: typeof parsed.instruction === 'string' ? parsed.instruction.slice(0, 1200) : null,
    localContext: typeof parsed.local_context === 'string' ? parsed.local_context.slice(0, 1200) : null,
  };
}
