/**
 * UserCalendarScreen focuses on the daily timeline experience.
 * It mixes a day-strip selector with a vertical schedule so users can
 * jump between days and immediately see context-rich events.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, AppState, Alert, PanResponder, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import SearchBar from '../../ui/SearchBar';
import FilterPanel from '../../ui/FilterPanel';
import EventDetailsModal from '../../ui/EventDetailsModal';
import GlobalEventCard from '../../ui/GlobalEventCard';
import { useTaskFilters, useParticipants, useEventModal, toEventDetails } from '../calendarShared';
import { subscribeToTasksByDate, formatTaskForCalendar, applyTaskFilters, deleteTask, autoMarkUncompletedTasks } from '../../../services/tasksService';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Генерирует массив дней недели начиная с понедельника недели с учётом смещения
 */
function generateWeekDays(t, weekOffset = 0) {
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
 * Форматирует дату для отображения
 */
function formatDateForDisplay(dateString, t) {
   const [day, month, year] = dateString.split('.');
   const monthNames = [
      t('date.january'), t('date.february'), t('date.march'), t('date.april'), t('date.may'), t('date.june'),
      t('date.july'), t('date.august'), t('date.september'), t('date.october'), t('date.november'), t('date.december')
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

/**
 * Обчислює weekOffset для заданої дати
 */
function calculateWeekOffset(targetDateString) {
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

export default function UserCalendar({ navigation, route }) {
   const activeRoute = route?.name ?? 'UserCalendar';
   const { t } = useI18n();
   const { colors, isDark } = useTheme();
   const today = new Date();
   const todayDateString = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
   
   // Отримуємо initialDate з параметрів навігації та обчислюємо weekOffset
   const initialDate = route?.params?.initialDate;
   const calculatedWeekOffset = initialDate ? calculateWeekOffset(initialDate) : 0;
   const [weekOffset, setWeekOffset] = useState(calculatedWeekOffset);
   const stripDays = useMemo(() => generateWeekDays(t, weekOffset), [t, weekOffset]);
   
   const defaultDay = initialDate 
      ? stripDays.find(day => day.dateString === initialDate) || stripDays[0]
      : stripDays.find(day => day.dateString === todayDateString) || stripDays[0];
   const [activeDate, setActiveDate] = useState(defaultDay.dateString);
   
   // Оновлюємо weekOffset та activeDate, коли змінюється initialDate
   useEffect(() => {
      if (initialDate) {
         const newWeekOffset = calculateWeekOffset(initialDate);
         setWeekOffset(newWeekOffset);
      }
   }, [initialDate]);
   
   // Оновлюємо activeDate після зміни weekOffset
   useEffect(() => {
      if (initialDate && stripDays.length > 0) {
         const targetDay = stripDays.find(day => day.dateString === initialDate);
         if (targetDay) {
            setActiveDate(initialDate);
         }
      }
   }, [weekOffset, stripDays, initialDate]);
   const [tasks, setTasks] = useState([]);
   const [rawTasks, setRawTasks] = useState([]); // Сохраняем оригинальные данные задач
   const [isLoading, setIsLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const { searchQuery, setSearchQuery, clearSearch, selectedTags, toggleTag, clearTags, resetFilters } = useTaskFilters();
   const participantsData = useParticipants(rawTasks);
   const eventModal = useEventModal();

   const activeDay = stripDays.find((day) => day.dateString === activeDate) || stripDays[0];
   const isToday = activeDay.dateString === todayDateString;
   const headerLabel = isToday ? t('calendar.today') : activeDay.label;

   // Horizontal swipe on the day strip switches weeks
   const [panResponder] = useState(() =>
      PanResponder.create({
         onMoveShouldSetPanResponder: (_evt, gestureState) => {
            const { dx, dy } = gestureState;
            // Игнорируем совсем мелкие движения, реагируем только на горизонтальный жест
            return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2;
         },
         onPanResponderRelease: (_evt, gestureState) => {
            const { dx } = gestureState;
            const threshold = 30;
            if (dx > threshold) {
               // свайп вправо → предыдущая неделя
               setWeekOffset((offset) => offset - 1);
            } else if (dx < -threshold) {
               // свайп влево → следующая неделя
               setWeekOffset((offset) => offset + 1);
            }
         },
      })
   );

   // При смене недели стараемся сохранить тот же день недели (например, четверг -> четверг следующей недели)
   useEffect(() => {
      if (stripDays.length === 0) return;

      setActiveDate((prevDate) => {
         if (!prevDate) return stripDays[0].dateString;

         const [d, m, y] = prevDate.split('.');
         const prevDateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
         // Преобразуем getDay (0-6, где 0 воскресенье) в индекс с понедельника
         const jsDay = prevDateObj.getDay(); // 0..6
         const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0..6, где 0 понедельник

         const targetDay = stripDays[weekdayIndex] || stripDays[0];
         return targetDay.dateString;
      });
   }, [weekOffset, stripDays]);

   // Подписка на задачи для выбранной даты
   useEffect(() => {
      if (!auth.currentUser) {
         setIsLoading(false);
         return;
      }

      setIsLoading(true);
      let isFirstLoadForDate = true;
      const unsubscribe = subscribeToTasksByDate(activeDate, async (loadedTasks) => {
         // Автоматически отмечаем просроченные задачи только при первой загрузке для этой даты
         if (isFirstLoadForDate) {
            isFirstLoadForDate = false;
            try {
               await autoMarkUncompletedTasks();
            } catch (error) {
               console.error('Error auto-marking uncompleted tasks:', error);
            }
         }
         
         setRawTasks(loadedTasks);
         setIsLoading(false);
      });

      return () => {
         if (unsubscribe) unsubscribe();
      };
   }, [activeDate]);

   // Обновление активных задач каждые 30 секунд и при возврате на экран
   useEffect(() => {
      // Re-format regularly so the "active now" highlight follows the clock
      const updateTasks = () => {
         setTasks(applyTaskFilters(rawTasks, searchQuery, selectedTags).map(formatTaskForCalendar));
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
   }, [rawTasks, searchQuery, selectedTags]);

   const handleEventPress = (event) => {
      const fullTask = rawTasks.find(task => task.id === event.id);
      if (!fullTask) return;
      eventModal.open(toEventDetails(fullTask, { time: event.time, color: event.color, tone: event.tone }));
   };

   const handleDeleteEvent = async (eventId) => {
      try {
         await deleteTask(eventId);
         Alert.alert(t('common.success'), t('calendar.deleteSuccess'));
      } catch {
         Alert.alert(t('common.error'), t('calendar.deleteError'));
      }
   };

   const onRefresh = async () => {
      setRefreshing(true);
      try {
         // Перекидаємо на поточний тиждень
         setWeekOffset(0);
         const today = new Date();
         const todayDateString = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
         setActiveDate(todayDateString);
         resetFilters();
         
         // Оновлюємо задачі
         await autoMarkUncompletedTasks();
         // Дані оновляться автоматично через subscribeToTasksByDate
      } catch (error) {
         console.error('Error refreshing tasks:', error);
      } finally {
         setRefreshing(false);
      }
   };

   return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
         <ScrollView 
            contentContainerStyle={styles.scroll} 
            showsVerticalScrollIndicator={false}
            refreshControl={
               <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor="#fff"
                  progressViewOffset={Platform.OS === 'ios' ? 100 : 0}
               />
            }
         >
            <View style={styles.headerRow}>
               <View>
                  <Text style={[styles.dateOverline, { color: colors.textMuted }]}>{formatDateForDisplay(activeDate, t)}</Text>
                  <Text style={[styles.title, { color: colors.text }]}>{headerLabel}</Text>
               </View>

               <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
                  <Pressable     
                     onPress={() => navigation.navigate('Settings')}
                     style={({ pressed }) => ({opacity: pressed ? 0.5 : 1, })}
                  >
                     <Ionicons name="person" size={24} color={colors.text} />
                  </Pressable>
               </View>

            </View>

            <View style={[styles.dayStrip, { backgroundColor: colors.cardBackground }]} {...panResponder.panHandlers}>
               {stripDays.map((day) => {
                  const isActive = day.dateString === activeDate;
                  const isTodayDate = day.dateString === todayDateString;
                  return (
                     <Pressable
                        key={day.dateString}
                        style={[
                           styles.dayChip,
                           { backgroundColor: colors.cardBackground },
                           isActive && [styles.dayChipActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => setActiveDate(day.dateString)}
                     >
                        <Text style={[
                           styles.dayLabel,
                           { color: colors.textSecondary },
                           isActive && [styles.dayLabelActive, { color: '#fff' }]
                        ]}>{day.label}</Text>
                        <Text style={[
                           styles.dayNumber,
                           { color: colors.text },
                           isActive && [styles.dayNumberActive, { color: '#fff' }]
                        ]}>{day.date}</Text>
                        {isTodayDate && !isActive && (
                           <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                        )}
                     </Pressable>
                  );
               })}
            </View>

            {/* Поиск и фильтры */}
            <SearchBar
               value={searchQuery}
               onChangeText={setSearchQuery}
               onClear={clearSearch}
               placeholder={t('field.searchEvents')}
            />

            <FilterPanel
               selectedTags={selectedTags}
               onTagToggle={toggleTag}
               onClearFilters={clearTags}
            />

            <View style={[styles.timelineWrapper, { backgroundColor: colors.cardBackground }]}>
               {isLoading ? (
                  <View style={styles.loadingState}>
                     <ActivityIndicator size="large" color={colors.primary} />
                     <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('calendar.loadingTasks')}</Text>
                  </View>
               ) : tasks.length === 0 ? (
                  <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
                     <Ionicons name="sunny" size={28} color={colors.textMuted} />
                     <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('calendar.nothingPlanned')}</Text>
                     <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('calendar.addNewTask')}</Text>
                  </View>
               ) : (
                  tasks.map((event, index) => {
                     const isLast = index === tasks.length - 1;
                     const isGlobal = event.isGlobal === true;
                     
                     // Проверяем, прикреплен ли текущий пользователь к задаче
                     const isUserJoined = isGlobal && auth.currentUser && event.participants && event.participants.includes(auth.currentUser.uid);
                     
                     // Получаем участников для глобальной задачи
                     const taskParticipants = isGlobal && participantsData[event.id] ? participantsData[event.id] : [];

                     return (
                        <View key={event.id} style={styles.eventRow}>
                           <Text style={[styles.eventTime, { color: colors.textMuted }]}>{formatTimeForDisplay(event.time)}</Text>
                           <View style={styles.nodeColumn}>
                              <View
                                 style={[
                                    styles.timelineNode,
                                    isDark && { backgroundColor: '#3a4255', borderColor: colors.surface },
                                    event.tone === 'highlight' && styles.timelineNodeHighlight,
                                    isGlobal && !event.tone && styles.timelineNodeGlobal
                                 ]}
                              />
                              {!isLast && <View style={[styles.nodeLine, isDark && { backgroundColor: colors.border }]} />}
                           </View>
                           {isGlobal ? (
                              <Pressable onPress={() => handleEventPress(event)} style={{ flex: 1 }}>
                                 <GlobalEventCard
                                    large
                                    title={event.title}
                                    subtitle={event.subtitle}
                                    color={event.color || '#2f7cff'}
                                    participants={taskParticipants}
                                    isJoined={isUserJoined}
                                 />
                              </Pressable>
                           ) : event.tone === 'highlight' ? (
                              // Активная задача - с градиентом и увеличенным размером
                              <LinearGradient
                                 colors={['#2f7cff', '#4a9eff', '#6bb5ff']}
                                 start={{ x: 0, y: 0 }}
                                 end={{ x: 0, y: 1 }}
                                 style={[styles.eventCardHighlightGradient, styles.eventCardHighlightActive]}
                              >
                                 <Pressable 
                                    style={styles.eventCardHighlightContent}
                                    onPress={() => handleEventPress(event)}
                                 >
                                    <Text style={styles.eventTitleHighlight}>
                                       {event.title}
                                    </Text>
                                    <Text style={styles.eventSubtitleHighlight}>
                                       {event.subtitle}
                                    </Text>
                                 </Pressable>
                              </LinearGradient>
                           ) : (
                              // Обычная задача
                              <Pressable 
                                 style={[styles.eventCard, { backgroundColor: colors.surface }]}
                                 onPress={() => handleEventPress(event)}
                              >
                                 <Text style={[styles.eventTitle, { color: colors.text }]}>
                                    {event.title}
                                 </Text>
                                 <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
                                    {event.subtitle}
                                 </Text>
                              </Pressable>
                           )}
                        </View>
                     );
                  })
               )}
            </View>
         </ScrollView>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />

         <EventDetailsModal
            visible={eventModal.isVisible}
            event={eventModal.selectedEvent}
            onClose={eventModal.close}
            onDelete={handleDeleteEvent}
         />

         <FloatingActionButton onPress={() => navigation.navigate('AddTask')} />
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
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
      fontSize: 14,
   },
   title: {
      fontSize: 36,
      fontWeight: '700',
      marginTop: 4,
   },
   avatar: {
      width: 52,
      height: 52,
      borderRadius: 20,
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
   timelineNodeGlobal: {
      backgroundColor: '#2f6cff',
      borderWidth: 0,
   },
   nodeLine: {
      width: 2,
      flex: 1,
      backgroundColor: '#e6ecf7',
      marginTop: 6,
   },
   eventCard: {
      flex: 1,
      borderRadius: 20,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
   },
   eventCardHighlightGradient: {
      flex: 1,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
   },
   eventCardHighlightActive: {
      marginVertical: 4,
      marginHorizontal: -4,
      padding: 2,
   },
   eventCardHighlightContent: {
      padding: 20,
   },
   eventTitle: {
      fontWeight: '600',
      fontSize: 16,
      marginBottom: 6,
   },
   eventTitleHighlight: {
      color: '#fff',
   },
   eventSubtitle: {
      fontSize: 12,
      lineHeight: 18,
   },
   eventSubtitleHighlight: {
      color: 'rgba(255,255,255,0.85)',
   },
   eventTitleGlobal: {
      color: '#1f2b3f',
      fontWeight: '700',
   },
   descriptionGradient: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 8,
   },
   eventSubtitleGlobal: {
      color: '#6a748b',
      fontSize: 12,
      lineHeight: 18,
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
      borderRadius: 16,
      backgroundColor: '#f4f7ff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#fff',
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
      marginBottom: 12,
   },
   emptyTitle: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
   },
   emptySubtitle: {
      marginTop: 4,
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
