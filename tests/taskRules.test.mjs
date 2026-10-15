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
