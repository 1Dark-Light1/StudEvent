/**
 * UserCalendarScreen focuses on the daily timeline experience.
 * It mixes a day-strip selector with a vertical schedule so users can
 * jump between days and immediately see context-rich events.
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import { subscribeToTasksByDate, formatTaskForCalendar, isTaskActive } from '../../../services/tasksService';
import { auth } from '../../../FireBaseConfig';

/**
 * Генерирует массив дней недели начиная с понедельника текущей недели
 */
function generateWeekDays() {
   const today = new Date();
   const currentDay = today.getDay();
   // Понедельник = 1, воскресенье = 0
   const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
   const monday = new Date(today);
   monday.setDate(today.getDate() + mondayOffset);

   const days = [];
   const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
   
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
 * Форматирует дату для отображения
 */
function formatDateForDisplay(dateString) {
   const [day, month, year] = dateString.split('.');
   const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
   ];
   return `${monthNames[parseInt(month) - 1]} ${day}, ${year}`;
}

/**
 * Форматирует время для отображения (добавляет AM/PM)
 */
function formatTimeForDisplay(timeString) {
   if (!timeString) return '';
   if (timeString.includes('-')) {
      // Диапазон времени
      const [from, to] = timeString.split('-');
      return `${formatSingleTime(from)}-${formatSingleTime(to)}`;
   }
   return formatSingleTime(timeString);
}

function formatSingleTime(timeString) {
   const [hours, minutes] = timeString.split(':');
   const hour = parseInt(hours, 10);
   const ampm = hour >= 12 ? 'PM' : 'AM';
   const displayHour = hour % 12 || 12;
   return `${displayHour}:${minutes} ${ampm}`;
}

export default function UserCalendar({ navigation, route }) {
   const activeRoute = route?.name ?? 'UserCalendar';
   const stripDays = generateWeekDays();
   const today = new Date();
   const todayDateString = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
   
   const defaultDay = stripDays.find(day => day.dateString === todayDateString) || stripDays[0];
   const [activeDate, setActiveDate] = useState(defaultDay.dateString);
   const [tasks, setTasks] = useState([]);
   const [rawTasks, setRawTasks] = useState([]); // Сохраняем оригинальные данные задач
   const [isLoading, setIsLoading] = useState(true);

   const activeDay = stripDays.find((day) => day.dateString === activeDate) || stripDays[0];
   const isToday = activeDay.dateString === todayDateString;
   const headerLabel = isToday ? 'Today' : activeDay.label;

   // Подписка на задачи для выбранной даты
   useEffect(() => {
      if (!auth.currentUser) {
         setIsLoading(false);
         return;
      }

      setIsLoading(true);
      const unsubscribe = subscribeToTasksByDate(activeDate, (loadedTasks) => {
         setRawTasks(loadedTasks); // Сохраняем оригинальные данные
         const formattedTasks = loadedTasks.map(task => formatTaskForCalendar(task));
         setTasks(formattedTasks);
         setIsLoading(false);
      });

      return () => {
         if (unsubscribe) unsubscribe();
      };
   }, [activeDate]);

   // Обновление активных задач каждые 30 секунд и при возврате на экран
   useEffect(() => {
      if (rawTasks.length === 0) return;

      const updateTasks = () => {
         if (auth.currentUser && rawTasks.length > 0) {
            // Переформатируем задачи для обновления статуса активности
            const updatedTasks = rawTasks.map(task => formatTaskForCalendar(task));
            setTasks(updatedTasks);
         }
      };

      // Обновляем сразу при монтировании
      updateTasks();

      // Обновляем каждые 30 секунд
      const interval = setInterval(updateTasks, 30000);

      // Обновляем при возврате на экран
      const subscription = AppState.addEventListener('change', (nextAppState) => {
         if (nextAppState === 'active') {
            updateTasks();
         }
      });

      return () => {
         clearInterval(interval);
         subscription?.remove();
      };
   }, [rawTasks]);

   return (
      <View style={styles.screen}>
         <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
               <View>
                  <Text style={styles.dateOverline}>{formatDateForDisplay(activeDate)}</Text>
                  <Text style={styles.title}>{headerLabel}</Text>
               </View>

               <View style={styles.avatar}>
                  <Pressable     
                     onPress={() => navigation.navigate('Settings')}
                     style={({ pressed }) => ({opacity: pressed ? 0.5 : 1, })}
                  >
                     <Ionicons name="person" size={24} color="#262c3b" />
                  </Pressable>
               </View>

            </View>

            <View style={styles.dayStrip}>
               {stripDays.map((day) => {
                  const isActive = day.dateString === activeDate;
                  const isTodayDate = day.dateString === todayDateString;
                  return (
                     <Pressable
                        key={day.dateString}
                        style={[styles.dayChip, isActive && styles.dayChipActive]}
                        onPress={() => setActiveDate(day.dateString)}
                     >
                        <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>{day.label}</Text>
                        <Text style={[styles.dayNumber, isActive && styles.dayNumberActive]}>{day.date}</Text>
                        {isTodayDate && !isActive && (
                           <View style={styles.todayIndicator} />
                        )}
                     </Pressable>
                  );
               })}
            </View>

            <View style={styles.timelineWrapper}>
               {isLoading ? (
                  <View style={styles.loadingState}>
                     <ActivityIndicator size="large" color="#2f7cff" />
                     <Text style={styles.loadingText}>Loading tasks...</Text>
                  </View>
               ) : tasks.length === 0 ? (
                  <View style={styles.emptyState}>
                     <Ionicons name="sunny" size={28} color="#d0d8ec" />
                     <Text style={styles.emptyTitle}>Nothing planned</Text>
                     <Text style={styles.emptySubtitle}>Tap + to schedule something new.</Text>
                  </View>
               ) : (
                  tasks.map((event, index) => {
                     const isLast = index === tasks.length - 1;
                     const cardStyles = [styles.eventCard];
                     if (event.tone === 'highlight') {
                        cardStyles.push(styles.eventCardHighlight);
                     }

                     return (
                        <View key={event.id} style={styles.eventRow}>
                           <Text style={styles.eventTime}>{formatTimeForDisplay(event.time)}</Text>
                           <View style={styles.nodeColumn}>
                              <View
                                 style={[styles.timelineNode, event.tone === 'highlight' && styles.timelineNodeHighlight]}
                              />
                              {!isLast && <View style={styles.nodeLine} />}
                           </View>
                           <View style={cardStyles}>
                              <Text style={[styles.eventTitle, event.tone === 'highlight' && styles.eventTitleHighlight]}>
                                 {event.title}
                              </Text>
                              <Text
                                 style={[
                                    styles.eventSubtitle,
                                    event.tone === 'highlight' && styles.eventSubtitleHighlight,
                                 ]}
                              >
                                 {event.subtitle}
                              </Text>
                              {event.tone === 'highlight' && (
                                 <View style={styles.labMeta}>
                                    <View style={styles.labPeopleRow}>
                                       <View style={[styles.labAvatar, { backgroundColor: event.color || '#2f7cff' }]}>
                                          <Ionicons name="person" size={14} color="#fff" />
                                       </View>
                                    </View>
                                    <View style={styles.labAction}>
                                       <Ionicons name="star" size={18} color="#fff" />
                                    </View>
                                 </View>
                              )}
                           </View>
                        </View>
                     );
                  })
               )}
            </View>
         </ScrollView>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />

         <FloatingActionButton onPress={() => navigation.navigate('AddTask')} />
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
      backgroundColor: '#f6f7fb',
   },
   scroll: {
      paddingTop: 60,
      paddingBottom: 160,
      paddingHorizontal: 24,
   },
   headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 26,
   },
   dateOverline: {
      color: '#a2aabf',
      fontSize: 14,
   },
   title: {
      fontSize: 36,
      fontWeight: '700',
      color: '#20283f',
      marginTop: 4,
   },
   avatar: {
      width: 52,
      height: 52,
      borderRadius: 20,
      backgroundColor: '#e7eaf5',
      alignItems: 'center',
      justifyContent: 'center',
   },
   dayStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderRadius: 30,
      backgroundColor: '#fff',
      paddingHorizontal: 18,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      marginBottom: 32,
   },
   dayChip: {
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 16,
   },
   dayChipActive: {
      backgroundColor: '#2f6cff',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
   },
   dayLabel: {
      fontSize: 12,
      color: '#a4aec3',
   },
   dayLabelActive: {
      color: '#f4f6ff',
      fontWeight: '600',
   },
   dayNumber: {
      fontSize: 16,
      color: '#20283f',
      fontWeight: '600',
      marginTop: 4,
   },
   dayNumberActive: {
      color: '#fff',
      fontSize: 20,
   },
   timelineWrapper: {
      backgroundColor: '#fff',
      borderRadius: 34,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 32,
      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
   },
   eventRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 26,
   },
   eventTime: {
      width: 80,
      color: '#94a0b6',
      fontWeight: '600',
   },
   nodeColumn: {
      width: 46,
      alignItems: 'center',
   },
   timelineNode: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#dfe6f5',
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
   },
   timelineNodeHighlight: {
      backgroundColor: '#2f6cff',
      borderColor: '#6fa9ff',
   },
   nodeLine: {
      width: 2,
      flex: 1,
      backgroundColor: '#e6ecf7',
      marginTop: 6,
   },
   eventCard: {
      flex: 1,
      backgroundColor: '#f7f9fe',
      borderRadius: 20,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
   },
   eventCardHighlight: {
      backgroundColor: '#2f7cff',
   },
   eventTitle: {
      color: '#1f2b3f',
      fontWeight: '600',
      fontSize: 16,
      marginBottom: 6,
   },
   eventTitleHighlight: {
      color: '#fff',
   },
   eventSubtitle: {
      color: '#9aa7bd',
      fontSize: 12,
      lineHeight: 18,
   },
   eventSubtitleHighlight: {
      color: 'rgba(255,255,255,0.85)',
   },
   labMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
   },
   labPeopleRow: {
      flexDirection: 'row',
      gap: 8,
   },
   labAvatar: {
      width: 32,
      height: 32,
      borderRadius: 12,
      backgroundColor: '#f4f7ff',
      alignItems: 'center',
      justifyContent: 'center',
   },
   labAction: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: '#f4f7ff',
      alignItems: 'center',
      justifyContent: 'center',
   },
   emptyState: {
      alignItems: 'center',
      paddingVertical: 28,
      borderRadius: 20,
      backgroundColor: '#f7f9fe',
      marginBottom: 12,
   },
   emptyTitle: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
      color: '#1f2b3f',
   },
   emptySubtitle: {
      marginTop: 4,
      color: '#9aa7bd',
      fontSize: 12,
   },
   loadingState: {
      alignItems: 'center',
      paddingVertical: 40,
   },
   loadingText: {
      marginTop: 12,
      color: '#9aa7bd',
      fontSize: 14,
   },
   todayIndicator: {
      position: 'absolute',
      bottom: 2,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#2f6cff',
   },
});
