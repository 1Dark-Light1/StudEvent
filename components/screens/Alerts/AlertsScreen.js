/**
 * AlertsScreen - екран зі списком повідомлень
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Platform, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getScheduledNotifications } from '../../../services/notificationsService';
import { subscribeToCurrentMonthMessages, cleanupOldMessages, getHiddenMessages, hideMessage } from '../../../services/messagesService';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../FireBaseConfig';

function formatDateForDisplay(date, t) {
   const d = new Date(date);
   const day = d.getDate();
   const month = d.getMonth() + 1;
   const year = d.getFullYear();
   const monthNames = [
      t('date.january'), t('date.february'), t('date.march'), t('date.april'), t('date.may'), t('date.june'),
      t('date.july'), t('date.august'), t('date.september'), t('date.october'), t('date.november'), t('date.december')
   ];
   return `${day} ${monthNames[month - 1].toUpperCase()} ${year}`;
}

function formatTimeForDisplay(date) {
   const d = new Date(date);
   const hours = d.getHours();
   const minutes = d.getMinutes();
   const ampm = hours >= 12 ? 'PM' : 'AM';
   const displayHour = hours % 12 || 12;
   return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export default function Alerts({ navigation, route }) {
  const activeRoute = route?.name ?? 'Alerts';
  const { t } = useI18n();
  const { colors } = useTheme();
   const [notifications, setNotifications] = useState([]);
   const [messages, setMessages] = useState([]);
   const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set()); // Зберігаємо ID прихованих повідомлень
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      // Завантажуємо приховані повідомлення з AsyncStorage
      const loadHiddenMessages = async () => {
         const hidden = await getHiddenMessages();
         setHiddenMessageIds(hidden);
      };
      loadHiddenMessages();
      
      loadNotifications();
      
      // Підписуємось на повідомлення з Firestore
      const unsubscribe = subscribeToCurrentMonthMessages((loadedMessages) => {
         setMessages(loadedMessages);
      });

      // Очищаємо старі повідомлення при завантаженні
      cleanupOldMessages().catch(err => 
         console.error('Error cleaning up old messages:', err)
      );

      return () => {
         if (unsubscribe) unsubscribe();
      };
   }, []);

   const loadNotifications = async () => {
      try {
         const scheduled = await getScheduledNotifications();
         const now = new Date();
         
         // Фільтруємо тільки майбутні повідомлення та завантажуємо дані задач
         const futureNotifications = scheduled.filter(n => {
            const triggerDate = n.trigger instanceof Date ? n.trigger : new Date(n.trigger);
            return triggerDate > now;
         });

         // Завантажуємо дані задач для кожного повідомлення
         const notificationsWithTasks = await Promise.all(
            futureNotifications.map(async (notif) => {
               if (notif.taskId) {
                  try {
                     const taskDoc = await getDoc(firestoreDoc(db, 'tasks', notif.taskId));
                     if (taskDoc.exists()) {
                        return {
                           ...notif,
                           task: { id: taskDoc.id, ...taskDoc.data() },
                        };
                     }
                  } catch (error) {
                     // Ігноруємо помилки доступу - задача може бути видалена або недоступна
                     console.error('Error loading task:', error);
                  }
               }
               return notif;
            })
         );

         // Сортуємо за датою
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

   // Завантажуємо дані задач для повідомлень з Firestore (оптимізовано - завантажуємо тільки унікальні taskId)
   const [messagesWithTasks, setMessagesWithTasks] = useState([]);
   const tasksCacheRef = useRef({}); // Кеш для задач (useRef щоб не викликати ререндери)
   
   useEffect(() => {
      const loadTasksForMessages = async () => {
         // Отримуємо унікальні taskId
         const uniqueTaskIds = [...new Set(messages.filter(m => m.taskId).map(m => m.taskId))];
         
         // Завантажуємо тільки ті задачі, яких немає в кеші
         const tasksToLoad = uniqueTaskIds.filter(taskId => !tasksCacheRef.current[taskId]);
         
         // Завантажуємо задачі батчем
         const loadedTasks = {};
         await Promise.all(
            tasksToLoad.map(async (taskId) => {
               try {
                  const taskDoc = await getDoc(firestoreDoc(db, 'tasks', taskId));
                  if (taskDoc.exists()) {
                     loadedTasks[taskId] = { id: taskDoc.id, ...taskDoc.data() };
                  }
               } catch (error) {
                  // Ігноруємо помилки доступу - задача може бути видалена
                  console.error('Error loading task for message:', error);
               }
            })
         );
         
         // Оновлюємо кеш
         if (Object.keys(loadedTasks).length > 0) {
            tasksCacheRef.current = { ...tasksCacheRef.current, ...loadedTasks };
         }
         
         // Формуємо повідомлення з задачами
         const messagesWithTasksData = messages.map((message) => {
            const task = message.taskId ? (tasksCacheRef.current[message.taskId] || loadedTasks[message.taskId]) : null;
            return {
               ...message,
               identifier: message.id,
               trigger: message.createdAt?.toDate?.() || new Date(message.createdAt),
               task: task || undefined,
            };
         });
         
         setMessagesWithTasks(messagesWithTasksData);
      };
      
      if (messages.length > 0) {
         loadTasksForMessages();
      } else {
         setMessagesWithTasks([]);
      }
   }, [messages]);

   // Об'єднуємо заплановані повідомлення та повідомлення з Firestore, фільтруємо приховані
   const allMessages = useMemo(() => {
      const combined = [...notifications, ...messagesWithTasks];
      
      // Видаляємо дублікати та приховані повідомлення
      const unique = combined.filter((item, index, self) => {
         // Пропускаємо приховані повідомлення
         if (item.id && hiddenMessageIds.has(item.id)) {
            return false;
         }
         if (item.identifier && hiddenMessageIds.has(item.identifier)) {
            return false;
         }
         
         // Видаляємо дублікати
         return index === self.findIndex(t => 
            (t.identifier && item.identifier && t.identifier === item.identifier) ||
            (t.taskId && item.taskId && t.type === item.type && t.taskId === item.taskId && 
             Math.abs((t.trigger?.getTime?.() || 0) - (item.trigger?.getTime?.() || 0)) < 60000)
         );
      });
      
      // Групуємо за датою
      const groupedByDate = {};
      unique.forEach(message => {
         const triggerDate = message.trigger instanceof Date ? message.trigger : new Date(message.trigger);
         // Використовуємо ISO формат для ключа
         const dateKey = triggerDate.toISOString().split('T')[0]; // YYYY-MM-DD
         if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
         }
         groupedByDate[dateKey].push(message);
      });
      
      // Сортуємо дати (новіші спочатку)
      const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
         return new Date(b) - new Date(a);
      });
      
      return { groupedByDate, sortedDates };
   }, [notifications, messagesWithTasks, hiddenMessageIds]);

   const handleHideMessage = async (messageId) => {
      // Зберігаємо в AsyncStorage та оновлюємо стан
      const updatedHidden = await hideMessage(messageId);
      setHiddenMessageIds(updatedHidden);
   };

   const getNotificationTypeLabel = (type) => {
      switch (type) {
         case 'user_reminder_1h':
            return t('notifications.type.userReminder1h');
         case 'user_expired':
            return t('notifications.type.userExpired');
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
         {/* Хедер подібний до CompletedTasksScreen */}
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
                     // dateKey в форматі YYYY-MM-DD, конвертуємо в Date
                     const [year, month, day] = dateKey.split('-');
                     const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                     return (
                        <View key={dateKey} style={styles.dateGroup}>
                           <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                              {formatDateForDisplay(dateObj, t)}
                           </Text>
                           {dateMessages.map((message, index) => {
                              const isLast = index === dateMessages.length - 1;
                              return (
                                 <SwipeableMessageCard
                                    key={message.identifier || index}
                                    message={message}
                                    onHide={handleHideMessage}
                                    getNotificationTypeLabel={getNotificationTypeLabel}
                                    t={t}
                                    isLast={isLast}
                                 />
                              );
                           })}
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

// Компонент для повідомлення з можливістю свайпу
function SwipeableMessageCard({ message, onHide, getNotificationTypeLabel, t, isLast = false }) {
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
            // Свайп вліво більше 100px - приховуємо
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
            // Повертаємо назад
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
   const displayTitle = message.title || (getNotificationTypeLabel ? getNotificationTypeLabel(message.type) : 'Повідомлення');
   const displayBody = message.body || (task ? task.name : '');
   
   // Для глобальних задач використовуємо градієнт як на Home
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
            <Text style={[styles.messageTimeText, { color: colors.textMuted }]}>{formatTimeForDisplay(triggerDate)}</Text>
            <View style={styles.messageTimeline}>
               <View 
                  style={[
                     styles.messageBullet, 
                     { backgroundColor: isGlobal ? adminTagColor : colors.primary },
                     isGlobal && styles.messageBulletGlobal
                  ]} 
               />
               {!isLast && <View style={[styles.messageTimelineLine, { backgroundColor: colors.border }]} />}
            </View>
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
                           <Text style={styles.messageTagText}>{task.tagText}</Text>
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
                           <Text style={styles.messageTagText}>{task.tagText}</Text>
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
      width: 52,
      fontWeight: '600',
   },
   messageTimeline: {
      alignItems: 'center',
      marginRight: 12,
      alignSelf: 'stretch',
   },
   messageBullet: {
      width: 12,
      height: 12,
      borderRadius: 6,
   },
   messageBulletGlobal: {
      width: 16,
      height: 16,
      borderRadius: 8,
   },
   messageTimelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      minHeight: 48,
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
