import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { auth } from '../FireBaseConfig';
import { parseDate, parseTime } from './tasksService';
import { saveMessage } from './messagesService';

// Налаштування обробки повідомлень
Notifications.setNotificationHandler({
   handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
   }),
});

const NOTIFICATION_SETTINGS_KEY = '@notifications_settings';
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

/**
 * Отримує налаштування повідомлень з AsyncStorage
 */
export async function getNotificationSettings() {
   try {
      const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settingsJson) {
         return JSON.parse(settingsJson);
      }
      // За замовчуванням все увімкнено
      return {
         enabled: true,
         soundEnabled: true,
         reminderEnabled: true,
      };
   } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
         enabled: true,
         soundEnabled: true,
         reminderEnabled: true,
      };
   }
}

/**
 * Зберігає налаштування повідомлень
 */
export async function saveNotificationSettings(settings) {
   try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
   } catch (error) {
      console.error('Error saving notification settings:', error);
   }
}

/**
 * Запитує дозвіл на повідомлення
 */
export async function requestPermissions() {
   const { status: existingStatus } = await Notifications.getPermissionsAsync();
   let finalStatus = existingStatus;
   
   if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
   }
   
   if (finalStatus !== 'granted') {
      return false;
   }
   
   // Для Android потрібен канал
   if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
         name: 'Default',
         importance: Notifications.AndroidImportance.MAX,
         vibrationPattern: [0, 250, 250, 250],
         lightColor: '#FF231F7C',
      });
   }
   
   return true;
}

/**
 * Отримує список запланованих повідомлень
 */
export async function getScheduledNotifications() {
   try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const storedJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const stored = storedJson ? JSON.parse(storedJson) : {};
      
      return notifications.map(notif => ({
         ...notif,
         taskId: stored[notif.identifier]?.taskId,
         type: stored[notif.identifier]?.type,
      }));
   } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
   }
}

/**
 * Зберігає інформацію про заплановані повідомлення
 */
async function saveScheduledNotification(identifier, taskId, type) {
   try {
      const storedJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const stored = storedJson ? JSON.parse(storedJson) : {};
      stored[identifier] = { taskId, type };
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(stored));
   } catch (error) {
      console.error('Error saving scheduled notification:', error);
   }
}

/**
 * Видаляє інформацію про заплановані повідомлення
 */
async function removeScheduledNotification(identifier) {
   try {
      const storedJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const stored = storedJson ? JSON.parse(storedJson) : {};
      delete stored[identifier];
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(stored));
   } catch (error) {
      console.error('Error removing scheduled notification:', error);
   }
}

/**
 * Планує повідомлення
 */
async function scheduleNotification(notificationId, title, body, triggerDate, taskId, type, soundEnabled = true) {
   try {
      const settings = await getNotificationSettings();
      if (!settings.enabled) {
         return null;
      }

      const identifier = `${taskId}_${type}_${notificationId}`;
      
      // Використовуємо новий формат trigger
      const trigger = triggerDate instanceof Date 
         ? { type: 'date', date: triggerDate }
         : triggerDate;
      
      await Notifications.scheduleNotificationAsync({
         identifier,
         content: {
            title,
            body,
            sound: soundEnabled && settings.soundEnabled,
            data: { taskId, type },
         },
         trigger,
      });

      await saveScheduledNotification(identifier, taskId, type);
      
      // Зберігаємо повідомлення у Firestore тільки якщо воно в майбутньому
      // (щоб не створювати повідомлення для вже минулих подій)
      if (triggerDate instanceof Date && triggerDate > new Date()) {
         await saveMessage(title, body, type, taskId).catch(err => 
            console.error('Error saving message to Firestore:', err)
         );
      } else if (typeof triggerDate === 'object' && triggerDate.date && triggerDate.date > new Date()) {
         await saveMessage(title, body, type, taskId).catch(err => 
            console.error('Error saving message to Firestore:', err)
         );
      }
      
      return identifier;
   } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
   }
}

/**
 * Видаляє всі повідомлення для задачі
 */
export async function cancelTaskNotifications(taskId) {
   try {
      const scheduled = await getScheduledNotifications();
      const toCancel = scheduled.filter(n => n.taskId === taskId);
      
      for (const notif of toCancel) {
         await Notifications.cancelScheduledNotificationAsync(notif.identifier);
         await removeScheduledNotification(notif.identifier);
      }
   } catch (error) {
      console.error('Error canceling task notifications:', error);
   }
}

/**
 * Планує повідомлення для задачі користувача
 */
export async function scheduleUserTaskNotifications(task) {
   if (!task || !task.date) return;

   const user = auth.currentUser;
   if (!user || task.userId !== user.uid) return;

   // Скасовуємо старі повідомлення
   await cancelTaskNotifications(task.id);

   const taskDate = parseDate(task.date);
   const now = new Date();

   // 1. Нагадування за 1 годину до таска
   let reminderTime = null;
   if (task.timeDilation && task.fromTime) {
      const fromTime = parseTime(task.fromTime, taskDate);
      reminderTime = new Date(fromTime.getTime() - 60 * 60 * 1000); // 1 година до
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      reminderTime = new Date(taskTime.getTime() - 60 * 60 * 1000); // 1 година до
   }

   if (reminderTime && reminderTime > now) {
      await scheduleNotification(
         'reminder_1h',
         task.name,
         task.description || 'Не забудьте виконати це завдання',
         reminderTime,
         task.id,
         'user_reminder_1h'
      );
   }

   // 2. Повідомлення коли час на виконання згас (якщо таск не виконаний)
   let expiredTime = null;
   if (task.timeDilation && task.toTime) {
      const toTime = parseTime(task.toTime, taskDate);
      expiredTime = new Date(toTime.getTime() + 30 * 60 * 1000); // 30 хв після закінчення
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      const taskEndTime = new Date(taskTime.getTime() + 60 * 60 * 1000); // +1 година на виконання
      expiredTime = new Date(taskEndTime.getTime() + 30 * 60 * 1000); // +30 хв після
   } else {
      // Якщо немає часу, то в кінці дня
      const endOfDay = new Date(taskDate);
      endOfDay.setHours(23, 59, 59, 999);
      expiredTime = endOfDay;
   }

   if (expiredTime && expiredTime > now) {
      await scheduleNotification(
         'expired',
         `${task.name} - час вийшов`,
         'Час на виконання цього завдання згас',
         expiredTime,
         task.id,
         'user_expired'
      );
   }
}

/**
 * Планує повідомлення про новий глобальний таск (для всіх користувачів)
 */
export async function scheduleGlobalTaskCreatedNotification(task) {
   if (!task || !task.isGlobal) return;

   const user = auth.currentUser;
   if (!user) return;

   // Перевіряємо, чи користувач не адмін (адміну не потрібно повідомлення про власні таски)
   if (task.userId === user.uid) return;

   const taskDate = parseDate(task.date);
   const now = new Date();
   
   // Повідомлення про новий таск - відразу або через невеликий час
   const notifyTime = new Date(now.getTime() + 1000); // 1 секунда

   let timeText = '';
   if (task.timeDilation && task.fromTime && task.toTime) {
      timeText = `з ${task.fromTime} до ${task.toTime}`;
   } else if (task.time) {
      timeText = `о ${task.time}`;
   }

   await scheduleNotification(
      'created',
      'Новий глобальний таск',
      `${task.name}${timeText ? ` - ${timeText}` : ''}`,
      notifyTime,
      task.id,
      'global_created'
   );
}

/**
 * Планує повідомлення для глобального таска після приєднання користувача
 */
export async function scheduleGlobalTaskJoinedNotifications(task) {
   if (!task || !task.isGlobal) return;

   const user = auth.currentUser;
   if (!user) return;

   // Перевіряємо, чи користувач приєднався
   const participants = task.participants || [];
   if (!participants.includes(user.uid)) return;

   // Скасовуємо старі повідомлення
   await cancelTaskNotifications(task.id);

   const taskDate = parseDate(task.date);
   const now = new Date();

   // 1. Нагадування за день до таска
   const dayBefore = new Date(taskDate);
   dayBefore.setDate(dayBefore.getDate() - 1);
   dayBefore.setHours(9, 0, 0, 0); // 9:00 ранку

   if (dayBefore > now) {
      await scheduleNotification(
         'reminder_1d',
         `Завтра: ${task.name}`,
         task.description || 'Не забудьте про це завдання',
         dayBefore,
         task.id,
         'global_reminder_1d'
      );
   }

   // 2. Нагадування за 1 годину до таска
   let reminderTime = null;
   if (task.timeDilation && task.fromTime) {
      const fromTime = parseTime(task.fromTime, taskDate);
      reminderTime = new Date(fromTime.getTime() - 60 * 60 * 1000);
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      reminderTime = new Date(taskTime.getTime() - 60 * 60 * 1000);
   }

   if (reminderTime && reminderTime > now) {
      await scheduleNotification(
         'reminder_1h',
         task.name,
         task.description || 'Не забудьте виконати це завдання',
         reminderTime,
         task.id,
         'global_reminder_1h'
      );
   }
}

/**
 * Оновлює повідомлення для задачі (викликається при зміні задачі)
 */
export async function updateTaskNotifications(task) {
   if (!task) return;

   if (task.isGlobal) {
      // Для глобальних задач перевіряємо, чи користувач приєднався
      const user = auth.currentUser;
      if (user && task.participants && task.participants.includes(user.uid)) {
         await scheduleGlobalTaskJoinedNotifications(task);
      }
   } else {
      // Для звичайних задач користувача
      await scheduleUserTaskNotifications(task);
   }
}

/**
 * Видаляє всі повідомлення
 */
export async function cancelAllNotifications() {
   try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
   } catch (error) {
      console.error('Error canceling all notifications:', error);
   }
}
