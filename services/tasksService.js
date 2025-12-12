import {
   collection,
   addDoc,
   query,
   where,
   getDocs,
   Timestamp,
   onSnapshot,
} from 'firebase/firestore';
import { db } from '../FireBaseConfig';
import { auth } from '../FireBaseConfig';

/**
 * Преобразует дату в формате DD.MM.YYYY в объект Date
 */
function parseDate(dateString) {
   const [day, month, year] = dateString.split('.');
   return new Date(year, month - 1, day);
}

/**
 * Преобразует время в формате HH:MM в объект Date с указанной датой
 */
function parseTime(timeString, date) {
   const [hours, minutes] = timeString.split(':');
   const result = new Date(date);
   result.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
   return result;
}

/**
 * Проверяет, идет ли задача сейчас
 */
export function isTaskActive(task) {
   const now = new Date();
   const taskDate = parseDate(task.date);
   
   // Проверяем, что задача на сегодня
   const today = new Date();
   const isToday = taskDate.getDate() === today.getDate() &&
                   taskDate.getMonth() === today.getMonth() &&
                   taskDate.getFullYear() === today.getFullYear();
   
   if (!isToday) {
      return false;
   }
   
   if (task.timeDilation && task.fromTime && task.toTime) {
      const fromTime = parseTime(task.fromTime, taskDate);
      const toTime = parseTime(task.toTime, taskDate);
      return now >= fromTime && now <= toTime;
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      // Считаем задачу активной в течение часа после начала
      const oneHourLater = new Date(taskTime);
      oneHourLater.setHours(oneHourLater.getHours() + 1);
      return now >= taskTime && now <= oneHourLater;
   }
   
   return false;
}

/**
 * Генерирует даты для Weekly frequency до конца месяца
 */
function generateWeeklyDates(startDateString) {
   const startDate = parseDate(startDateString);
   const [day, month, year] = startDateString.split('.');
   const startMonth = parseInt(month, 10) - 1;
   const startYear = parseInt(year, 10);
   
   // Получаем последний день месяца
   const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
   const dates = [];
   
   // Добавляем начальную дату
   dates.push(startDateString);
   
   // Добавляем каждую неделю до конца месяца
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
 * Добавляет новую задачу в Firestore
 */
export async function addTask(taskData) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const datesToAdd = [];
      
      if (taskData.frequency === 'weekly') {
         // Генерируем даты для Weekly
         datesToAdd.push(...generateWeeklyDates(taskData.date));
      } else if (taskData.frequency === 'custom' && taskData.customDates && taskData.customDates.length > 0) {
         // Используем кастомные даты
         datesToAdd.push(...taskData.customDates);
      } else {
         // Одна дата для 'once'
         datesToAdd.push(taskData.date);
      }

      const createdIds = [];
      
      // Создаем задачу для каждой даты
      for (const dateString of datesToAdd) {
         const taskDate = parseDate(dateString);
         const taskDoc = {
            userId: user.uid,
            name: taskData.name,
            description: taskData.description,
            date: dateString,
            dateTimestamp: Timestamp.fromDate(taskDate),
            time: taskData.time || null,
            timeDilation: taskData.timeDilation || false,
            fromTime: taskData.fromTime || null,
            toTime: taskData.toTime || null,
            tagText: taskData.tagText,
            taskColor: taskData.taskColor || '#4CAF50',
            frequency: taskData.frequency || 'once',
            createdAt: Timestamp.now(),
         };

         const docRef = await addDoc(collection(db, 'tasks'), taskDoc);
         createdIds.push(docRef.id);
      }

      return createdIds;
   } catch (error) {
      console.error('Error adding task:', error);
      throw error;
   }
}

/**
 * Получает все задачи пользователя
 */
export async function getUserTasks() {
   try {
      const user = auth.currentUser;
      if (!user) {
         return [];
      }

      const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));

      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
      }));

      // Сортируем по времени на клиенте
      return tasks.sort((a, b) => {
         // Сначала по дате
         const dateA = a.dateTimestamp?.toMillis() || 0;
         const dateB = b.dateTimestamp?.toMillis() || 0;
         if (dateA !== dateB) {
            return dateA - dateB;
         }
         // Затем по времени
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });
   } catch (error) {
      console.error('Error getting user tasks:', error);
      return [];
   }
}

/**
 * Получает задачи пользователя по дате
 */
export async function getTasksByDate(dateString) {
   try {
      const user = auth.currentUser;
      if (!user) {
         return [];
      }

      const q = query(
         collection(db, 'tasks'),
         where('userId', '==', user.uid),
         where('date', '==', dateString)
      );

      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
      }));

      // Сортируем по времени
      return tasks.sort((a, b) => {
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });
   } catch (error) {
      console.error('Error getting tasks by date:', error);
      return [];
   }
}

/**
 * Подписывается на изменения задач пользователя в реальном времени
 */
export function subscribeToUserTasks(callback) {
   const user = auth.currentUser;
   if (!user) {
      callback([]);
      return () => {};
   }

   const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));

   return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map((doc) => ({
         id: doc.id,
         ...doc.data(),
      })).sort((a, b) => {
         const dateA = a.dateTimestamp?.toMillis?.() || 0;
         const dateB = b.dateTimestamp?.toMillis?.() || 0;
         if (dateA !== dateB) return dateA - dateB;
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });
      callback(tasks);
   }, (error) => {
      console.error('Error subscribing to tasks:', error);
      callback([]);
   });
}

/**
 * Подписывается на изменения задач по дате в реальном времени
 */
export function subscribeToTasksByDate(dateString, callback) {
   const user = auth.currentUser;
   if (!user) {
      callback([]);
      return () => {};
   }

   const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      where('date', '==', dateString)
   );

   return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
      }));

      // Сортируем по времени
      const sortedTasks = tasks.sort((a, b) => {
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });

      callback(sortedTasks);
   }, (error) => {
      console.error('Error subscribing to tasks by date:', error);
      callback([]);
   });
}

/**
 * Форматирует задачу для отображения в календаре
 */
export function formatTaskForCalendar(task) {
   const isActive = isTaskActive(task);
   
   let timeDisplay = '';
   if (task.timeDilation && task.fromTime && task.toTime) {
      timeDisplay = `${task.fromTime}-${task.toTime}`;
   } else if (task.time) {
      timeDisplay = task.time;
   }

   return {
      id: task.id,
      time: timeDisplay,
      title: task.name,
      subtitle: task.description,
      tone: isActive ? 'highlight' : 'frost',
      color: task.taskColor,
      tagText: task.tagText,
   };
}
