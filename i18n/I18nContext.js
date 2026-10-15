import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LOCALE, translations } from './translations';
import { formatDisplayDate, formatDisplayTime } from './format';

const STORAGE_KEY = 'studevent.locale';

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: async (_next) => {},
  t: (key) => key,
  isReady: false,
});

function resolveString(locale, key, vars) {
  const table = translations?.[locale] || {};
  const fallback = translations?.[DEFAULT_LOCALE] || {};
  const text = table[key] ?? fallback[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : text;
}

/** Translator for code outside React components (e.g. services), using the saved locale. */
export async function getTranslator() {
  let locale = DEFAULT_LOCALE;
  try {
    locale = (await AsyncStorage.getItem(STORAGE_KEY)) || DEFAULT_LOCALE;
  } catch {
    // fall back to the default locale
  }
  return (key, vars) => resolveString(locale, key, vars);
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
    (key, vars) => resolveString(locale, key, vars),
    [locale]
  );

  // Built-in tags are stored in English; show them translated, custom tags as typed
  const tagLabel = useCallback(
    (tag) => {
      if (!tag) return tag;
      const key = `filter.tag.${tag.toLowerCase()}`;
      const label = resolveString(locale, key);
      return label === key ? tag : label;
    },
    [locale]
  );

  // App and Firebase errors have a code (e.g. 'admin-only', 'auth/invalid-credential');
  // show its translation, or the fallback for unknown errors
  const errorText = useCallback(
    (error, fallbackKey) => {
      const key = `errors.${error?.code}`;
      const text = resolveString(locale, key);
      return text === key ? resolveString(locale, fallbackKey) : text;
    },
    [locale]
  );

  const displayDate = useCallback((value) => formatDisplayDate(value, locale), [locale]);
  const displayTime = useCallback((value) => formatDisplayTime(value, locale), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, tagLabel, errorText, displayDate, displayTime, isReady }),
    [locale, setLocale, t, tagLabel, errorText, displayDate, displayTime, isReady]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}



