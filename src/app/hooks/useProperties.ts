import { useState, useEffect, useCallback } from 'react';
import { propertiesService } from '../services/properties.service';
import type { Property } from '../types';

export function useProperties(locationId?: string) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = locationId
        ? await propertiesService.getByLocation(locationId)
        : await propertiesService.getAll();
      setProperties(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { properties, loading, error, refetch: fetch };
}
