import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import translations, { type Lang, type TranslationKey } from './translations';
import { supabase } from '@/lib/supabase';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'en' || saved === 'et') ? saved : 'en';
  });

  const setLang = useCallback(async (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);

    // Save to profile if logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ language: newLang }).eq('id', user.id);
    }
  }, []);

  // Load language from profile on auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('language').eq('id', user.id).single().then(({ data }) => {
          if (data?.language && (data.language === 'en' || data.language === 'et')) {
            setLangState(data.language);
            localStorage.setItem('lang', data.language);
          }
        });
      }
    });
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string>) => {
    let text = translations[key]?.[lang] || translations[key]?.['en'] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
