import type { AnalysisStatus, ReviewStatus, WasteCategory } from './waste';

/** Values used to construct the multipart POST /api/scans request. */
export interface CreateScanRequest {
  image: File;
  location?: {
    latitude: number;
    longitude: number;
    accuracy_m: number;
    captured_at: string;
  };
}

/** Complete result returned after POST /api/scans has persisted the scan. */
export interface CreateScanResult {
  id: string;
  material: string | null;
  category: WasteCategory | null;
  confidence: number | null;
  /** Explanation for the current response; it is not persisted in waste_scans. */
  reason: string | null;
  instruction: string;
  /** Cultural context is deliberately withheld until it is verified. */
  local_context: null;
  analysis_status: AnalysisStatus;
  review_status: ReviewStatus;
  regency: string | null;
  district: string | null;
  image_url: string | null;
}

/** Idempotent retries may return only the already stored scan's current status. */
export type CreateScanResponse =
  | { data: CreateScanResult; duplicate?: false }
  | { data: Pick<CreateScanResult, 'id' | 'analysis_status'>; duplicate: true }
  | { error: { code: string } };
