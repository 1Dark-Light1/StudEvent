import {
   collection,
   addDoc,
   query,
   where,
   getDocs,
   Timestamp,
   onSnapshot,
   doc,
   deleteDoc,
   updateDoc,
   arrayUnion,
   arrayRemove,
   getDoc,
   writeBatch,
   deleteField,
} from 'firebase/firestore';
import { db } from '../FireBaseConfig';
import { auth } from '../FireBaseConfig';
import {
   scheduleUserTaskNotifications,
   scheduleGlobalTaskCreatedNotification,
   scheduleGlobalTaskJoinedNotifications,
   cancelTaskNotifications,
   updateTaskNotifications,
} from './notificationsService';

/**
 * Проверяет, является ли текущий пользователь админом
 */
export function isAdmin() {
   const user = auth.currentUser;
   if (!user) return false;
   // Проверяем по email
   return user.email === 'admin@gmail.com';
}

/**
 * Преобразует дату в формате DD.MM.YYYY в объект Date
 */
export function parseDate(dateString) {
   const [day, month, year] = dateString.split('.');
   return new Date(year, month - 1, day);
}

/**
 * Преобразует время в формате HH:MM в объект Date с указанной датой
 */
export function parseTime(timeString, date) {
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
      
      // Проверяем, является ли пользователь админом
      const admin = isAdmin();
      
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
            ...(admin && { isGlobal: true, participants: [] }), // Для админа добавляем isGlobal и participants
         };

         const docRef = await addDoc(collection(db, 'tasks'), taskDoc);
         createdIds.push(docRef.id);
         
         // Плануємо повідомлення
         const createdTask = { id: docRef.id, ...taskDoc };
         if (admin) {
            // Для глобальних задач - повідомлення про створення для всіх
            scheduleGlobalTaskCreatedNotification(createdTask).catch(err => 
               console.error('Error scheduling global task notification:', err)
            );
         } else {
            // Для звичайних задач - нагадування користувача
            scheduleUserTaskNotifications(createdTask).catch(err => 
               console.error('Error scheduling user task notification:', err)
            );
         }
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
 * Включает собственные задачи пользователя и глобальные задачи админа
 */
export function subscribeToUserTasks(callback) {
   const user = auth.currentUser;
   if (!user) {
      callback([]);
      return () => {};
   }

   // Подписываемся на свои задачи и глобальные задачи
   const userTasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid));
   const globalTasksQuery = query(collection(db, 'tasks'), where('isGlobal', '==', true));

   let userTasksUnsubscribe;
   let globalTasksUnsubscribe;
   let userTasks = [];
   let globalTasks = [];
   let userTasksLoaded = false;
   let globalTasksLoaded = false;

   const mergeAndSortTasks = async () => {
      // Объединяем задачи и убираем дубликаты
      const allTasks = [...userTasks];
      globalTasks.forEach(globalTask => {
         // Не добавляем, если это уже есть в своих задачах
         if (!allTasks.find(t => t.id === globalTask.id)) {
            allTasks.push(globalTask);
         }
      });

      // Сортируем
      const sorted = allTasks.sort((a, b) => {
         const dateA = a.dateTimestamp?.toMillis?.() || 0;
         const dateB = b.dateTimestamp?.toMillis?.() || 0;
         if (dateA !== dateB) return dateA - dateB;
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });

      // Плануємо повідомлення для задач
      for (const task of sorted) {
         try {
            if (task.isGlobal) {
               // Для глобальних задач - перевіряємо, чи користувач приєднався
               const participants = task.participants || [];
               if (participants.includes(user.uid)) {
                  await scheduleGlobalTaskJoinedNotifications(task);
               }
            } else {
               // Для звичайних задач користувача
               await scheduleUserTaskNotifications(task);
            }
         } catch (error) {
            console.error('Error scheduling notifications for task:', task.id, error);
         }
      }

      // Викликаємо callback після того, як хоча б один з запитів завантажився
      // Це гарантує, що глобальні таски будуть показані навіть якщо своїх тасків немає
      if (userTasksLoaded || globalTasksLoaded) {
         callback(sorted);
      }
   };

   userTasksUnsubscribe = onSnapshot(userTasksQuery, (querySnapshot) => {
      userTasks = querySnapshot.docs.map((doc) => ({
         id: doc.id,
         ...doc.data(),
      }));
      userTasksLoaded = true;
      mergeAndSortTasks().catch(err => console.error('Error in mergeAndSortTasks:', err));
   }, (error) => {
      console.error('Error subscribing to user tasks:', error);
      userTasksLoaded = true; // Помечаем как загруженное даже при ошибке
      callback([]);
   });

   globalTasksUnsubscribe = onSnapshot(globalTasksQuery, (querySnapshot) => {
      globalTasks = querySnapshot.docs.map((doc) => ({
         id: doc.id,
         ...doc.data(),
      }));
      globalTasksLoaded = true;
      mergeAndSortTasks().catch(err => console.error('Error in mergeAndSortTasks:', err));
   }, (error) => {
      console.error('Error subscribing to global tasks:', error);
      globalTasksLoaded = true; // Помечаем как загруженное даже при ошибке
      mergeAndSortTasks().catch(err => console.error('Error in mergeAndSortTasks:', err)); // Все равно вызываем merge, чтобы показать хотя бы свои задачи
   });

   return () => {
      if (userTasksUnsubscribe) userTasksUnsubscribe();
      if (globalTasksUnsubscribe) globalTasksUnsubscribe();
   };
}

/**
 * Подписывается на изменения задач по дате в реальном времени
 * Включает собственные задачи пользователя и глобальные задачи админа,
 * до которых поточний користувач приєднався
 */
export function subscribeToTasksByDate(dateString, callback) {
   const user = auth.currentUser;
   if (!user) {
      callback([]);
      return () => {};
   }

   // Запрос для своих задач по дате
   const userTasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      where('date', '==', dateString)
   );

   // Запрос для глобальных задач по дате, к которым пользователь приєднався
   const globalTasksQuery = query(
      collection(db, 'tasks'),
      where('isGlobal', '==', true),
      where('date', '==', dateString),
      where('participants', 'array-contains', user.uid)
   );

   let userTasksUnsubscribe;
   let globalTasksUnsubscribe;
   let userTasks = [];
   let globalTasks = [];
   let userTasksLoaded = false;
   let globalTasksLoaded = false;

   const mergeAndSortTasks = () => {
      // Фільтруємо глобальні таски зі своїх задач (для адміна - його глобальні таски
      // повинні відображатись тільки якщо він приєднався, тобто вони будуть в globalTasks)
      const filteredUserTasks = userTasks.filter(task => {
         // Якщо це глобальна задача, виключаємо її зі своїх задач
         // Вона з'явиться тільки якщо користувач приєднався (через globalTasks)
         return !task.isGlobal;
      });
      
      // Объединяем задачи и убираем дубликаты
      const allTasks = [...filteredUserTasks];
      globalTasks.forEach(globalTask => {
         if (!allTasks.find(t => t.id === globalTask.id)) {
            allTasks.push(globalTask);
         }
      });

      // Сортируем по времени
      const sortedTasks = allTasks.sort((a, b) => {
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });

      // Викликаємо callback після того, як хоча б один з запитів завантажився
      // Це гарантує, що глобальні таски будуть показані навіть якщо своїх тасків немає
      if (userTasksLoaded || globalTasksLoaded) {
         callback(sortedTasks);
      }
   };

   userTasksUnsubscribe = onSnapshot(userTasksQuery, (querySnapshot) => {
      userTasks = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
      }));
      userTasksLoaded = true;
      mergeAndSortTasks();
   }, (error) => {
      console.error('Error subscribing to user tasks by date:', error);
      userTasksLoaded = true; // Помечаем как загруженное даже при ошибке
      callback([]);
   });

   globalTasksUnsubscribe = onSnapshot(globalTasksQuery, (querySnapshot) => {
      globalTasks = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
      }));
      globalTasksLoaded = true;
      mergeAndSortTasks();
   }, (error) => {
      console.error('Error subscribing to global tasks by date:', error);
      globalTasksLoaded = true; // Помечаем как загруженное даже при ошибке
      mergeAndSortTasks(); // Все равно вызываем merge, чтобы показать хотя бы свои задачи
   });

   return () => {
      if (userTasksUnsubscribe) userTasksUnsubscribe();
      if (globalTasksUnsubscribe) globalTasksUnsubscribe();
   };
}

/**
 * Форматирует задачу для отображения в календаре
 */
export function formatTaskForCalendar(task) {
   const isActive = isTaskActive(task);
   const isGlobal = task.isGlobal === true;
   
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
      isGlobal: isGlobal,
      participants: task.participants || [],
   };
}

/**
 * Фильтрует задачи по поисковому запросу (название или описание)
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
 * Фильтрует задачи по выбранным тегам
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
 * Применяет все фильтры к задачам
 */
export function applyTaskFilters(tasks, searchQuery, selectedTags) {
   let filteredTasks = tasks;

   // Применяем поиск
   if (searchQuery && searchQuery.trim() !== '') {
      filteredTasks = filterTasksBySearch(filteredTasks, searchQuery);
   }

   // Применяем фильтры по тегам
   if (selectedTags && selectedTags.length > 0) {
      filteredTasks = filterTasksByTags(filteredTasks, selectedTags);
   }

   return filteredTasks;
}

/**
 * Удаляет задачу по ID
 */
export async function deleteTask(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      // Видаляємо повідомлення перед видаленням задачі
      await cancelTaskNotifications(taskId);
      
      // Видаляємо повідомлення з Firestore
      const { deleteMessagesByTaskId } = await import('./messagesService');
      await deleteMessagesByTaskId(taskId).catch(err => 
         console.error('Error deleting messages for task:', err)
      );
      
      await deleteDoc(doc(db, 'tasks', taskId));
      return true;
   } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
   }
}

/**
 * Добавляет текущего пользователя к участникам события
 */
export async function joinEvent(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      
      // Получаем данные события
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
         throw new Error('Event not found');
      }

      const taskData = taskSnap.data();
      const participants = taskData.participants || [];
      
      // Проверяем, не присоединен ли уже пользователь
      if (participants.includes(user.uid)) {
         return { success: false, message: 'Już dołączyłeś do tego wydarzenia' };
      }

      // Добавляем пользователя в участники
      await updateDoc(taskRef, {
         participants: arrayUnion(user.uid)
      });
      
      // Для глобальных задач автоматически отмечаем как выполненную для этого пользователя
      if (taskData.isGlobal === true) {
         await updateDoc(taskRef, {
            [`userCompletions.${user.uid}`]: {
               isCompleted: true,
               completedAt: Timestamp.now(),
            }
         });
         
         // Плануємо повідомлення для приєднаного користувача
         const updatedTask = { id: taskId, ...taskData, participants: [...participants, user.uid] };
         scheduleGlobalTaskJoinedNotifications(updatedTask).catch(err => 
            console.error('Error scheduling joined notifications:', err)
         );
      }

      return { success: true, message: 'Pomyślnie dołączono do wydarzenia!' };
   } catch (error) {
      console.error('Error joining event:', error);
      throw error;
   }
}

/**
 * Удаляет текущего пользователя из участников события
 * Для глобальных задач: если время прошло - отмечает как невыполненную, иначе просто удаляет userCompletions
 */
export async function leaveEvent(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
         throw new Error('Event not found');
      }

      const taskData = taskSnap.data();
      const isTaskGlobal = taskData.isGlobal === true;
      
      // Удаляем пользователя из участников
      await updateDoc(taskRef, {
         participants: arrayRemove(user.uid)
      });

      // Видаляємо повідомлення для глобальних задач після від'єднання
      if (isTaskGlobal) {
         cancelTaskNotifications(taskId).catch(err => 
            console.error('Error canceling notifications:', err)
         );
      }

      // Для глобальных задач обрабатываем статус выполнения
      if (isTaskGlobal) {
         const now = new Date();
         const shouldMarkAsUncompleted = shouldMarkTaskAsUncompleted(taskData, now);
         
         if (shouldMarkAsUncompleted) {
            // Время прошло - отмечаем как невыполненную
            await updateDoc(taskRef, {
               [`userCompletions.${user.uid}`]: {
                  isCompleted: false,
                  isUncompleted: true,
                  uncompletedAt: Timestamp.now(),
               }
            });
         } else {
            // Время еще не прошло - просто удаляем userCompletions (задача пропадет из виконаних)
            await updateDoc(taskRef, {
               [`userCompletions.${user.uid}`]: deleteField()
            });
         }
      }

      return { success: true, message: 'Opuściłeś wydarzenie' };
   } catch (error) {
      console.error('Error leaving event:', error);
      throw error;
   }
}

/**
 * Проверяет, является ли текущий пользователь участником события
 */
export async function isUserJoined(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         return false;
      }

      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
         return false;
      }

      const taskData = taskSnap.data();
      const participants = taskData.participants || [];
      
      return participants.includes(user.uid);
   } catch (error) {
      console.error('Error checking if user joined:', error);
      return false;
   }
}

/**
 * Получает количество участников события
 */
export async function getParticipantsCount(taskId) {
   try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
         return 0;
      }

      const taskData = taskSnap.data();
      const participants = taskData.participants || [];
      
      return participants.length;
   } catch (error) {
      console.error('Error getting participants count:', error);
      return 0;
   }
}

/**
 * Обновляет существующую задачу
 */
export async function updateTask(taskId, taskData) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      
      // Проверяем существование задачи
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
         throw new Error('Task not found');
      }

      const taskDataFromDb = taskSnap.data();
      const isTaskGlobal = taskDataFromDb.isGlobal === true;
      const userIsAdmin = isAdmin();

      // Если задача админская, только админ может её редактировать
      if (isTaskGlobal && !userIsAdmin) {
         throw new Error('Only admin can edit global tasks');
      }

      // Если задача не админская, проверяем, что пользователь является владельцем
      if (!isTaskGlobal && taskDataFromDb.userId !== user.uid) {
         throw new Error('You can only edit your own tasks');
      }

      // Обновляем данные
      const taskDate = parseDate(taskData.date);
      const updateData = {
         name: taskData.name,
         description: taskData.description,
         date: taskData.date,
         dateTimestamp: Timestamp.fromDate(taskDate),
         time: taskData.time || null,
         timeDilation: taskData.timeDilation || false,
         fromTime: taskData.fromTime || null,
         toTime: taskData.toTime || null,
         tagText: taskData.tagText,
         taskColor: taskData.taskColor || '#4CAF50',
         frequency: taskData.frequency || 'once',
      };

      await updateDoc(taskRef, updateData);
      
      // Видаляємо старі повідомлення з Firestore та оновлюємо заплановані
      const { updateMessagesForTask } = await import('./messagesService');
      await updateMessagesForTask(taskId).catch(err => 
         console.error('Error updating messages for task:', err)
      );
      
      // Оновлюємо повідомлення
      const updatedTask = { id: taskId, ...taskDataFromDb, ...updateData };
      updateTaskNotifications(updatedTask).catch(err => 
         console.error('Error updating task notifications:', err)
      );
      
      return true;
   } catch (error) {
      console.error('Error updating task:', error);
      throw error;
   }
}

/**
 * Проверяет, можно ли отметить задачу как выполненную
 * Можно отметить от начала выполнения до 30 минут после окончания
 */
export function canMarkTaskAsCompleted(task) {
   const now = new Date();
   const taskDate = parseDate(task.date);
   
   // Проверяем, что задача на сегодня или в прошлом
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const taskDateOnly = new Date(taskDate);
   taskDateOnly.setHours(0, 0, 0, 0);
   
   if (taskDateOnly > today) {
      return { canMark: false, reason: 'future' };
   }
   
   if (task.timeDilation && task.fromTime && task.toTime) {
      const fromTime = parseTime(task.fromTime, taskDate);
      const toTime = parseTime(task.toTime, taskDate);
      
      // Можно отметить от начала до 30 минут после окончания
      const deadline = new Date(toTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
      
      if (now < fromTime) {
         return { canMark: false, reason: 'too_early', timeLeft: fromTime - now };
      }
      
      if (now > deadline) {
         return { canMark: false, reason: 'expired' };
      }
      
      return { canMark: true };
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      // Считаем час на выполнение
      const taskEndTime = new Date(taskTime);
      taskEndTime.setHours(taskEndTime.getHours() + 1);
      const deadline = new Date(taskEndTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
      
      // Можно отметить от начала до 30 минут после окончания
      if (now < taskTime) {
         return { canMark: false, reason: 'too_early', timeLeft: taskTime - now };
      }
      
      if (now > deadline) {
         return { canMark: false, reason: 'expired' };
      }
      
      return { canMark: true };
   }
   
   // Если нет времени, можно отметить в любой момент в день задачи или позже
   return { canMark: true };
}

/**
 * Отмечает задачу как выполненную
 */
export async function markTaskAsCompleted(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
         throw new Error('Task not found');
      }

      const taskData = taskSnap.data();
      
      // Проверяем права доступа
      const isTaskGlobal = taskData.isGlobal === true;
      if (isTaskGlobal) {
         // Для глобальных задач проверяем, присоединен ли пользователь
         const participants = taskData.participants || [];
         if (!participants.includes(user.uid)) {
            throw new Error('You must join the event first');
         }
      } else {
         // Для обычных задач проверяем владельца
         if (taskData.userId !== user.uid) {
            throw new Error('You can only mark your own tasks');
         }
      }
      
      // Проверяем, можно ли отметить
      const canMark = canMarkTaskAsCompleted(taskData);
      if (!canMark.canMark) {
         throw new Error(canMark.reason);
      }

      // Для глобальных задач обновляем в массиве completedBy
      if (isTaskGlobal) {
         const completedBy = taskData.completedBy || [];
         if (!completedBy.includes(user.uid)) {
            await updateDoc(taskRef, {
               completedBy: arrayUnion(user.uid),
               completedAt: Timestamp.now(),
            });
         }
         // Также отмечаем как выполненную для текущего пользователя
         // Используем отдельное поле для отслеживания статуса пользователя
         await updateDoc(taskRef, {
            [`userCompletions.${user.uid}`]: {
               isCompleted: true,
               completedAt: Timestamp.now(),
            }
         });
      } else {
         await updateDoc(taskRef, {
            isCompleted: true,
            isUncompleted: false,
            completedAt: Timestamp.now(),
            completedBy: user.uid,
         });
      }

      return { success: true };
   } catch (error) {
      console.error('Error marking task as completed:', error);
      throw error;
   }
}

/**
 * Отмечает задачу как невыполненную
 */
export async function markTaskAsUncompleted(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
         throw new Error('Task not found');
      }

      const taskData = taskSnap.data();
      
      // Проверяем права доступа
      const isTaskGlobal = taskData.isGlobal === true;
      if (isTaskGlobal) {
         // Для глобальных задач проверяем, присоединен ли пользователь
         const participants = taskData.participants || [];
         if (!participants.includes(user.uid)) {
            throw new Error('You must join the event first');
         }
         // Обновляем статус для текущего пользователя
         await updateDoc(taskRef, {
            [`userCompletions.${user.uid}`]: {
               isCompleted: false,
               isUncompleted: true,
               uncompletedAt: Timestamp.now(),
            }
         });
      } else {
         // Для обычных задач проверяем владельца
         if (taskData.userId !== user.uid) {
            throw new Error('You can only mark your own tasks');
         }
         await updateDoc(taskRef, {
            isCompleted: false,
            isUncompleted: true,
            uncompletedAt: Timestamp.now(),
         });
      }

      return { success: true };
   } catch (error) {
      console.error('Error marking task as uncompleted:', error);
      throw error;
   }
}

// Кэш для отслеживания последнего вызова autoMarkUncompletedTasks
let lastAutoMarkCall = 0;
const AUTO_MARK_COOLDOWN = 60000; // 1 минута между вызовами

/**
 * Автоматически отмечает задачи как невыполненные, если прошло более 30 минут после окончания
 * Эта функция должна вызываться периодически или при загрузке задач
 * Для глобальных задач проверяет, является ли пользователь участником
 */
export async function autoMarkUncompletedTasks() {
   try {
      const user = auth.currentUser;
      if (!user) {
         return;
      }

      // Предотвращаем слишком частые вызовы
      const now = Date.now();
      if (now - lastAutoMarkCall < AUTO_MARK_COOLDOWN) {
         return { success: true, marked: 0, skipped: true };
      }
      lastAutoMarkCall = now;

      const nowDate = new Date();
      const batch = [];
      
      // Получаем все задачи пользователя
      const userTasksQuery = query(
         collection(db, 'tasks'),
         where('userId', '==', user.uid)
      );
      
      const userTasksSnapshot = await getDocs(userTasksQuery);
      
      userTasksSnapshot.forEach((docSnap) => {
         const task = { id: docSnap.id, ...docSnap.data() };
         
         // Проверяем, что задача принадлежит пользователю (для безопасности)
         if (task.userId !== user.uid) {
            return;
         }
         
         // Пропускаем уже отмеченные как выполненные задачи
         if (task.isCompleted === true) {
            return;
         }
         
         // Если уже отмечена как невыполненная - пропускаем
         if (task.isUncompleted === true) {
            return;
         }
         
         // Проверяем, прошло ли 30 минут после окончания
         const shouldMark = shouldMarkTaskAsUncompleted(task, nowDate);
         if (shouldMark) {
            batch.push({
               taskRef: doc(db, 'tasks', task.id),
               updateData: {
                  isUncompleted: true,
                  uncompletedAt: Timestamp.now(),
               }
            });
         }
      });
      
      // Получаем глобальные задачи, к которым присоединился пользователь
      const globalTasksQuery = query(
         collection(db, 'tasks'),
         where('isGlobal', '==', true)
      );
      
      const globalTasksSnapshot = await getDocs(globalTasksQuery);
      
      globalTasksSnapshot.forEach((docSnap) => {
         const task = { id: docSnap.id, ...docSnap.data() };
         
         // Проверяем, присоединен ли пользователь
         const participants = task.participants || [];
         const isUserParticipant = participants.includes(user.uid);
         
         // Если пользователь не присоединился, отмечаем как невыполненную через 30 минут после окончания
         if (!isUserParticipant) {
            // Проверяем, не отмечено ли уже
            const userCompletion = task.userCompletions?.[user.uid];
            if (userCompletion && userCompletion.isUncompleted === true) {
               return; // Уже отмечено как невыполненная
            }
            
            const shouldMark = shouldMarkTaskAsUncompleted(task, nowDate);
            if (shouldMark) {
               batch.push({
                  taskRef: doc(db, 'tasks', task.id),
                  updateData: {
                     [`userCompletions.${user.uid}`]: {
                        isCompleted: false,
                        isUncompleted: true,
                        uncompletedAt: Timestamp.now(),
                     }
                  }
               });
            }
            return;
         }
         
         // Если пользователь присоединился, проверяем его статус выполнения
         const userCompletion = task.userCompletions?.[user.uid];
         if (userCompletion && (userCompletion.isCompleted === true || userCompletion.isUncompleted === true)) {
            return; // Уже отмечено
         }
         
         // Если присоединился, но не отмечено - не трогаем (присоединение = автоматически выполнено)
      });
      
      // Выполняем обновления батчами по 500 (лимит Firestore)
      for (let i = 0; i < batch.length; i += 500) {
         const batchChunk = batch.slice(i, i + 500);
         const batchWrite = writeBatch(db);
         
         batchChunk.forEach(({ taskRef, updateData }) => {
            batchWrite.update(taskRef, updateData);
         });
         
         await batchWrite.commit();
      }
      
      return { success: true, marked: batch.length };
   } catch (error) {
      console.error('Error auto-marking uncompleted tasks:', error);
      throw error;
   }
}

/**
 * Вспомогательная функция для определения, нужно ли отметить задачу как невыполненную
 */
function shouldMarkTaskAsUncompleted(task, now) {
   const taskDate = parseDate(task.date);
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const taskDateOnly = new Date(taskDate);
   taskDateOnly.setHours(0, 0, 0, 0);
   
   // Пропускаем будущие задачи
   if (taskDateOnly > today) {
      return false;
   }
   
   // Проверяем время
   let deadline;
   if (task.timeDilation && task.fromTime && task.toTime) {
      const toTime = parseTime(task.toTime, taskDate);
      deadline = new Date(toTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      const taskEndTime = new Date(taskTime);
      taskEndTime.setHours(taskEndTime.getHours() + 1);
      deadline = new Date(taskEndTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
   } else {
      // Если нет времени, отмечаем как невыполненную в конце дня
      const endOfDay = new Date(taskDate);
      endOfDay.setHours(23, 59, 59, 999);
      deadline = endOfDay;
   }
   
   // Если прошло более 30 минут после окончания
   return now > deadline;
}

/**
 * Проверяет, можно ли присоединиться к глобальному событию
 * Можно присоединиться до окончания события (до 30 минут после окончания)
 */
export function canJoinEvent(task) {
   const now = new Date();
   const taskDate = parseDate(task.date);
   
   // Проверяем, что задача на сегодня или в прошлом
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const taskDateOnly = new Date(taskDate);
   taskDateOnly.setHours(0, 0, 0, 0);
   
   if (taskDateOnly > today) {
      return { canJoin: true }; // Будущие задачи - можно присоединиться
   }
   
   // Проверяем время
   let deadline;
   if (task.timeDilation && task.fromTime && task.toTime) {
      const toTime = parseTime(task.toTime, taskDate);
      deadline = new Date(toTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      const taskEndTime = new Date(taskTime);
      taskEndTime.setHours(taskEndTime.getHours() + 1);
      deadline = new Date(taskEndTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
   } else {
      // Если нет времени, можно присоединиться в любой момент в день задачи
      return { canJoin: true };
   }
   
   // Если прошло более 30 минут после окончания - нельзя присоединиться
   if (now > deadline) {
      return { canJoin: false, reason: 'expired' };
   }
   
   return { canJoin: true };
}
