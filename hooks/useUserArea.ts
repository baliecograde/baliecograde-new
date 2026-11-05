import { useCallback, useEffect, useState } from 'react';
import { findNearestBaliDistrict } from '@/lib/server/bali-districts';
import type { ScanArea } from '@/types/waste';

export type AreaStatus = 'locating' | 'precise' | 'denied' | 'unavailable' | 'outside-bali';

export interface UserArea {
  status: AreaStatus;
  area: ScanArea;
  requestLocation: () => void;
}

const BALI_BOUNDS = {
  minLat: -8.95,
  maxLat: -8.05,
  minLng: 114.40,
  maxLng: 115.75,
};

function isWithinBali(lat: number, lng: number): boolean {
  return (
    lat >= BALI_BOUNDS.minLat &&
    lat <= BALI_BOUNDS.maxLat &&
    lng >= BALI_BOUNDS.minLng &&
    lng <= BALI_BOUNDS.maxLng
  );
}

function queryBrowserGeolocation(
  onUpdate: (nextStatus: AreaStatus, nextArea: ScanArea) => void,
) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    queueMicrotask(() => onUpdate('unavailable', { regency: null, district: null }));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!isWithinBali(coords.latitude, coords.longitude)) {
        onUpdate('outside-bali', { regency: null, district: null });
        return;
      }
      const nearest = findNearestBaliDistrict(coords.latitude, coords.longitude);
      onUpdate('precise', { regency: nearest.regency, district: nearest.district });
    },
    (error) => {
      onUpdate(
        error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        { regency: null, district: null },
      );
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

export function useUserArea(): UserArea {
  const [status, setStatus] = useState<AreaStatus>('locating');
  const [area, setArea] = useState<ScanArea>({ regency: null, district: null });

  const requestLocation = useCallback(() => {
    setStatus('locating');
    queryBrowserGeolocation((nextStatus, nextArea) => {
      setStatus(nextStatus);
      setArea(nextArea);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    queryBrowserGeolocation((nextStatus, nextArea) => {
      if (cancelled) return;
      setStatus(nextStatus);
      setArea(nextArea);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, area, requestLocation };
}
