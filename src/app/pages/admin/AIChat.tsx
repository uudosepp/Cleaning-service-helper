import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Key, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { PageHeader } from '../../components/shared/PageHeader';
import { aiService } from '../../services/ai.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../components/ui/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const STORAGE_KEY = 'ai_chat_messages';

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function AdminAIChat() {
  const { profile } = useAuth();
  const { t, lang } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [newEmployee, setNewEmployee] = useState<{ password: string; email: string; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const processingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key from DB when profile is ready
  useEffect(() => {
    if (!profile?.tenant_id) return;
    setKeyLoading(true);
    aiService.loadApiKey(profile.tenant_id).then(key => {
      setHasKey(!!key);
      setKeyLoading(false);
    }).catch(() => {
      // Fallback: check localStorage
      setHasKey(!!localStorage.getItem('gemini_api_key'));
      setKeyLoading(false);
    });
  }, [profile?.tenant_id]);

  // Auto-send prefilled message from dashboard "Find replacement" button
  useEffect(() => {
    if (!hasKey || keyLoading) return;
    const prefill = sessionStorage.getItem('ai_prefill');
    if (prefill) {
      sessionStorage.removeItem('ai_prefill');
      setTimeout(() => processMessage(prefill), 100);
    }
  }, [hasKey, keyLoading]);

  // Save messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ref to always have latest messages (avoids stale closure)
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Process a single message against current state
  const processMessage = useCallback(async (userMsg: string) => {
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Wait a tick so state updates, then read from ref
      await new Promise(r => setTimeout(r, 0));

      // Build history — send only last 20 messages to AI (keeps context manageable)
      const MAX_HISTORY = 20;
      const allMessages = messagesRef.current;
      const recentMessages = allMessages.slice(-MAX_HISTORY);
      const history = recentMessages.map(m => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.content }],
      }));

      // Remove the last user message (we pass it separately)
      const historyWithoutLast = history.slice(0, -1);

      const result = await aiService.chat(
        userMsg,
        historyWithoutLast,
        profile?.tenant_id || '',
        profile?.id || '',
        lang,
      );
      setMessages(prev => [...prev, { role: 'model', content: result.text }]);

      if (result.newEmployee) {
        setNewEmployee(result.newEmployee);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', content: `Viga: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, lang]);

  // Process queue
  useEffect(() => {
    if (queue.length === 0 || processingRef.current) return;

    processingRef.current = true;
    const next = queue[0];
    setQueue(prev => prev.slice(1));

    processMessage(next).finally(() => {
      processingRef.current = false;
    });
  }, [queue, loading, processMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');

    if (loading) {
      // Queue it — will process after current message finishes
      setQueue(prev => [...prev, userMsg]);
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    } else {
      processMessage(userMsg);
    }

    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim() || !profile?.tenant_id) return;
    setTestingKey(true);
    try {
      const valid = await aiService.testApiKey(keyInput.trim());
      if (valid) {
        await aiService.setApiKey(keyInput.trim(), profile.tenant_id);
        setHasKey(true);
        setKeyInput('');
      } else {
        alert(t('ai_invalid_key') || 'Invalid API key');
      }
    } catch {
      alert(t('ai_test_failed') || 'API key test failed');
    }
    setTestingKey(false);
  };

  const handleRemoveKey = async () => {
    if (!profile?.tenant_id) return;
    await aiService.removeApiKey(profile.tenant_id);
    setHasKey(false);
  };

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // API key setup
  if (keyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div>
        <PageHeader title={t('ai_title')} description={t('ai_setup_desc')} />
        <Card className="bg-card border-border max-w-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">{t('ai_setup_title')}</h3>
                <p className="text-xs text-muted-foreground">{t('ai_setup_desc')}</p>
              </div>
            </div>

            <div className="bg-muted border border-input rounded p-3 text-xs text-muted-foreground space-y-1">
              <p>{t('ai_key_instructions')}</p>
              <p>{t('ai_key_step1')} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-blue-400 underline">aistudio.google.com/apikey</a></p>
              <p>{t('ai_key_step2')}</p>
              <p>{t('ai_key_step3')}</p>
              <p>{t('ai_key_step4')}</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={t('ai_key_placeholder')}
                type="password"
                className="bg-input-background border-input"
              />
              <Button onClick={handleSaveKey} disabled={!keyInput.trim() || testingKey} size="sm">
                {testingKey ? t('loading') : t('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title={t('ai_title')}
        description={t('ai_subtitle')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClearChat}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {t('ai_clear')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRemoveKey}>
              <Key className="w-3.5 h-3.5 mr-1.5" />
              {t('ai_change_key')}
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col bg-card border border-border rounded min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-8 h-8 text-purple-400/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('ai_ask_hint')}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  t('ai_q1'),
                  t('ai_q2'),
                  t('ai_q3'),
                  t('ai_q4'),
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="px-3 py-1.5 bg-muted border border-input rounded text-xs text-muted-foreground hover:text-foreground hover:border-zinc-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-lg p-3',
                msg.role === 'user'
                  ? 'ml-auto bg-blue-600/15 text-foreground dark:bg-blue-600/20'
                  : 'bg-muted text-foreground'
              )}
            >
              {msg.role === 'model' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] text-purple-400 font-medium">{t('ai_title')}</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {loading && (
            <div className="max-w-[85%] bg-muted rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] text-purple-400 font-medium">
                  {t('ai_title')} {queue.length > 0 && `(+${queue.length} ${t('ai_queue')})`}
                </span>
              </div>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* New employee credentials modal */}
        <Dialog open={!!newEmployee} onOpenChange={(open) => { if (!open) setNewEmployee(null); }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('ai_new_employee')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('emp_credentials_desc')}
            </p>
            {newEmployee && (
              <>
                <p className="text-xs text-muted-foreground">{t('emp_worker')}: <span className="text-foreground">{newEmployee.name}</span></p>
                <div className="bg-muted border border-input rounded p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</div>
                      <div className="text-sm text-foreground font-mono truncate">{newEmployee.email}</div>
                    </div>
                    <Button
                      size="sm" variant="ghost" className="shrink-0 h-8 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(newEmployee.email);
                        setCopiedField('email');
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Parool</div>
                      <div className="text-sm text-foreground font-mono truncate">{newEmployee.password}</div>
                    </div>
                    <Button
                      size="sm" variant="ghost" className="shrink-0 h-8 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(newEmployee.password);
                        setCopiedField('password');
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? t('ai_next_message') : t('ai_ask')}
            autoFocus
            className="bg-input-background border-input"
          />
          <Button type="submit" size="sm" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
