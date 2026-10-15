/** Month grid and agenda data for the Home screen. */
import { isTaskActive } from '../../../services/taskRules';

/**
 * Builds a 7-column grid that includes leading/trailing muted days so layout never shifts.
 */
function buildCalendar({ year, month, tasks = [], todayHighlightColor = '#d9ecff' }) {
   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);
   const daysInMonth = lastDay.getDate();
   const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник = 0
   const prevMonthDays = new Date(year, month, 0).getDate();

   // Группируем задачи по дням
   const tasksByDay = {};
   tasks.forEach(task => {
      const [day, monthStr, yearStr] = task.date.split('.');
      const taskMonth = parseInt(monthStr, 10) - 1;
      const taskYear = parseInt(yearStr, 10);

      if (taskMonth === month && taskYear === year) {
         const dayNum = parseInt(day, 10);
         if (!tasksByDay[dayNum]) {
            tasksByDay[dayNum] = [];
         }
         tasksByDay[dayNum].push(task);
      }
   });

   const grid = [];
   // Дни предыдущего месяца
   for (let i = startOffset; i > 0; i -= 1) {
      grid.push({ label: String(prevMonthDays - i + 1), muted: true });
   }

   // Перевіряємо, чи поточний день є сьогоднішнім
   const today = new Date();
   const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
   const todayDay = today.getDate();

   // Дни текущего месяца
   for (let day = 1; day <= daysInMonth; day += 1) {
      const entry = { label: String(day) };
      const dayTasks = tasksByDay[day] || [];
      const isToday = isCurrentMonth && day === todayDay;

      // Highlight current day with light blue color
      if (isToday) {
         entry.todayHighlight = todayHighlightColor;
      }

      if (dayTasks.length > 0) {
         // Выделяем день с задачами
         const hasActiveTask = dayTasks.some(task => isTaskActive(task));
         const hasGlobalTask = dayTasks.some(task => task.isGlobal === true);
         
         if (hasActiveTask) {
            // Якщо це сьогодні, зберігаємо легко синій фон і додаємо обводку
            if (isToday) {
               entry.todayHighlight = todayHighlightColor;
               entry.outline = dayTasks[0].taskColor || '#d7c5ff';
            } else {
               entry.highlight = todayHighlightColor;
            }
         } else if (hasGlobalTask) {
            // Для глобальных задач - заполненный кружок
            const globalTask = dayTasks.find(task => task.isGlobal === true);
            if (isToday) {
               // Якщо це сьогодні, легко синій фон з обводкою кольору тага
               entry.todayHighlight = todayHighlightColor;
               entry.outline = globalTask.taskColor || '#2f6cff';
            } else {
               entry.filled = globalTask.taskColor || '#2f6cff';
            }
         } else {
            // Используем цвет первой задачи для outline
            if (isToday) {
               // Якщо це сьогодні, легко синій фон з обводкою
               entry.todayHighlight = todayHighlightColor;
               entry.outline = dayTasks[0].taskColor || '#d7c5ff';
            } else {
               entry.outline = dayTasks[0].taskColor || '#d7c5ff';
            }
         }
      }

      grid.push(entry);
   }

   // Дни следующего месяца - заполняем до 35 ячеек (5 недель по 7 дней)
   let next = 1;
   while (grid.length < 35) {
      grid.push({ label: String(next), muted: true });
      next += 1;
   }

   return grid;
}

/**
 * Форматирует задачи для отображения в agenda
 */
function formatTasksForAgenda(tasks, year, month) {
   const tasksByDay = {};

   tasks.forEach(task => {
      const [day, monthStr, yearStr] = task.date.split('.');
      const taskMonth = parseInt(monthStr, 10) - 1;
      const taskYear = parseInt(yearStr, 10);

      if (taskMonth === month && taskYear === year) {
         const dayNum = parseInt(day, 10);
         const date = new Date(taskYear, taskMonth, dayNum);
         const dayKey = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' }).toUpperCase();

         if (!tasksByDay[dayKey]) {
            tasksByDay[dayKey] = [];
         }

         let timeDisplay = '';
         if (task.timeDilation && task.fromTime && task.toTime) {
            timeDisplay = `${task.fromTime}-${task.toTime}`;
         } else if (task.time) {
            timeDisplay = task.time;
         }

         tasksByDay[dayKey].push({
            id: task.id,
            time: timeDisplay,
            title: task.name,
            subtitle: task.description,
            color: task.taskColor || '#8dddbd',
            isGlobal: task.isGlobal || false,
            participants: task.participants || [],
         });
      }
   });

   // Сортируем дни и задачи внутри дней
   const sortedDays = Object.keys(tasksByDay).sort((a, b) => {
      const dayA = parseInt(a.split(' ')[1]);
      const dayB = parseInt(b.split(' ')[1]);
      return dayA - dayB;
   });

   return sortedDays.map(day => ({
      day: day,
      items: tasksByDay[day].sort((a, b) => {
         if (!a.time) return 1;
         if (!b.time) return -1;
         return a.time.localeCompare(b.time);
      }),
   }));
}

/**
 * Генерирует данные для месяца
 */
export function getMonthData(year, month, tasks, t, todayHighlightColor = '#d9ecff') {
   const monthNames = [
      t('date.january'), t('date.february'), t('date.march'), t('date.april'), t('date.may'), t('date.june'),
      t('date.july'), t('date.august'), t('date.september'), t('date.october'), t('date.november'), t('date.december')
   ];

   return {
      name: monthNames[month],
      year: String(year),
      month: month,
      yearNum: year,
      calendar: buildCalendar({ year, month, tasks, todayHighlightColor }),
      agenda: formatTasksForAgenda(tasks, year, month),
   };
}
