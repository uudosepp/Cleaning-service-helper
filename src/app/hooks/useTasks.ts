import { useState, useEffect, useCallback } from 'react';
import { tasksService } from '../services/tasks.service';
import type { CleaningTask, TaskStatus } from '../types';

export function useTasks(filters?: { date?: string; status?: TaskStatus; cleaner_id?: string }) {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksService.getAll(filters);
      setTasks(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters?.date, filters?.status, filters?.cleaner_id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { tasks, loading, error, refetch: fetch, setTasks };
}

export function useUpcomingTasks(cleanerId: string | undefined, days = 7) {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!cleanerId) return;
    setLoading(true);
    try {
      const data = await tasksService.getUpcoming(cleanerId, days);
      setTasks(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cleanerId, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { tasks, loading, error, refetch: fetch };
}
