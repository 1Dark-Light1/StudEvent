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
 * Checks if the current user is an admin
 */
export function isAdmin() {
   const user = auth.currentUser;
   if (!user) return false;
   // Check by email
   return user.email === 'admin@gmail.com';
}

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
   
   if (task.timeDilation && task.fromTime && task.toTime) {
      const fromTime = parseTime(task.fromTime, taskDate);
      const toTime = parseTime(task.toTime, taskDate);
      return now >= fromTime && now <= toTime;
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      // Consider the task active for an hour after start
      const oneHourLater = new Date(taskTime);
      oneHourLater.setHours(oneHourLater.getHours() + 1);
      return now >= taskTime && now <= oneHourLater;
   }
   
   return false;
}

/**
 * Generates dates for Weekly frequency until the end of the month
 */
function generateWeeklyDates(startDateString) {
   const startDate = parseDate(startDateString);
   const [day, month, year] = startDateString.split('.');
   const startMonth = parseInt(month, 10) - 1;
   const startYear = parseInt(year, 10);
   
   // Get the last day of the month
   const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
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
 * Adds a new task to Firestore
 */
export async function addTask(taskData) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const datesToAdd = [];
      
      if (taskData.frequency === 'weekly') {
         // Generate dates for Weekly
         datesToAdd.push(...generateWeeklyDates(taskData.date));
      } else if (taskData.frequency === 'custom' && taskData.customDates && taskData.customDates.length > 0) {
         // Use custom dates
         datesToAdd.push(...taskData.customDates);
      } else {
         // One date for 'once'
         datesToAdd.push(taskData.date);
      }

      const createdIds = [];
      
      // Check if the user is an admin
      const admin = isAdmin();
      
      // Create a task for each date
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
            ...(admin && { isGlobal: true, participants: [] }), // For admin, add isGlobal and participants
         };

         const docRef = await addDoc(collection(db, 'tasks'), taskDoc);
         createdIds.push(docRef.id);
         
         // Schedule notifications
         const createdTask = { id: docRef.id, ...taskDoc };
         if (admin) {
            // For global tasks:
            // 1. Notification about creation for all other users
            scheduleGlobalTaskCreatedNotification(createdTask).catch(err => 
               console.error('Error scheduling global task notification:', err)
            );
            // 2. Automatically join admin and schedule their reminders
            const taskWithParticipants = { ...createdTask, participants: [user.uid] };
            scheduleGlobalTaskJoinedNotifications(taskWithParticipants).catch(err => 
               console.error('Error scheduling admin reminders:', err)
            );
         } else {
            // For regular tasks - user reminders
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
 * Gets all user tasks
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

      // Sort by time on the client
      return tasks.sort((a, b) => {
         // Сначала по дате
         const dateA = a.dateTimestamp?.toMillis() || 0;
         const dateB = b.dateTimestamp?.toMillis() || 0;
         if (dateA !== dateB) {
            return dateA - dateB;
         }
         // Then by time
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
 * Gets user tasks by date
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

      // Sort by time
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

   // Subscribe to own tasks and global tasks
   const userTasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid));
   const globalTasksQuery = query(collection(db, 'tasks'), where('isGlobal', '==', true));

   let userTasksUnsubscribe;
   let globalTasksUnsubscribe;
   let userTasks = [];
   let globalTasks = [];
   let userTasksLoaded = false;
   let globalTasksLoaded = false;

   const mergeAndSortTasks = async () => {
      // Merge tasks and remove duplicates
      const allTasks = [...userTasks];
      globalTasks.forEach(globalTask => {
         // Don't add if already in own tasks
         if (!allTasks.find(t => t.id === globalTask.id)) {
            allTasks.push(globalTask);
         }
      });

      // Sort
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

      // Schedule notifications for tasks
      for (const task of sorted) {
         try {
            if (task.isGlobal) {
               // For global tasks - check if user has joined
               const participants = task.participants || [];
               if (participants.includes(user.uid)) {
                  await scheduleGlobalTaskJoinedNotifications(task);
               }
            } else {
               // For regular user tasks
               await scheduleUserTaskNotifications(task);
            }
         } catch (error) {
            console.error('Error scheduling notifications for task:', task.id, error);
         }
      }

      // Call callback after at least one query has loaded
      // This ensures that global tasks will be shown even if there are no own tasks
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
      userTasksLoaded = true; // Mark as loaded even on error
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
      globalTasksLoaded = true; // Mark as loaded even on error
      mergeAndSortTasks().catch(err => console.error('Error in mergeAndSortTasks:', err)); // Still call merge to show at least own tasks
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

   // Query for own tasks by date
   const userTasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      where('date', '==', dateString)
   );

   // Query for global tasks by date that the user has joined
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
      // Filter global tasks from own tasks (for admin - their global tasks
      // should only appear if they joined, i.e., they will be in globalTasks)
      const filteredUserTasks = userTasks.filter(task => {
         // If it's a global task, exclude it from own tasks
         // It will only appear if the user has joined (via globalTasks)
         return !task.isGlobal;
      });
      
      // Merge tasks and remove duplicates
      const allTasks = [...filteredUserTasks];
      globalTasks.forEach(globalTask => {
         if (!allTasks.find(t => t.id === globalTask.id)) {
            allTasks.push(globalTask);
         }
      });

      // Sort by time
      const sortedTasks = allTasks.sort((a, b) => {
         const timeA = a.timeDilation ? a.fromTime : a.time;
         const timeB = b.timeDilation ? b.fromTime : b.time;
         if (!timeA) return 1;
         if (!timeB) return -1;
         return timeA.localeCompare(timeB);
      });

      // Call callback after at least one query has loaded
      // This ensures that global tasks will be shown even if there are no own tasks
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
      userTasksLoaded = true; // Mark as loaded even on error
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
      globalTasksLoaded = true; // Mark as loaded even on error
      mergeAndSortTasks(); // Still call merge to show at least own tasks
   });

   return () => {
      if (userTasksUnsubscribe) userTasksUnsubscribe();
      if (globalTasksUnsubscribe) globalTasksUnsubscribe();
   };
}

/**
 * Formats a task for calendar display
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

/**
 * Deletes task by ID
 */
export async function deleteTask(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      // Delete notifications before deleting task
      await cancelTaskNotifications(taskId);
      
      // Delete messages from Firestore
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
 * Adds current user to event participants
 */
export async function joinEvent(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      
      // Get event data
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
         throw new Error('Event not found');
      }

      const taskData = taskSnap.data();
      const participants = taskData.participants || [];
      
      // Check if user is already joined
      if (participants.includes(user.uid)) {
         return { success: false, message: 'Już dołączyłeś do tego wydarzenia' };
      }

      // Add user to participants
      await updateDoc(taskRef, {
         participants: arrayUnion(user.uid)
      });
      
      // For global tasks automatically mark as completed for this user
      if (taskData.isGlobal === true) {
         await updateDoc(taskRef, {
            [`userCompletions.${user.uid}`]: {
               isCompleted: true,
               completedAt: Timestamp.now(),
            }
         });
         
         // Schedule notifications for joined user
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
 * Removes the current user from event participants
 * For global tasks: if time has passed - marks as incomplete, otherwise just removes userCompletions
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
      
      // Remove user from participants
      await updateDoc(taskRef, {
         participants: arrayRemove(user.uid)
      });

      // Delete notifications for global tasks after disconnection
      if (isTaskGlobal) {
         cancelTaskNotifications(taskId).catch(err => 
            console.error('Error canceling notifications:', err)
         );
      }

      // For global tasks, process completion status
      if (isTaskGlobal) {
         const now = new Date();
         const shouldMarkAsUncompleted = shouldMarkTaskAsUncompleted(taskData, now);
         
         if (shouldMarkAsUncompleted) {
            // Time has passed - mark as uncompleted
            await updateDoc(taskRef, {
               [`userCompletions.${user.uid}`]: {
                  isCompleted: false,
                  isUncompleted: true,
                  uncompletedAt: Timestamp.now(),
               }
            });
         } else {
            // Time has not passed yet - just remove userCompletions (task will disappear from completed)
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
 * Checks if the current user is a participant in the event
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
 * Gets the number of event participants
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
 * Updates existing task
 */
export async function updateTask(taskId, taskData) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const taskRef = doc(db, 'tasks', taskId);
      
      // Check task existence
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
         throw new Error('Task not found');
      }

      const taskDataFromDb = taskSnap.data();
      const isTaskGlobal = taskDataFromDb.isGlobal === true;
      const userIsAdmin = isAdmin();

      // If task is admin's, only admin can edit it
      if (isTaskGlobal && !userIsAdmin) {
         throw new Error('Only admin can edit global tasks');
      }

      // If task is not admin's, check that user is the owner
      if (!isTaskGlobal && taskDataFromDb.userId !== user.uid) {
         throw new Error('You can only edit your own tasks');
      }

      // Update data
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
      
      // Delete old messages from Firestore and update scheduled ones
      const { updateMessagesForTask } = await import('./messagesService');
      await updateMessagesForTask(taskId).catch(err => 
         console.error('Error updating messages for task:', err)
      );
      
      // Update notifications
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
 * Checks if task can be marked as completed
 * Can be marked from start of execution to 30 minutes after end
 */
export function canMarkTaskAsCompleted(task) {
   const now = new Date();
   const taskDate = parseDate(task.date);
   
   // Check that task is today or in the past
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
      
      // Can be marked from start to 30 minutes after end
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
      // Count one hour for execution
      const taskEndTime = new Date(taskTime);
      taskEndTime.setHours(taskEndTime.getHours() + 1);
      const deadline = new Date(taskEndTime);
      deadline.setMinutes(deadline.getMinutes() + 30);
      
      // Can be marked from start to 30 minutes after end
      if (now < taskTime) {
         return { canMark: false, reason: 'too_early', timeLeft: taskTime - now };
      }
      
      if (now > deadline) {
         return { canMark: false, reason: 'expired' };
      }
      
      return { canMark: true };
   }
   
   // If no time, can be marked any moment on task day or later
   return { canMark: true };
}

/**
 * Marks task as completed
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
         // For regular tasks, check the owner
         if (taskData.userId !== user.uid) {
            throw new Error('You can only mark your own tasks');
         }
      }
      
      // Check if can be marked
      const canMark = canMarkTaskAsCompleted(taskData);
      if (!canMark.canMark) {
         throw new Error(canMark.reason);
      }

      // For global tasks, update in completedBy array
      if (isTaskGlobal) {
         const completedBy = taskData.completedBy || [];
         if (!completedBy.includes(user.uid)) {
            await updateDoc(taskRef, {
               completedBy: arrayUnion(user.uid),
               completedAt: Timestamp.now(),
            });
         }
         // Also mark as completed for current user
         // Use separate field to track user status
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
 * Marks task as uncompleted
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
         // Update status for current user
         await updateDoc(taskRef, {
            [`userCompletions.${user.uid}`]: {
               isCompleted: false,
               isUncompleted: true,
               uncompletedAt: Timestamp.now(),
            }
         });
      } else {
         // For regular tasks, check the owner
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

// Cache for tracking the last call to autoMarkUncompletedTasks
let lastAutoMarkCall = 0;
const AUTO_MARK_COOLDOWN = 60000; // 1 minute between calls

/**
 * Automatically marks tasks as uncompleted if more than 30 minutes have passed after the end
 * This function should be called periodically or when loading tasks
 * For global tasks checks if the user is a participant
 */
export async function autoMarkUncompletedTasks() {
   try {
      const user = auth.currentUser;
      if (!user) {
         return;
      }

      // Prevent too frequent calls
      const now = Date.now();
      if (now - lastAutoMarkCall < AUTO_MARK_COOLDOWN) {
         return { success: true, marked: 0, skipped: true };
      }
      lastAutoMarkCall = now;

      const nowDate = new Date();
      const batch = [];
      
      // Get all user tasks
      const userTasksQuery = query(
         collection(db, 'tasks'),
         where('userId', '==', user.uid)
      );
      
      const userTasksSnapshot = await getDocs(userTasksQuery);
      
      userTasksSnapshot.forEach((docSnap) => {
         const task = { id: docSnap.id, ...docSnap.data() };
         
         // Check that task belongs to user (for security)
         if (task.userId !== user.uid) {
            return;
         }
         
         // Skip already marked as completed tasks
         if (task.isCompleted === true) {
            return;
         }
         
         // If already marked as uncompleted - skip
         if (task.isUncompleted === true) {
            return;
         }
         
         // Check if 30 minutes have passed after the end
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
      
      // Get global tasks that the user has joined
      const globalTasksQuery = query(
         collection(db, 'tasks'),
         where('isGlobal', '==', true)
      );
      
      const globalTasksSnapshot = await getDocs(globalTasksQuery);
      
      globalTasksSnapshot.forEach((docSnap) => {
         const task = { id: docSnap.id, ...docSnap.data() };
         
         // Check if user has joined
         const participants = task.participants || [];
         const isUserParticipant = participants.includes(user.uid);
         
         // If user has not joined, mark as uncompleted after 30 minutes of the end
         if (!isUserParticipant) {
            // Check if already marked
            const userCompletion = task.userCompletions?.[user.uid];
            if (userCompletion && userCompletion.isUncompleted === true) {
               return; // Already marked as uncompleted
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
         
         // If user has joined, check their completion status
         const userCompletion = task.userCompletions?.[user.uid];
         if (userCompletion && (userCompletion.isCompleted === true || userCompletion.isUncompleted === true)) {
            return; // Already marked
         }
         
         // If joined but not marked - don't touch (joining = automatically completed)
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
