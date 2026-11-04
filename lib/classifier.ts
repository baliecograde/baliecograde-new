import type { ClassificationResult, WasteCategory } from '@/types/waste';

const CATEGORIES: WasteCategory[] = ['organic', 'inorganic', 'residue'];
const ANALYSIS_DELAY_MS = 2200;

// Stand-in until a vision model endpoint is connected; no AI key is configured yet.
export async function classifyWaste(image: File): Promise<ClassificationResult> {
  void image;
  await new Promise((resolve) => setTimeout(resolve, ANALYSIS_DELAY_MS));
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const confidence = Math.round((82 + Math.random() * 16) * 10) / 10;
  return { category, confidence };
}
