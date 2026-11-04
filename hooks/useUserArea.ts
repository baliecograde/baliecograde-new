import type { ScanArea } from '@/types/waste';
export type AreaStatus = 'locating' | 'precise' | 'denied' | 'unavailable' | 'outside-bali';
export interface UserArea { status: AreaStatus; area: ScanArea }
export function useUserArea(): UserArea {
  return { status: 'unavailable', area: { regency: null, district: null } };
}
