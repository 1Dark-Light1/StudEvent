import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { auth } from '../FireBaseConfig';
import { parseDate, parseTime } from './tasksService';
import { saveMessage } from './messagesService';

// Notification handler configuration
Notifications.setNotificationHandler({
   handleNotification: async () => ({
      shouldShowAlert: true,
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
      }));
   } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
   }
}

/**
 * Saves information about scheduled notifications
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

      await saveScheduledNotification(identifier, taskId, type);
      
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
   if (!task || !task.date) return;

   const user = auth.currentUser;
   if (!user || task.userId !== user.uid) return;

   // Cancel old notifications
   await cancelTaskNotifications(task.id);

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
         task.description || 'Don\'t forget to complete this task',
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
         `${task.name} - time is up`,
         'Time to complete this task has expired',
         expiredTime,
         task.id,
         'user_expired'
      );
   }
}

/**
 * Schedules notification about new global task (for all users except admin)
 * Note: This is a broadcast-style notification. Each client will save the message
 * to their own Firestore when they receive it via the notification listener.
 */
export async function scheduleGlobalTaskCreatedNotification(task) {
   if (!task || !task.isGlobal) return;

   try {
      const now = new Date();
      const notifyTime = new Date(now.getTime() + 3000); // 3 seconds

      let timeText = '';
      if (task.timeDilation && task.fromTime && task.toTime) {
         timeText = `from ${task.fromTime} to ${task.toTime}`;
      } else if (task.time) {
         timeText = `at ${task.time}`;
      }

      const title = 'New Global Task';
      const body = `${task.name}${timeText ? ` - ${timeText}` : ''}`;

      // Schedule a broadcast notification
      // All logged-in users will receive this notification
      const settings = await getNotificationSettings();
      if (!settings.enabled) {
         return null;
      }

      const identifier = `${task.id}_global_created_broadcast`;
      
      await Notifications.scheduleNotificationAsync({
         identifier,
         content: {
            title,
            body,
            sound: settings.soundEnabled,
            data: { 
               taskId: task.id, 
               type: 'global_created',
               broadcast: true // Mark as broadcast for all users
            },
         },
         trigger: {
            type: 'date',
            date: notifyTime
         },
      });

      await saveScheduledNotification(identifier, task.id, 'global_created');
      
      console.log(`Global task broadcast notification scheduled at ${notifyTime.toLocaleTimeString()}`);
   } catch (error) {
      console.error('Error scheduling global task created notification:', error);
   }
}

/**
 * Schedules notifications for global task after user joined
 */
export async function scheduleGlobalTaskJoinedNotifications(task) {
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
         `Tomorrow: ${task.name}`,
         task.description || 'Don\'t forget about this task',
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
         task.description || 'Don\'t forget to complete this task',
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

/**
 * Cancels all notifications
 */
export async function cancelAllNotifications() {
   try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
   } catch (error) {
      console.error('Error canceling all notifications:', error);
   }
}
