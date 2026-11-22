import { useState, useEffect } from 'react';
import { CurrencyCode } from '../types';

export function useSettingsStore() {
  const [language, setLanguage] = useState<'en' | 'ru'>(() => {
    return (localStorage.getItem('vibe_lang') as 'en' | 'ru') || 'en';
  });

  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('vibe_currency') as CurrencyCode) || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('vibe_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('vibe_currency', currency);
  }, [currency]);

  return { language, setLanguage, currency, setCurrency };
}
