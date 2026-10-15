/**
 * Locale-aware date and time display, using the platform Intl.
 * Ukrainian and Polish get a 24-hour clock and genitive month names ("15 жовтня 2026").
 */
import { parseDate, parseTime } from '../services/taskRules.js';

const INTL_LOCALES = { en: 'en-US', uk: 'uk-UA', pl: 'pl-PL' };
const intlLocale = (locale) => INTL_LOCALES[locale] || INTL_LOCALES.en;

/** Date object or 'DD.MM.YYYY' -> "October 15, 2026" / "15 жовтня 2026 р." */
export function formatDisplayDate(value, locale) {
   const date = typeof value === 'string' ? parseDate(value) : new Date(value);
   return date.toLocaleDateString(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Date object, 'HH:MM' or 'HH:MM-HH:MM' -> "1:05 PM" / "13:05" (ranges joined with " - ") */
export function formatDisplayTime(value, locale) {
   if (!value) return '';
   const format = (date) => date.toLocaleTimeString(intlLocale(locale), { hour: 'numeric', minute: '2-digit' });
   if (typeof value !== 'string') return format(new Date(value));
   return value
      .split('-')
      .map((part) => format(parseTime(part.trim(), new Date())))
      .join(' - ');
}
