import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useMessages } from '../../hooks/useMessages';
import { messagesService } from '../../services/messages.service';
import { profilesService } from '../../services/profiles.service';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { cn } from '../../components/ui/utils';
import type { Message, Profile } from '../../types';

export function CleanerChat() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Find admin for this tenant
  useEffect(() => {
    async function findAdmin() {
      try {
        const admins = await profilesService.getAdmins();
        if (admins.length > 0) setAdmin(admins[0]);
      } catch { /* ignore */ }
      setLoadingAdmin(false);
    }
    findAdmin();
  }, []);

  const { messages, addMessage } = useMessages(admin?.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useRealtimeSubscription({
    table: 'messages',
    filter: profile?.id ? `receiver_id=eq.${profile.id}` : undefined,
    enabled: !!profile?.id && !!admin?.id,
    onInsert: (payload) => {
      const newMsg = payload.new as Message;
      if (newMsg.sender_id === admin?.id) {
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
      .filter(m => m.receiver_id === profile.id && !m.read_at)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      messagesService.markRead(unreadIds);
    }
  }, [messages, profile?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !admin?.id || !profile?.tenant_id) return;
    setSending(true);
    try {
      const msg = await messagesService.send(admin.id, text.trim(), profile.tenant_id);
      addMessage(msg);
      setText('');
    } catch { /* ignore */ }
    setSending(false);
  };

  if (loadingAdmin) return <LoadingScreen />;

  if (!admin) {
    return (
      <div>
        <PageHeader title={t('nav_chat')} />
        <EmptyState icon={MessageSquare} title={t('chat_no_admin')} description={t('chat_no_admin_desc')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]">
      <PageHeader title={`${t('nav_chat')} — ${admin.full_name}`} />

      <div className="flex-1 flex flex-col bg-card border border-border rounded min-h-0">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground/60 text-center py-8">{t('chat_start')}</p>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] rounded p-3',
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
    </div>
  );
}
