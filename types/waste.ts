export type WasteCategory = 'organic' | 'inorganic' | 'residue' | 'b3';

export interface ClassificationResult {
  category: WasteCategory;
  confidence: number;
  material: string;
  reason: string;
  instruction: string;
  localContext: string | null;
  analysisStatus: 'completed' | 'uncertain';
  area: ScanArea;
}

export interface ScanArea {
  regency: string;
  village: string;
}

export interface ScanCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
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
