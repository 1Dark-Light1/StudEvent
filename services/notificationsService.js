import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { auth } from '../FireBaseConfig';
import { parseDate, parseTime } from './taskRules';
import { saveMessage } from './messagesService';
import { getTranslator } from '../i18n/I18nContext';

// Notification handler configuration
Notifications.setNotificationHandler({
   handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
   }),
});

// Add listener for receiving notifications
let notificationListener = null;

/**
 * Initializes notification listener for automatic saving to Firestore
 */
export function initializeNotificationListener() {
   if (notificationListener) {
      return; // Already initialized
   }

   notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      try {
         const { title, body, data } = notification.request.content;
         const { taskId, type } = data || {};

         // Save message to Firestore when received
         if (title && body && type) {
            await saveMessage(title, body, type, taskId).catch(err =>
               console.error('Error saving received notification to Firestore:', err)
            );
         }
         // already recorded, so the delivery check in syncTaskNotifications skips it
         await removeScheduledNotification(notification.request.identifier);
      } catch (error) {
         console.error('Error in notification listener:', error);
      }
   });
}

/**
 * Removes notification listener
 */
export function removeNotificationListener() {
   if (notificationListener) {
      notificationListener.remove();
      notificationListener = null;
   }
}

const NOTIFICATION_SETTINGS_KEY = '@notifications_settings';
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

/**
 * Gets notification settings from AsyncStorage
 */
export async function getNotificationSettings() {
   try {
      const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settingsJson) {
         return JSON.parse(settingsJson);
      }
      // Everything is enabled by default
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
 * Saves notification settings
 */
export async function saveNotificationSettings(settings) {
   try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
   } catch (error) {
      console.error('Error saving notification settings:', error);
   }
}

/**
 * Requests notification permissions
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
   
   // Android requires notification channel
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
 * Gets list of scheduled notifications
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
         // the native trigger object differs per platform; use the date we scheduled for
         trigger: stored[notif.identifier]?.date ? new Date(stored[notif.identifier].date) : notif.trigger,
      }));
   } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
   }
}

/**
 * Saves information about scheduled notifications
 */
async function saveScheduledNotification(identifier, taskId, type, details = {}) {
   try {
      const storedJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const stored = storedJson ? JSON.parse(storedJson) : {};
      stored[identifier] = { taskId, type, ...details };
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(stored));
   } catch (error) {
      console.error('Error saving scheduled notification:', error);
   }
}

/**
 * Removes information about scheduled notifications
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
 * Schedules a notification
 */
async function scheduleNotification(notificationId, title, body, triggerDate, taskId, type, soundEnabled = true) {
   try {
      const settings = await getNotificationSettings();
      if (!settings.enabled) {
         return null;
      }

      const identifier = `${taskId}_${type}_${notificationId}`;
      
      // Use new trigger format
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

      await saveScheduledNotification(identifier, taskId, type, { title, body, date: triggerDate.getTime() });
      
      // Message will be automatically saved to Firestore when received (via listener)
      // So we DON'T call saveMessage here
      
      return identifier;
   } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
   }
}

/**
 * Cancels all notifications for a task
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
 * Schedules notifications for user task
 */
export async function scheduleUserTaskNotifications(task) {
   const t = await getTranslator();
   if (!task || !task.date) return;

   const user = auth.currentUser;
   if (!user || task.userId !== user.uid) return;

   // Cancel old notifications
   await cancelTaskNotifications(task.id);

   // A completed task needs no reminder and no "time is up" message
   if (task.isCompleted || task.isUncompleted) return;

   const taskDate = parseDate(task.date);
   const now = new Date();

   // 1. Reminder 1 hour before task
   let reminderTime = null;
   if (task.timeDilation && task.fromTime) {
      const fromTime = parseTime(task.fromTime, taskDate);
      reminderTime = new Date(fromTime.getTime() - 60 * 60 * 1000); // 1 hour before
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      reminderTime = new Date(taskTime.getTime() - 60 * 60 * 1000); // 1 hour before
   }

   if (reminderTime && reminderTime > now) {
      await scheduleNotification(
         'reminder_1h',
         task.name,
         task.description || t('notify.forgetComplete'),
         reminderTime,
         task.id,
         'user_reminder_1h'
      );
   }

   // 2. Notification when time is up (if task not completed)
   let expiredTime = null;
   if (task.timeDilation && task.toTime) {
      const toTime = parseTime(task.toTime, taskDate);
      expiredTime = new Date(toTime.getTime() + 30 * 60 * 1000); // 30 min after end
   } else if (task.time) {
      const taskTime = parseTime(task.time, taskDate);
      const taskEndTime = new Date(taskTime.getTime() + 60 * 60 * 1000); // +1 hour for completion
      expiredTime = new Date(taskEndTime.getTime() + 30 * 60 * 1000); // +30 min after
   } else {
      // If no time specified, at end of day
      const endOfDay = new Date(taskDate);
      endOfDay.setHours(23, 59, 59, 999);
      expiredTime = endOfDay;
   }

   if (expiredTime && expiredTime > now) {
      await scheduleNotification(
         'expired',
         t('notify.timeUp', { name: task.name }),
         t('notify.expiredBody'),
         expiredTime,
         task.id,
         'user_expired'
      );
   }
}

/**
 * Shows "New global task" right away on this device and records it in the history.
 * Called by syncTaskNotifications when another user's global event appears.
 */
async function notifyNewGlobalTask(task, t) {
   const settings = await getNotificationSettings();
   if (!settings.enabled) return;

   let timeText = '';
   if (task.timeDilation && task.fromTime && task.toTime) {
      timeText = t('notify.fromTo', { from: task.fromTime, to: task.toTime });
   } else if (task.time) {
      timeText = t('notify.at', { time: task.time });
   }
   const title = t('notify.newGlobal');
   const body = `${task.name} (${task.date}${timeText ? `, ${timeText}` : ''})`;

   await Notifications.scheduleNotificationAsync({
      identifier: `${task.id}_global_created`,
      content: { title, body, sound: settings.soundEnabled, data: { taskId: task.id, type: 'global_created' } },
      trigger: null, // now
   });
   await saveMessage(title, body, 'global_created', task.id);
}

/**
 * Schedules notifications for global task after user joined
 */
export async function scheduleGlobalTaskJoinedNotifications(task) {
   const t = await getTranslator();
   if (!task || !task.isGlobal) return;

   const user = auth.currentUser;
   if (!user) return;

   // Check if user has joined
   const participants = task.participants || [];
   if (!participants.includes(user.uid)) return;

   // Cancel old notifications
   await cancelTaskNotifications(task.id);

   const taskDate = parseDate(task.date);
   const now = new Date();

   // 1. Reminder 1 day before task
   const dayBefore = new Date(taskDate);
   dayBefore.setDate(dayBefore.getDate() - 1);
   dayBefore.setHours(9, 0, 0, 0); // 9:00 AM

   if (dayBefore > now) {
      await scheduleNotification(
         'reminder_1d',
         t('notify.tomorrow', { name: task.name }),
         task.description || t('notify.forgetTask'),
         dayBefore,
         task.id,
         'global_reminder_1d'
      );
   }

   // 2. Reminder 1 hour before task
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
         task.description || t('notify.forgetComplete'),
         reminderTime,
         task.id,
         'global_reminder_1h'
      );
   }
}

/**
 * Updates notifications for task (called when task is modified)
 */
export async function updateTaskNotifications(task) {
   if (!task) return;

   if (task.isGlobal) {
      // For global tasks check if user has joined
      const user = auth.currentUser;
      if (user && task.participants && task.participants.includes(user.uid)) {
         await scheduleGlobalTaskJoinedNotifications(task);
      }
   } else {
      // For regular user tasks
      await scheduleUserTaskNotifications(task);
   }
}

// taskId -> what the task's notifications were last scheduled for
const syncedTasks = new Map();
// the last full task list, to reschedule after a settings change
let lastSyncedTasks = [];

export async function syncTaskNotifications(tasks) {
   const user = auth.currentUser;
   if (!user) return;
   lastSyncedTasks = tasks;

   for (const task of tasks) {
      const relevant = task.isGlobal
         ? (task.participants || []).includes(user.uid)
         : task.userId === user.uid;
      const signature = JSON.stringify([
         user.uid, relevant, task.date, task.time, task.timeDilation, task.fromTime,
         task.toTime, task.name, task.description, task.isCompleted, task.isUncompleted,
      ]);
      const previous = syncedTasks.get(task.id);
      if (previous === signature) continue;
      syncedTasks.set(task.id, signature);

      try {
         if (relevant) {
            await updateTaskNotifications(task);
         } else if (previous) {
            // the user left this global event
            await cancelTaskNotifications(task.id);
         }
      } catch (error) {
         syncedTasks.delete(task.id);
         console.error('Error syncing notifications for task:', task.id, error);
      }
   }

   await recordDeliveredNotifications();
   await cancelNotificationsOfMissingTasks(tasks);
   await announceNewGlobalTasks(tasks, user.uid);
}

/** Saves notifications that fired while the app was closed into the history (messages). */
async function recordDeliveredNotifications() {
   try {
      const storedJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const stored = storedJson ? JSON.parse(storedJson) : {};
      const pending = new Set((await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier));
      const now = Date.now();
      let changed = false;
      for (const [identifier, info] of Object.entries(stored)) {
         if (pending.has(identifier) || !info.date || info.date > now) continue;
         if (info.title && info.body && info.type) {
            await saveMessage(info.title, info.body, info.type, info.taskId);
         }
         delete stored[identifier];
         changed = true;
      }
      if (changed) await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(stored));
   } catch (error) {
      console.error('Error recording delivered notifications:', error);
   }
}

/** Reminders of tasks that were deleted (or are no longer visible) must not fire. */
async function cancelNotificationsOfMissingTasks(tasks) {
   const ids = new Set(tasks.map((task) => task.id));
   const scheduled = await getScheduledNotifications();
   const missing = new Set(scheduled.map((n) => n.taskId).filter((id) => id && !ids.has(id)));
   for (const taskId of missing) {
      syncedTasks.delete(taskId);
      await cancelTaskNotifications(taskId);
   }
}

/**
 * Notifies about global events created by someone else since the last check.
 * The first check on a device only remembers the existing events.
 */
async function announceNewGlobalTasks(tasks, uid) {
   const key = `@seen_global_tasks_${uid}`;
   try {
      const globals = tasks.filter((task) => task.isGlobal);
      const seenJson = await AsyncStorage.getItem(key);
      const seen = new Set(seenJson ? JSON.parse(seenJson) : []);
      const firstCheck = seenJson === null;
      const t = await getTranslator();
      for (const task of globals) {
         if (seen.has(task.id)) continue;
         seen.add(task.id);
         if (!firstCheck && task.userId !== uid) await notifyNewGlobalTask(task, t);
      }
      await AsyncStorage.setItem(key, JSON.stringify([...seen].filter((id) => globals.some((task) => task.id === id))));
   } catch (error) {
      console.error('Error announcing new global tasks:', error);
   }
}

/**
 * Cancels or reschedules every reminder after the notification settings changed.
 */
export async function resyncNotifications() {
   const settings = await getNotificationSettings();
   const scheduled = await getScheduledNotifications();
   for (const taskId of new Set(scheduled.map((n) => n.taskId).filter(Boolean))) {
      await cancelTaskNotifications(taskId);
   }
   syncedTasks.clear();
   if (settings.enabled) await syncTaskNotifications(lastSyncedTasks);
}

