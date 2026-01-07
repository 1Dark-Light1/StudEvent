import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LOCALE, translations } from './translations';

const STORAGE_KEY = 'studevent.locale';

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: async (_next) => {},
  t: (key) => key,
  isReady: false,
});

function resolveString(locale, key) {
  const table = translations?.[locale] || {};
  const fallback = translations?.[DEFAULT_LOCALE] || {};
  return table[key] ?? fallback[key] ?? key;
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && saved) setLocaleState(saved);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale) => {
    if (!nextLocale) return;
    setLocaleState(nextLocale);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // storage failures shouldn't block UI language changes
    }
  }, []);

  const t = useCallback(
    (key) => resolveString(locale, key),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, isReady }),
    [locale, setLocale, t, isReady]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}


