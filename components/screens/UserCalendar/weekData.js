/** Week strip data for the personal calendar. */

/**
 * Генерирует массив дней недели начиная с понедельника недели с учётом смещения
 */
export function generateWeekDays(t, weekOffset = 0) {
   const today = new Date();
   // Смещаем базовую дату на нужное количество недель
   today.setDate(today.getDate() + weekOffset * 7);
   const currentDay = today.getDay();
   // Понедельник = 1, воскресенье = 0
   const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
   const monday = new Date(today);
   monday.setDate(today.getDate() + mondayOffset);

   const days = [];
   const dayLabels = [t('date.mon'), t('date.tue'), t('date.wed'), t('date.thu'), t('date.fri'), t('date.sat'), t('date.sun')];
   
   for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const dateString = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
      
      days.push({
         label: dayLabels[i],
         date: String(day),
         dateString: dateString,
         fullDate: date,
      });
   }
   
   return days;
}

/**
 * Обчислює weekOffset для заданої дати
 */
export function calculateWeekOffset(targetDateString) {
   const [day, month, year] = targetDateString.split('.');
   const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
   
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   targetDate.setHours(0, 0, 0, 0);
   
   // Знаходимо понеділок поточного тижня
   const currentDay = today.getDay();
   const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
   const currentMonday = new Date(today);
   currentMonday.setDate(today.getDate() + mondayOffset);
   
   // Знаходимо понеділок тижня з цільовою датою
   const targetDay = targetDate.getDay();
   const targetMondayOffset = targetDay === 0 ? -6 : 1 - targetDay;
   const targetMonday = new Date(targetDate);
   targetMonday.setDate(targetDate.getDate() + targetMondayOffset);
   
   // Обчислюємо різницю в тижнях
   const diffInMs = targetMonday.getTime() - currentMonday.getTime();
   const diffInWeeks = Math.round(diffInMs / (7 * 24 * 60 * 60 * 1000));
   
   return diffInWeeks;
}
