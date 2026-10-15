/**
 * Pure task and date rules (no Firebase), shared by services and screens.
 * Dates are 'DD.MM.YYYY' strings and times are 'HH:MM', as stored in Firestore.
 */

/**
 * Converts a date in DD.MM.YYYY format to a Date object
 */
export function parseDate(dateString) {
   const [day, month, year] = dateString.split('.');
   return new Date(year, month - 1, day);
}

/**
 * Converts time in HH:MM format to a Date object with the specified date
 */
export function parseTime(timeString, date) {
   const [hours, minutes] = timeString.split(':');
   const result = new Date(date);
   result.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
   return result;
}

/**
 * Checks if the task is currently active
 */
export function isTaskActive(task) {
   const now = new Date();
   const taskDate = parseDate(task.date);
   
   // Check that the task is for today
   const today = new Date();
   const isToday = taskDate.getDate() === today.getDate() &&
                   taskDate.getMonth() === today.getMonth() &&
                   taskDate.getFullYear() === today.getFullYear();
   
   if (!isToday) {
      return false;
   }
   
   const window = getTaskWindow(task, taskDate);
   return !!window && now >= window.start && now <= window.end;
}

/**
 * Generates dates for Weekly frequency until the end of the month
 */
export function generateWeeklyDates(startDateString) {
   const startDate = parseDate(startDateString);
   const [, month, year] = startDateString.split('.');
   const startMonth = parseInt(month, 10) - 1;
   const startYear = parseInt(year, 10);
   
   const dates = [];
   
   // Add the start date
   dates.push(startDateString);
   
   // Add each week until the end of the month
   let currentDate = new Date(startDate);
   currentDate.setDate(currentDate.getDate() + 7);
   
   while (currentDate.getMonth() === startMonth && currentDate.getFullYear() === startYear) {
      const day = String(currentDate.getDate()).padStart(2, '0');
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const year = currentDate.getFullYear();
      dates.push(`${day}.${month}.${year}`);
      currentDate.setDate(currentDate.getDate() + 7);
   }
   
   return dates;
}

/**
 * Filters tasks by search query (title or description)
 */
export function filterTasksBySearch(tasks, searchQuery) {
   if (!searchQuery || searchQuery.trim() === '') {
      return tasks;
   }

   const query = searchQuery.toLowerCase().trim();
   return tasks.filter(task => {
      const name = task.name?.toLowerCase() || '';
      const description = task.description?.toLowerCase() || '';
      return name.includes(query) || description.includes(query);
   });
}

/**
 * Filters tasks by selected tags
 */
export function filterTasksByTags(tasks, selectedTags) {
   if (!selectedTags || selectedTags.length === 0) {
      return tasks;
   }

   return tasks.filter(task => {
      const taskTag = task.tagText || '';
      return selectedTags.includes(taskTag);
   });
}

/**
 * Applies all filters to tasks
 */
export function applyTaskFilters(tasks, searchQuery, selectedTags) {
   let filteredTasks = tasks;

   // Apply search
   if (searchQuery && searchQuery.trim() !== '') {
      filteredTasks = filterTasksBySearch(filteredTasks, searchQuery);
   }

   // Apply filters by tags
   if (selectedTags && selectedTags.length > 0) {
      filteredTasks = filterTasksByTags(filteredTasks, selectedTags);
   }

   return filteredTasks;
}

/** Task day in ms: dateTimestamp, or the date string for tasks saved without it. */
export function taskDateMillis(task) {
   if (task.dateTimestamp?.toMillis) return task.dateTimestamp.toMillis();
   return task.date ? parseDate(task.date).getTime() : 0;
}

/** Orders tasks by day, then by start time; tasks without a time go last. */
export function compareTasksByDateTime(a, b) {
   const dayDiff = taskDateMillis(a) - taskDateMillis(b);
   if (dayDiff !== 0) return dayDiff;
   const timeA = a.timeDilation ? a.fromTime : a.time;
   const timeB = b.timeDilation ? b.fromTime : b.time;
   if (!timeA || !timeB) return (timeA ? 0 : 1) - (timeB ? 0 : 1);
   return timeA.localeCompare(timeB);
}

/** Orders 'DD.MM.YYYY' strings chronologically. */
export function compareDateStrings(a, b) {
   return parseDate(a) - parseDate(b);
}

/** True if the task's day is after today. */
function isFutureDay(taskDate) {
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const day = new Date(taskDate);
   day.setHours(0, 0, 0, 0);
   return day > today;
}

/**
 * Start and end of a timed task: a from-to range, or one hour from `time`.
 * Returns null for tasks without a time.
 */
function getTaskWindow(task, taskDate) {
   if (task.timeDilation && task.fromTime && task.toTime) {
      return { start: parseTime(task.fromTime, taskDate), end: parseTime(task.toTime, taskDate) };
   }
   if (task.time) {
      const start = parseTime(task.time, taskDate);
      return { start, end: new Date(start.getTime() + 60 * 60 * 1000) };
   }
   return null;
}

/** A task stays open for 30 minutes after it ends. */
function getDeadline(window) {
   return new Date(window.end.getTime() + 30 * 60 * 1000);
}

/**
 * Checks if task can be marked as completed
 * Can be marked from start of execution to 30 minutes after end
 */
export function canMarkTaskAsCompleted(task) {
   const now = new Date();
   const taskDate = parseDate(task.date);

   if (isFutureDay(taskDate)) {
      return { canMark: false, reason: 'future' };
   }

   const window = getTaskWindow(task, taskDate);
   // If no time, can be marked any moment on task day or later
   if (!window) return { canMark: true };

   if (now < window.start) {
      return { canMark: false, reason: 'too_early', timeLeft: window.start - now };
   }
   if (now > getDeadline(window)) {
      return { canMark: false, reason: 'expired' };
   }
   return { canMark: true };
}

/**
 * Whether an unfinished task should be marked as uncompleted:
 * 30 minutes after its end, or at the end of its day if it has no time
 */
export function shouldMarkTaskAsUncompleted(task, now) {
   const taskDate = parseDate(task.date);
   if (isFutureDay(taskDate)) return false;

   const window = getTaskWindow(task, taskDate);
   if (!window) {
      const endOfDay = new Date(taskDate);
      endOfDay.setHours(23, 59, 59, 999);
      return now > endOfDay;
   }
   return now > getDeadline(window);
}

/**
 * Whether a global event can still be joined: until 30 minutes after its end
 */
export function canJoinEvent(task) {
   const taskDate = parseDate(task.date);
   if (isFutureDay(taskDate)) return { canJoin: true };

   const window = getTaskWindow(task, taskDate);
   // Without a time it can be joined any time on its day
   if (!window) return { canJoin: true };

   if (new Date() > getDeadline(window)) {
      return { canJoin: false, reason: 'expired' };
   }
   return { canJoin: true };
}
