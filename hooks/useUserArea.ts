import { useEffect, useState } from 'react';
import { DEFAULT_AREA, findNearestArea, isWithinBali } from '@/lib/regions';
import type { ScanArea, ScanCoordinates } from '@/types/waste';

export type AreaStatus = 'locating' | 'precise' | 'denied' | 'unavailable' | 'outside-bali';

export interface UserArea {
  status: AreaStatus;
  area: ScanArea;
  coordinates: ScanCoordinates | null;
}

const INITIAL_STATE: UserArea = { status: 'locating', area: DEFAULT_AREA, coordinates: null };

function getInitialState(): UserArea {
  if (typeof navigator !== 'undefined' && !navigator.geolocation) {
    return { status: 'unavailable', area: DEFAULT_AREA, coordinates: null };
  }
  return INITIAL_STATE;
}

export function useUserArea(): UserArea {
  const [state, setState] = useState<UserArea>(getInitialState);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isWithinBali(coords.latitude, coords.longitude)) {
          setState({ status: 'outside-bali', area: DEFAULT_AREA, coordinates: null });
          return;
        }
        setState({
          status: 'precise',
          area: findNearestArea(coords.latitude, coords.longitude),
          coordinates: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            capturedAt: new Date().toISOString(),
          },
        });
      },
      () => setState({ status: 'denied', area: DEFAULT_AREA, coordinates: null }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  return state;
}
