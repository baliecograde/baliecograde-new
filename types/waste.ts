export type WasteCategory = 'ORGANIK' | 'ANORGANIK' | 'RESIDU' | 'B3';
export interface ScanArea { regency: string | null; district: string | null }
export interface WasteScan {
  id: string;
  material: string | null;
  category: WasteCategory | null;
  confidence: number | null;
  instruction?: string | null;
  local_context?: string | null;
  analysis_status: 'pending' | 'completed' | 'failed';
  review_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  regency: string | null;
  district: string | null;
  image_url: string | null;
  scanned_at: string;
}
export interface ScanSummary {
  total: number;
  activeRegencies: number;
  topCategory: { category: WasteCategory; count: number } | null;
  byRegency: Record<string, number>;
  byCategory: Record<WasteCategory, number>;
}
