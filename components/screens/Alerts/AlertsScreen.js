/**
 * AlertsScreen - list of scheduled and received notifications
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getScheduledNotifications } from '../../../services/notificationsService';
import { subscribeToCurrentMonthMessages, cleanupOldMessages, getHiddenMessages, hideMessage } from '../../../services/messagesService';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../FireBaseConfig';

export default function Alerts({ navigation, route }) {
  const activeRoute = route?.name ?? 'Alerts';
  const { t, displayDate } = useI18n();
  const { colors } = useTheme();
   const [notifications, setNotifications] = useState([]);
   const [messages, setMessages] = useState([]);
   const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set()); // ids of messages the user swiped away
   const [loading, setLoading] = useState(true);

   // Tasks referenced by notifications/messages, loaded once by id (null = deleted or not accessible)
   const tasksCacheRef = useRef({});
   const fetchTasks = async (ids) => {
      const missing = [...new Set(ids)].filter((id) => id && !(id in tasksCacheRef.current));
      await Promise.all(missing.map(async (id) => {
         try {
            const snapshot = await getDoc(firestoreDoc(db, 'tasks', id));
            tasksCacheRef.current[id] = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
         } catch (error) {
            console.error('Error loading task:', error);
            tasksCacheRef.current[id] = null;
         }
      }));
      return tasksCacheRef.current;
   };

   useEffect(() => {
      // Hidden message ids are kept in AsyncStorage
      const loadHiddenMessages = async () => {
         const hidden = await getHiddenMessages();
         setHiddenMessageIds(hidden);
      };
      loadHiddenMessages();
      
      loadNotifications();
      
      // Saved messages from Firestore
      const unsubscribe = subscribeToCurrentMonthMessages((loadedMessages) => {
         setMessages(loadedMessages);
      });

      // Remove messages from previous months
      cleanupOldMessages().catch(err => 
         console.error('Error cleaning up old messages:', err)
      );

      return () => {
         if (unsubscribe) unsubscribe();
      };
      // Runs once on mount; later updates come from the messages subscription
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const loadNotifications = async () => {
      try {
         const scheduled = await getScheduledNotifications();
         const now = new Date();
         
         // Only upcoming notifications, with their task data
         const futureNotifications = scheduled.filter(n => {
            const triggerDate = n.trigger instanceof Date ? n.trigger : new Date(n.trigger);
            return triggerDate > now;
         });

         const tasks = await fetchTasks(futureNotifications.map((notif) => notif.taskId));
         const notificationsWithTasks = futureNotifications.map((notif) => (
            tasks[notif.taskId] ? { ...notif, task: tasks[notif.taskId] } : notif
         ));

         // Sort by trigger time
         notificationsWithTasks.sort((a, b) => {
            const dateA = a.trigger instanceof Date ? a.trigger : new Date(a.trigger);
            const dateB = b.trigger instanceof Date ? b.trigger : new Date(b.trigger);
            return dateA - dateB;
         });

         setNotifications(notificationsWithTasks);
      } catch (error) {
         console.error('Error loading notifications:', error);
      } finally {
         setLoading(false);
      }
   };

   // Saved messages with their task data
   const [messagesWithTasks, setMessagesWithTasks] = useState([]);

   useEffect(() => {
      let cancelled = false;
      (async () => {
         const tasks = await fetchTasks(messages.map((message) => message.taskId));
         if (cancelled) return;
         setMessagesWithTasks(messages.map((message) => ({
            ...message,
            identifier: message.id,
            trigger: message.createdAt?.toDate?.() || new Date(message.createdAt),
            task: tasks[message.taskId] || undefined,
         })));
      })();
      return () => {
         cancelled = true;
      };
   }, [messages]);

   // Scheduled notifications plus saved messages, without hidden ones
   const allMessages = useMemo(() => {
      const combined = [...notifications, ...messagesWithTasks];
      
      // Drop hidden messages and duplicates
      const unique = combined.filter((item, index, self) => {
         // Skip hidden messages
         if (item.id && hiddenMessageIds.has(item.id)) {
            return false;
         }
         if (item.identifier && hiddenMessageIds.has(item.identifier)) {
            return false;
         }
         
         // Skip duplicates (same identifier, or same task and type within a minute)
         return index === self.findIndex(t => 
            (t.identifier && item.identifier && t.identifier === item.identifier) ||
            (t.taskId && item.taskId && t.type === item.type && t.taskId === item.taskId && 
             Math.abs((t.trigger?.getTime?.() || 0) - (item.trigger?.getTime?.() || 0)) < 60000)
         );
      });
      
      // Group by day
      const groupedByDate = {};
      unique.forEach(message => {
         const triggerDate = message.trigger instanceof Date ? message.trigger : new Date(message.trigger);
         // Local day (toISOString would group by the UTC day)
         const dateKey = `${triggerDate.getFullYear()}-${String(triggerDate.getMonth() + 1).padStart(2, '0')}-${String(triggerDate.getDate()).padStart(2, '0')}`;
         if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
         }
         groupedByDate[dateKey].push(message);
      });
      
      // Newest day first
      const sortedDates = Object.keys(groupedByDate).sort().reverse();
      
      return { groupedByDate, sortedDates };
   }, [notifications, messagesWithTasks, hiddenMessageIds]);

   const handleHideMessage = async (messageId) => {
      // Persist in AsyncStorage and update state
      const updatedHidden = await hideMessage(messageId);
      setHiddenMessageIds(updatedHidden);
   };

   const getNotificationTypeLabel = (type) => {
      switch (type) {
         case 'user_reminder':
            return t('notifications.type.userReminder');
         case 'user_check':
            return t('notifications.type.userCheck');
         case 'global_created':
            return t('notifications.type.globalCreated');
         case 'global_reminder_1d':
            return t('notifications.type.globalReminder1d');
         case 'global_reminder_1h':
            return t('notifications.type.globalReminder1h');
         default:
            return t('notifications.type.reminder');
      }
   };

   return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
         {/* Header, same layout as CompletedTasksScreen */}
         <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('alerts.title')}</Text>
         </View>

         <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
         >
            {loading ? (
               <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('alerts.loading')}</Text>
               </View>
            ) : allMessages.sortedDates.length === 0 ? (
               <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('alerts.noNotifications')}</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('alerts.noNotificationsDesc')}</Text>
               </View>
            ) : (
               <View style={styles.messagesContainer}>
                  {allMessages.sortedDates.map((dateKey) => {
                     const dateMessages = allMessages.groupedByDate[dateKey];
                     // dateKey is YYYY-MM-DD in local time
                     const [year, month, day] = dateKey.split('-');
                     const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                     return (
                        <View key={dateKey} style={styles.dateGroup}>
                           <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                              {displayDate(dateObj).toUpperCase()}
                           </Text>
                           {dateMessages.map((message, index) => (
                              <SwipeableMessageCard
                                 key={message.identifier || index}
                                 message={message}
                                 onHide={handleHideMessage}
                                 getNotificationTypeLabel={getNotificationTypeLabel}
                                 t={t}
                              />
                           ))}
                        </View>
                     );
                  })}
               </View>
            )}
         </ScrollView>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />
      </View>
   );
}

// Message card that can be swiped away
function SwipeableMessageCard({ message, onHide, getNotificationTypeLabel, t }) {
   const { tagLabel, displayTime } = useI18n();
   const { colors } = useTheme();
   const translateX = new Animated.Value(0);
   const [isHidden, setIsHidden] = useState(false);

   const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
         return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
         if (gestureState.dx < 0) {
            translateX.setValue(gestureState.dx);
         }
      },
      onPanResponderRelease: (_, gestureState) => {
         if (gestureState.dx < -100) {
            // Swiped left more than 100px: hide
            Animated.timing(translateX, {
               toValue: -300,
               duration: 200,
               useNativeDriver: true,
            }).start(() => {
               const messageId = message.id || message.identifier;
               if (messageId) {
                  setIsHidden(true);
                  onHide(messageId);
               }
            });
         } else {
            // Snap back
            Animated.spring(translateX, {
               toValue: 0,
               useNativeDriver: true,
            }).start();
         }
      },
   });

   if (isHidden) {
      return null;
   }

   const triggerDate = message.trigger instanceof Date ? message.trigger : new Date(message.trigger);
   const task = message.task;
   const isGlobal = task && task.isGlobal === true;
   const displayTitle = message.title || (getNotificationTypeLabel ? getNotificationTypeLabel(message.type) : t('notifications.fallbackTitle'));
   const displayBody = message.body || (task ? task.name : '');
   
   // Global tasks use the same gradient as on Home
   const adminTagColor = isGlobal ? (task.taskColor || colors.primary) : colors.primary;
   const adminGradientColors = isGlobal
      ? [adminTagColor, `${adminTagColor}E6`, `${adminTagColor}CC`, `${adminTagColor}99`]
      : null;

   return (
      <Animated.View
         style={[
            styles.messageCardWrapper,
            {
               transform: [{ translateX }],
            },
         ]}
         {...panResponder.panHandlers}
      >
         <View style={styles.messageRow}>
            <Text style={[styles.messageTimeText, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>{displayTime(triggerDate)}</Text>
            {isGlobal ? (
               <LinearGradient
                  colors={adminGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.messageCardGlobal}
               >
                  <View style={styles.messageContent}>
                     <Text style={styles.messageTitleGlobal}>{displayTitle}</Text>
                     {displayBody && (
                        <Text style={styles.messageBodyGlobal}>{displayBody}</Text>
                     )}
                     {task && task.tagText && (
                        <View style={[styles.messageTag, { backgroundColor: adminTagColor }]}>
                           <Text style={styles.messageTagText}>{tagLabel(task.tagText)}</Text>
                        </View>
                     )}
                  </View>
               </LinearGradient>
            ) : (
               <View style={[styles.messageCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.messageContent}>
                     <Text style={[styles.messageTitle, { color: colors.text }]}>{displayTitle}</Text>
                     {displayBody && (
                        <Text style={[styles.messageBody, { color: colors.textSecondary }]}>{displayBody}</Text>
                     )}
                     {task && task.tagText && (
                        <View style={[styles.messageTag, { backgroundColor: task.taskColor || colors.primary }]}>
                           <Text style={styles.messageTagText}>{tagLabel(task.tagText)}</Text>
                        </View>
                     )}
                  </View>
               </View>
            )}
         </View>
      </Animated.View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
   },
   scrollView: {
      flex: 1,
   },
   scrollContent: {
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 160,
   },
   header: {
      marginBottom: 24,
      alignItems: 'center',
      paddingTop: 60,
   },
   title: {
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
   },
   loadingContainer: {
      alignItems: 'center',
      paddingVertical: 60,
   },
   loadingText: {
      marginTop: 16,
      fontSize: 15,
   },
   emptyContainer: {
      alignItems: 'center',
      paddingVertical: 80,
   },
   emptyTitle: {
      marginTop: 24,
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 8,
   },
   emptySubtitle: {
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 40,
   },
   messagesContainer: {
      gap: 24,
   },
   dateGroup: {
      marginBottom: 8,
   },
   dateLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
   },
   messageCardWrapper: {
      marginBottom: 14,
   },
   messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
   },
   messageTimeText: {
      width: 68, // fixed, so every card starts at the same place ("9:05 AM" and "13:00" alike)
      marginRight: 12,
      fontWeight: '600',
   },
   messageCard: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
   },
   messageCardGlobal: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      minHeight: 70,
   },
   messageContent: {
      flex: 1,
   },
   messageTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
   },
   messageTitleGlobal: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 6,
      color: '#fff',
   },
   messageBody: {
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 8,
   },
   messageBodyGlobal: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 8,
   },
   messageTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
   },
   messageTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#fff',
   },
});
