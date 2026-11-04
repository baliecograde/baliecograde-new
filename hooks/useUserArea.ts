import { useEffect, useState } from 'react';
import { DEFAULT_AREA, findNearestArea, isWithinBali } from '@/lib/regions';
import type { ScanArea } from '@/types/waste';

export type AreaStatus = 'locating' | 'precise' | 'denied' | 'unavailable' | 'outside-bali';

export interface UserArea {
  status: AreaStatus;
  area: ScanArea;
}

const INITIAL_STATE: UserArea = { status: 'locating', area: DEFAULT_AREA };

export function useUserArea(): UserArea {
  const [state, setState] = useState<UserArea>(INITIAL_STATE);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ status: 'unavailable', area: DEFAULT_AREA });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isWithinBali(coords.latitude, coords.longitude)) {
          setState({ status: 'outside-bali', area: DEFAULT_AREA });
          return;
        }
        setState({
          status: 'precise',
          area: findNearestArea(coords.latitude, coords.longitude),
        });
      },
      () => setState({ status: 'denied', area: DEFAULT_AREA }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  return state;
}
