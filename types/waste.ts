export type WasteCategory = 'organic' | 'inorganic' | 'residue';

export interface ClassificationResult {
  category: WasteCategory;
  confidence: number;
}

export interface ScanArea {
  regency: string;
  village: string;
}

export interface WasteScan {
  id: string;
  regency: string;
  village: string;
  category: WasteCategory;
  confidence: number;
  thumbnail: string | null;
  created_at: string;
}
