import { useState, useEffect, useCallback } from 'react';
import { messagesService } from '../services/messages.service';
import type { Message } from '../types';

export function useMessages(otherUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!otherUserId) return;
    setLoading(true);
    try {
      const data = await messagesService.getConversation(otherUserId);
      setMessages(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  return { messages, loading, error, refetch: fetch, addMessage, setMessages };
}
