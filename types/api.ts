export type CanonicalCategory = 'ORGANIK' | 'ANORGANIK' | 'RESIDU' | 'B3';

export type AnalysisStatus = 'completed' | 'uncertain' | 'failed';

export interface DeepSeekAnalysisResult {
  material_detected: string;
  trash_category: CanonicalCategory;
  confidence_score: number;
  classification_reason: string;
  action_instruction: string;
  balinese_context_note: string | null;
  analysis_status: AnalysisStatus;
}

export interface AnalyzeScanRecord {
  id: string;
  analysis_status: AnalysisStatus;
  material: string | null;
  category: CanonicalCategory | null;
  confidence: number | null;
  reason: string | null;
  instruction: string | null;
  local_context: string | null;
  regency: string | null;
  district: string | null;
  scanned_at: string;
  image_url: string | null;
}

export interface AnalyzeScanSuccessResponse {
  data: AnalyzeScanRecord;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
