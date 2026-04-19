import { useState, useEffect, useCallback } from 'react';
import { unavailabilityService } from '../services/unavailability.service';
import type { Unavailability } from '../types';

export function useMyUnavailability() {
  const [entries, setEntries] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await unavailabilityService.getMine();
      setEntries(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, loading, error, refetch: fetch };
}
