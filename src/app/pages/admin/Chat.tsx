import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useCleaners } from '../../hooks/useProfiles';
import { useMessages } from '../../hooks/useMessages';
import { messagesService } from '../../services/messages.service';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { supabase } from '@/lib/supabase';
import { cn } from '../../components/ui/utils';
import type { Message } from '../../types';

interface ConversationPreview {
  cleanerId: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export function AdminChat() {
  const { cleanerId } = useParams<{ cleanerId: string }>();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { cleaners } = useCleaners();
  const { messages, addMessage, refetch } = useMessages(cleanerId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [previews, setPreviews] = useState<Record<string, ConversationPreview>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation previews (last message + unread count per cleaner)
  useEffect(() => {
    if (!profile?.id || cleaners.length === 0) return;

    async function loadPreviews() {
      const result: Record<string, ConversationPreview> = {};

      for (const c of cleaners) {
        // Get last message
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .or(`and(sender_id.eq.${profile!.id},receiver_id.eq.${c.id}),and(sender_id.eq.${c.id},receiver_id.eq.${profile!.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', c.id)
          .eq('receiver_id', profile!.id)
          .is('read_at', null);

        const last = lastMsgs?.[0];
        result[c.id] = {
          cleanerId: c.id,
          lastMessage: last?.content || '',
          lastAt: last?.created_at || '',
          unread: count || 0,
        };
      }
      setPreviews(result);
    }

    loadPreviews();
  }, [profile?.id, cleaners]);

  // Refresh previews on realtime message
  useRealtimeSubscription({
    table: 'messages',
    filter: profile?.id ? `receiver_id=eq.${profile.id}` : undefined,
    enabled: !!profile?.id,
    onInsert: (payload) => {
      const newMsg = payload.new as Message;
      // Update preview for this sender
      setPreviews(prev => ({
        ...prev,
        [newMsg.sender_id]: {
          cleanerId: newMsg.sender_id,
          lastMessage: newMsg.content,
          lastAt: newMsg.created_at,
          unread: (prev[newMsg.sender_id]?.unread || 0) + 1,
        },
      }));
      // Add to current conversation if viewing this cleaner
      if (newMsg.sender_id === cleanerId) {
        addMessage(newMsg);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-mark messages as read when chat is open
  useEffect(() => {
    if (!messages.length || !profile?.id) return;
    const unreadIds = messages
      .filter((m: any) => m.receiver_id === profile.id && !m.read_at)
      .map((m: any) => m.id);
    if (unreadIds.length > 0) {
      messagesService.markRead(unreadIds).then(() => {
        // Clear unread count in preview
        if (cleanerId) {
          setPreviews(prev => ({
            ...prev,
            [cleanerId]: { ...prev[cleanerId], unread: 0 },
          }));
        }
      });
    }
  }, [messages, profile?.id, cleanerId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !cleanerId || !profile?.tenant_id) return;
    setSending(true);
    try {
      const msg = await messagesService.send(cleanerId, text.trim(), profile.tenant_id);
      addMessage(msg);
      setText('');
      // Update preview
      setPreviews(prev => ({
        ...prev,
        [cleanerId]: {
          cleanerId,
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unread: 0,
        },
      }));
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  // Sort cleaners: unread first, then by last message time
  const sortedCleaners = [...cleaners].sort((a, b) => {
    const pa = previews[a.id];
    const pb = previews[b.id];
    // Unread first
    if ((pa?.unread || 0) > 0 && !(pb?.unread || 0)) return -1;
    if (!(pa?.unread || 0) && (pb?.unread || 0) > 0) return 1;
    // Then by last message time (newest first)
    if (pa?.lastAt && pb?.lastAt) return pb.lastAt.localeCompare(pa.lastAt);
    if (pa?.lastAt) return -1;
    if (pb?.lastAt) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title={t('nav_chat')} />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Cleaner list */}
        <div className={cn(
          'w-full md:w-72 shrink-0 bg-card border border-border rounded overflow-auto',
          cleanerId && 'hidden md:block'
        )}>
          {sortedCleaners.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground/60">{t('chat_no_employees')}</div>
          ) : (
            sortedCleaners.map(c => {
              const preview = previews[c.id];
              return (
                <Link
                  key={c.id}
                  to={`/vestlused/${c.id}`}
                  className={cn(
                    'block px-4 py-3 border-b border-border text-sm transition-colors',
                    c.id === cleanerId ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate text-foreground">{c.full_name}</div>
                    {preview?.unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                        {preview.unread > 99 ? '99+' : preview.unread}
                      </span>
                    )}
                  </div>
                  {preview?.lastMessage ? (
                    <div className="text-xs text-muted-foreground/60 truncate mt-0.5">{preview.lastMessage}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground/40 mt-0.5 italic">{t('chat_start')}</div>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Chat area */}
        {cleanerId ? (
          <div className="flex-1 flex flex-col bg-card border border-border rounded min-w-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border">
              <Link to="/vestlused" className="text-xs text-muted-foreground/60 hover:text-muted-foreground md:hidden">
                &larr; {t('chat_back')}
              </Link>
              <div className="text-sm font-medium text-foreground">
                {cleaners.find(c => c.id === cleanerId)?.full_name || '...'}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[80%] rounded p-3',
                    msg.sender_id === profile?.id
                      ? 'ml-auto bg-blue-600/15 text-foreground dark:bg-blue-600/20'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('chat_write')}
                className="bg-input-background border-input"
              />
              <Button type="submit" size="sm" disabled={sending || !text.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center">
            <EmptyState icon={MessageSquare} title={t('chat_select')} description={t('chat_select_desc')} />
          </div>
        )}
      </div>
    </div>
  );
}
