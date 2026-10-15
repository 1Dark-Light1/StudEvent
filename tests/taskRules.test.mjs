// Task and date rules. Run with: npm test
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
   parseDate,
   parseTime,
   isTaskActive,
   generateWeeklyDates,
   applyTaskFilters,
   canMarkTaskAsCompleted,
   shouldMarkTaskAsUncompleted,
   canJoinEvent,
   compareTasksByDateTime,
   compareDateStrings,
   isValidTime,
   isValidDateString,
} from '../services/taskRules.js';

// "Now" is Thursday 15.10.2026 12:00 local time in every test
const NOW = new Date(2026, 9, 15, 12, 0);
beforeEach(() => mock.timers.enable({ apis: ['Date'], now: NOW }));
afterEach(() => mock.timers.reset());

const today = '15.10.2026';

test('parses dates and times', () => {
   assert.deepEqual(parseDate('15.10.2026'), new Date(2026, 9, 15));
   assert.deepEqual(parseTime('09:05', parseDate(today)), new Date(2026, 9, 15, 9, 5));
});

test('weekly tasks repeat until the end of the month', () => {
   assert.deepEqual(generateWeeklyDates('01.10.2026'), ['01.10.2026', '08.10.2026', '15.10.2026', '22.10.2026', '29.10.2026']);
   assert.deepEqual(generateWeeklyDates('30.10.2026'), ['30.10.2026']);
});

test('filters by search text and tags', () => {
   const tasks = [
      { name: 'Gym', description: 'legs', tagText: 'Sport' },
      { name: 'Exam', description: 'math', tagText: 'Study' },
   ];
   assert.deepEqual(applyTaskFilters(tasks, 'LEG', []).map(t => t.name), ['Gym']);
   assert.deepEqual(applyTaskFilters(tasks, '', ['Study']).map(t => t.name), ['Exam']);
   assert.deepEqual(applyTaskFilters(tasks, '  ', []), tasks);
});

test('a task is active from its start for one hour, or within its range', () => {
   assert.equal(isTaskActive({ date: today, time: '11:30' }), true);
   assert.equal(isTaskActive({ date: today, time: '10:00' }), false);
   assert.equal(isTaskActive({ date: today, timeDilation: true, fromTime: '11:00', toTime: '13:00' }), true);
   assert.equal(isTaskActive({ date: '16.10.2026', time: '12:00' }), false);
});

test('a task can be marked from its start until 30 minutes after its end', () => {
   assert.deepEqual(canMarkTaskAsCompleted({ date: '16.10.2026', time: '10:00' }), { canMark: false, reason: 'future' });
   assert.equal(canMarkTaskAsCompleted({ date: today, time: '11:30' }).canMark, true);
   assert.equal(canMarkTaskAsCompleted({ date: today, time: '13:00' }).reason, 'too_early');
   // 10:00 + 1h + 30min = 11:30 < 12:00
   assert.equal(canMarkTaskAsCompleted({ date: today, time: '10:00' }).reason, 'expired');
   // range ends 11:45, deadline 12:15
   assert.equal(canMarkTaskAsCompleted({ date: today, timeDilation: true, fromTime: '09:00', toTime: '11:45' }).canMark, true);
   assert.equal(canMarkTaskAsCompleted({ date: today }).canMark, true);
});

test('unfinished tasks become uncompleted 30 minutes after their end', () => {
   const now = new Date(NOW);
   assert.equal(shouldMarkTaskAsUncompleted({ date: today, time: '10:00' }, now), true);
   assert.equal(shouldMarkTaskAsUncompleted({ date: today, time: '11:00' }, now), false);
   assert.equal(shouldMarkTaskAsUncompleted({ date: '14.10.2026' }, now), true);
   assert.equal(shouldMarkTaskAsUncompleted({ date: today }, now), false);
   assert.equal(shouldMarkTaskAsUncompleted({ date: '16.10.2026', time: '01:00' }, now), false);
});

test('global events can be joined until 30 minutes after their end', () => {
   assert.equal(canJoinEvent({ date: '20.10.2026', time: '10:00' }).canJoin, true);
   assert.equal(canJoinEvent({ date: today, time: '11:00' }).canJoin, true);
   assert.deepEqual(canJoinEvent({ date: today, time: '08:00' }), { canJoin: false, reason: 'expired' });
   assert.equal(canJoinEvent({ date: today }).canJoin, true);
});

test('tasks sort by day then start time, also without dateTimestamp', () => {
   const ts = (d) => ({ toMillis: () => parseDate(d).getTime() });
   const tasks = [
      { id: 'no-time', date: '15.10.2026' },
      { id: 'old-format', date: '01.11.2026', time: '09:00' },
      { id: 'late', date: '15.10.2026', dateTimestamp: ts('15.10.2026'), time: '18:00' },
      { id: 'range', date: '15.10.2026', dateTimestamp: ts('15.10.2026'), timeDilation: true, fromTime: '08:00', toTime: '09:00' },
      { id: 'earlier-day', date: '10.10.2026', dateTimestamp: ts('10.10.2026'), time: '23:00' },
   ];
   assert.deepEqual([...tasks].sort(compareTasksByDateTime).map(t => t.id), ['earlier-day', 'range', 'late', 'no-time', 'old-format']);
});

test('date strings sort chronologically, not alphabetically', () => {
   assert.deepEqual(['10.10.2026', '05.11.2026', '01.01.2027', '09.10.2026'].sort(compareDateStrings), ['09.10.2026', '10.10.2026', '05.11.2026', '01.01.2027']);
});

test('dates and times are shown in the app language', async () => {
   const { formatDisplayDate, formatDisplayTime } = await import('../i18n/format.js');
   assert.equal(formatDisplayDate('15.10.2026', 'en'), 'October 15, 2026');
   assert.match(formatDisplayDate('15.10.2026', 'uk'), /^15 жовтня 2026/);
   assert.equal(formatDisplayDate('15.10.2026', 'pl'), '15 października 2026');
   assert.equal(formatDisplayTime('13:05', 'en'), '1:05 PM');
   assert.equal(formatDisplayTime('13:00-14:30', 'pl'), '13:00 - 14:30');
   assert.equal(formatDisplayTime('', 'uk'), '');
});

test('time and date inputs are validated', () => {
   for (const ok of ['00:00', '09:05', '23:59']) assert.equal(isValidTime(ok), true, ok);
   for (const bad of ['9', '9:05', '24:00', '12:60', '', undefined]) assert.equal(isValidTime(bad), false, String(bad));
   for (const ok of ['15.10.2026', '29.02.2028']) assert.equal(isValidDateString(ok), true, ok);
   for (const bad of ['31.02.2026', '29.02.2027', '15/10/2026', '1.1.2026', 'abc', '']) assert.equal(isValidDateString(bad), false, bad);
});
