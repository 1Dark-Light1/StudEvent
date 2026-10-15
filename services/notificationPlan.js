/**
 * Which reminders a task gets, when, and with what text (no Expo or Firebase here, so it is testable).
 *
 * Own task with a time:     30 min before the start, and "Did you complete it?" at the end
 *                           (it can still be marked for 30 minutes after that).
 * Own task without a time:  09:00 on its day, and "Did you complete it?" at 20:00.
 * Joined global event:      18:00 the day before, and 1 hour before the start (09:00 if it has no time).
 * Completed tasks get nothing; reminders in the past are skipped.
 */
import { parseDate, parseTime } from './taskRules.js';
import { formatDisplayDate, formatDisplayTime } from '../i18n/format.js';

const MINUTE = 60 * 1000;

function atTime(date, hours, minutes = 0) {
   const result = new Date(date);
   result.setHours(hours, minutes, 0, 0);
   return result;
}

/** "13:00 - 14:30" / "1:00 PM", or '' for a task without a time. */
function timeText(task, locale) {
   if (task.timeDilation && task.fromTime && task.toTime) return formatDisplayTime(`${task.fromTime}-${task.toTime}`, locale);
   return task.time ? formatDisplayTime(task.time, locale) : '';
}

/** Start and end of a timed task (an hour from `time` when there is no range), or null. */
function taskWindow(task, day) {
   if (task.timeDilation && task.fromTime && task.toTime) {
      return { start: parseTime(task.fromTime, day), end: parseTime(task.toTime, day) };
   }
   if (task.time) {
      const start = parseTime(task.time, day);
      return { start, end: new Date(start.getTime() + 60 * MINUTE) };
   }
   return null;
}

/**
 * @param task      Firestore task (with id)
 * @param t         translator (key, vars) => string
 * @param locale    app language, for date/time formatting
 * @returns [{ id, type, at: Date, title, body }]
 */
export function planTaskNotifications(task, { t, locale, now = new Date() }) {
   if (!task?.date) return [];
   const day = parseDate(task.date);
   const window = taskWindow(task, day);
   const time = timeText(task, locale);
   const name = task.name;
   const details = [time, task.description].filter(Boolean).join(' · ');
   const plan = [];

   if (task.isGlobal) {
      const dayBefore = atTime(day, 18);
      dayBefore.setDate(dayBefore.getDate() - 1);
      plan.push({
         id: 'day_before',
         type: 'global_reminder_1d',
         at: dayBefore,
         title: t('notify.eventTomorrow', { name }),
         body: details || t('notify.eventTomorrowBody'),
      });
      plan.push({
         id: 'soon',
         type: 'global_reminder_1h',
         at: window ? new Date(window.start.getTime() - 60 * MINUTE) : atTime(day, 9),
         title: window ? t('notify.eventSoon', { name }) : t('notify.eventToday', { name }),
         body: details || t('notify.eventTodayBody'),
      });
   } else {
      if (task.isCompleted || task.isUncompleted) return [];
      plan.push({
         id: 'reminder',
         type: 'user_reminder',
         at: window ? new Date(window.start.getTime() - 30 * MINUTE) : atTime(day, 9),
         title: window ? t('notify.taskSoon', { name }) : t('notify.taskToday', { name }),
         body: details || t('notify.taskTodayBody'),
      });
      plan.push({
         id: 'check',
         type: 'user_check',
         at: window ? window.end : atTime(day, 20),
         title: t('notify.check', { name }),
         body: window ? t('notify.checkBody') : t('notify.checkTodayBody'),
      });
   }

   return plan.filter((item) => item.at > now);
}

/** "New event" notice for users who have not joined yet. */
export function newEventNotification(task, { t, locale }) {
   const time = timeText(task, locale);
   const when = [formatDisplayDate(task.date, locale), time].filter(Boolean).join(', ');
   return {
      title: t('notify.newEvent', { name: task.name }),
      body: t('notify.newEventBody', { when }),
   };
}
