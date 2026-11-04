import { supabase } from '@/lib/supabase';
import type { WasteCategory, WasteScan } from '@/types/waste';

const SCAN_COLUMNS = 'id, regency, village, category, confidence, thumbnail, created_at';
const MAX_DASHBOARD_ROWS = 5000;

export interface NewWasteScan {
  regency: string;
  village: string;
  category: WasteCategory;
  confidence: number;
  thumbnail: string | null;
}

export async function recordWasteScan(scan: NewWasteScan): Promise<void> {
  const { error } = await supabase.from('waste_scans').insert(scan);
  if (error) throw new Error(error.message);
}

export async function fetchWasteScans(sinceIso: string | null): Promise<WasteScan[]> {
  let query = supabase.from('waste_scans').select(SCAN_COLUMNS);
  if (sinceIso) query = query.gte('created_at', sinceIso);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(MAX_DASHBOARD_ROWS);
  if (error) throw new Error(error.message);
  return data ?? [];
}
