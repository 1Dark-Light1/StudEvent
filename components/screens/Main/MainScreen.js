/**
 * MainScreen hosts the calendar-centric home hub. It combines a hero header, a stylised
 * month grid and an agenda list so students can scan their day quickly.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import SearchBar from '../../ui/SearchBar';
import FilterPanel from '../../ui/FilterPanel';
import { subscribeToUserTasks, isTaskActive, applyTaskFilters, autoMarkUncompletedTasks, deleteTask } from '../../../services/tasksService';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import EventDetailsModal from '../../ui/EventDetailsModal';
import GlobalEventCard from '../../ui/GlobalEventCard';
import { useTaskFilters, useParticipants, useEventModal, toEventDetails } from '../calendarShared';

/**
 * Builds a 7-column grid that includes leading/trailing muted days so layout never shifts.
 */
function buildCalendar({ year, month, tasks = [], todayHighlightColor = '#d9ecff' }) {
   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);
   const daysInMonth = lastDay.getDate();
   const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник = 0
   const prevMonthDays = new Date(year, month, 0).getDate();

   // Группируем задачи по дням
   const tasksByDay = {};
   tasks.forEach(task => {
      const [day, monthStr, yearStr] = task.date.split('.');
      const taskMonth = parseInt(monthStr, 10) - 1;
      const taskYear = parseInt(yearStr, 10);

      if (taskMonth === month && taskYear === year) {
         const dayNum = parseInt(day, 10);
         if (!tasksByDay[dayNum]) {
            tasksByDay[dayNum] = [];
         }
         tasksByDay[dayNum].push(task);
      }
   });

   const grid = [];
   // Дни предыдущего месяца
   for (let i = startOffset; i > 0; i -= 1) {
      grid.push({ label: String(prevMonthDays - i + 1), muted: true });
   }

   // Перевіряємо, чи поточний день є сьогоднішнім
   const today = new Date();
   const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
   const todayDay = today.getDate();

   // Дни текущего месяца
   for (let day = 1; day <= daysInMonth; day += 1) {
      const entry = { label: String(day) };
      const dayTasks = tasksByDay[day] || [];
      const isToday = isCurrentMonth && day === todayDay;

      // Highlight current day with light blue color
      if (isToday) {
         entry.todayHighlight = todayHighlightColor;
      }

      if (dayTasks.length > 0) {
         // Выделяем день с задачами
         const hasActiveTask = dayTasks.some(task => isTaskActive(task));
         const hasGlobalTask = dayTasks.some(task => task.isGlobal === true);
         
         if (hasActiveTask) {
            // Якщо це сьогодні, зберігаємо легко синій фон і додаємо обводку
            if (isToday) {
               entry.todayHighlight = todayHighlightColor;
               entry.outline = dayTasks[0].taskColor || '#d7c5ff';
            } else {
               entry.highlight = todayHighlightColor;
            }
         } else if (hasGlobalTask) {
            // Для глобальных задач - заполненный кружок
            const globalTask = dayTasks.find(task => task.isGlobal === true);
            if (isToday) {
               // Якщо це сьогодні, легко синій фон з обводкою кольору тага
               entry.todayHighlight = todayHighlightColor;
               entry.outline = globalTask.taskColor || '#2f6cff';
            } else {
               entry.filled = globalTask.taskColor || '#2f6cff';
            }
         } else {
            // Используем цвет первой задачи для outline
            if (isToday) {
               // Якщо це сьогодні, легко синій фон з обводкою
               entry.todayHighlight = todayHighlightColor;
               entry.outline = dayTasks[0].taskColor || '#d7c5ff';
            } else {
               entry.outline = dayTasks[0].taskColor || '#d7c5ff';
            }
         }
      }

      grid.push(entry);
   }

   // Дни следующего месяца - заполняем до 35 ячеек (5 недель по 7 дней)
   let next = 1;
   while (grid.length < 35) {
      grid.push({ label: String(next), muted: true });
      next += 1;
   }

   return grid;
}

/**
 * Форматирует задачи для отображения в agenda
 */
function formatTasksForAgenda(tasks, year, month) {
   const tasksByDay = {};

   tasks.forEach(task => {
      const [day, monthStr, yearStr] = task.date.split('.');
      const taskMonth = parseInt(monthStr, 10) - 1;
      const taskYear = parseInt(yearStr, 10);

      if (taskMonth === month && taskYear === year) {
         const dayNum = parseInt(day, 10);
         const date = new Date(taskYear, taskMonth, dayNum);
         const dayKey = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' }).toUpperCase();

         if (!tasksByDay[dayKey]) {
            tasksByDay[dayKey] = [];
         }

         let timeDisplay = '';
         if (task.timeDilation && task.fromTime && task.toTime) {
            timeDisplay = `${task.fromTime}-${task.toTime}`;
         } else if (task.time) {
            timeDisplay = task.time;
         }

         tasksByDay[dayKey].push({
            id: task.id,
            time: timeDisplay,
            title: task.name,
            subtitle: task.description,
            color: task.taskColor || '#8dddbd',
            isGlobal: task.isGlobal || false,
            participants: task.participants || [],
         });
      }
   });

   // Сортируем дни и задачи внутри дней
   const sortedDays = Object.keys(tasksByDay).sort((a, b) => {
      const dayA = parseInt(a.split(' ')[1]);
      const dayB = parseInt(b.split(' ')[1]);
      return dayA - dayB;
   });

   return sortedDays.map(day => ({
      day: day,
      items: tasksByDay[day].sort((a, b) => {
         if (!a.time) return 1;
         if (!b.time) return -1;
         return a.time.localeCompare(b.time);
      }),
   }));
}

/**
 * Генерирует данные для месяца
 */
function getMonthData(year, month, tasks, t, todayHighlightColor = '#d9ecff') {
   const monthNames = [
      t('date.january'), t('date.february'), t('date.march'), t('date.april'), t('date.may'), t('date.june'),
      t('date.july'), t('date.august'), t('date.september'), t('date.october'), t('date.november'), t('date.december')
   ];

   return {
      name: monthNames[month],
      year: String(year),
      month: month,
      yearNum: year,
      calendar: buildCalendar({ year, month, tasks, todayHighlightColor }),
      agenda: formatTasksForAgenda(tasks, year, month),
   };
}

export default function Main({ navigation, route }) {
   const { t, displayTime } = useI18n();
   const { colors } = useTheme();
   const today = new Date();
   const [currentYear, setCurrentYear] = useState(today.getFullYear());
   const [currentMonth, setCurrentMonth] = useState(today.getMonth());
   const [rawTasks, setRawTasks] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const { searchQuery, setSearchQuery, clearSearch, selectedTags, toggleTag, clearTags, resetFilters } = useTaskFilters();
   const participantsData = useParticipants(rawTasks);
   const eventModal = useEventModal();
   const tasks = useMemo(() => applyTaskFilters(rawTasks, searchQuery, selectedTags), [rawTasks, searchQuery, selectedTags]);
   const activeRoute = route?.name ?? 'Main';

   const activeMonth = getMonthData(currentYear, currentMonth, tasks, t, colors.todayHighlight);

   // Загрузка задач из Firestore
   useEffect(() => {
      if (!auth.currentUser) {
         setIsLoading(false);
         return;
      }

      setIsLoading(true);
      let isFirstLoad = true;
      
      const unsubscribe = subscribeToUserTasks(async (loadedTasks) => {
         // Автоматически отмечаем просроченные задачи только при первой загрузке
         if (isFirstLoad) {
            isFirstLoad = false;
            try {
               await autoMarkUncompletedTasks();
            } catch (error) {
               console.error('Error auto-marking uncompleted tasks:', error);
            }
         }
         
         // Всегда обновляем задачи (даже если массив пустой - это нормально)
         // Filtering happens in the effect below, whenever rawTasks changes
         setRawTasks(loadedTasks);
         setIsLoading(false);
      });

      return () => {
         if (unsubscribe) unsubscribe();
      };
   }, []);

   /** Перемещение между месяцами */
   const shiftMonth = (step) => {
      setCurrentMonth((prev) => {
         let newMonth = prev + step;
         let newYear = currentYear;

         if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
         } else if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
         }

         setCurrentYear(newYear);
         return newMonth;
      });
   };

   const onRefresh = async () => {
      setRefreshing(true);
      try {
         // Перекидаємо на поточний місяць
         const today = new Date();
         setCurrentYear(today.getFullYear());
         setCurrentMonth(today.getMonth());
         resetFilters();
         
         // Оновлюємо задачі
         await autoMarkUncompletedTasks();
         // Дані оновляться автоматично через subscribeToUserTasks
      } catch (error) {
         console.error('Error refreshing tasks:', error);
      } finally {
         setRefreshing(false);
      }
   };

   const handleEventPress = (item) => {
      const fullTask = rawTasks.find(task => task.id === item.id);
      if (!fullTask) return;
      eventModal.open(toEventDetails(fullTask, {
         time: item.time,
         color: fullTask.taskColor || item.color,
         tone: isTaskActive(fullTask) ? 'highlight' : 'frost',
      }));
   };

   const handleDeleteEvent = async (eventId) => {
      try {
         await deleteTask(eventId);
      } catch (error) {
         console.error('Error deleting task from main calendar:', error);
      }
   };

   return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
         <View style={[styles.refreshBackdrop, { backgroundColor: colors.heroGradient[0] }]} />
         <ScrollView 
            contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]} 
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            alwaysBounceVertical
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
            <LinearGradient colors={colors.heroGradient} style={styles.hero}>
               <View style={styles.headerRow}>

                  <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
                     <Pressable
                        onPress={() => navigation.navigate('Settings')}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, })}
                     >
                        <Ionicons name="person" size={22} color={colors.text} />
                     </Pressable>
                  </View>

                  <View style={styles.monthBlock}>
                     <View style={styles.monthSwitcher}>
                        <Pressable style={styles.monthBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
                           <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
                        </Pressable>
                        <View style={styles.monthRow}>
                           <Text style={styles.monthText}>{activeMonth.name}</Text>
                        </View>
                        <Pressable style={styles.monthBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
                           <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
                        </Pressable>
                     </View>
                     <Text style={styles.yearText}>{activeMonth.year}</Text>

                     {/*Animation-Imitation Refresh*/}
                  </View>
                  <Pressable 
                     style={[styles.refreshBtn, { backgroundColor: colors.iconBg }]} 
                     onPress={() => navigation.navigate('Alerts')}
                  >
                     <Ionicons name="notifications" size={18} color={colors.text} />
                  </Pressable>
               </View>

            </LinearGradient>

            <View style={styles.body}>
               {/* Поиск и фильтры */}
               <View style={styles.filterSection}>
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
               </View>

               <View style={[styles.calendarCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.weekRow}>
                     {[t('date.mon'), t('date.tue'), t('date.wed'), t('date.thu'), t('date.fri'), t('date.sat'), t('date.sun')].map((day, idx) => (
                        <Text key={idx} style={[styles.weekLabel, { color: colors.textMuted }]}>
                           {day}
                        </Text>
                     ))}
                  </View>
                  <View style={styles.dateGrid}>
                     {Array.from({ length: 5 }).map((_, rowIdx) => {
                        const rowStart = rowIdx * 7;
                        const rowItems = activeMonth.calendar.slice(rowStart, rowStart + 7);
                        return (
                           <View key={`row-${rowIdx}`} style={styles.dateRow}>
                              {rowItems.map((day, idx) => (
                                 <View
                                    key={`${activeMonth.name}-${rowIdx}-${idx}-${day.label}`}
                                    style={[
                                       styles.dateBadge,
                                       { backgroundColor: colors.surface, borderColor: colors.border },
                                       day.todayHighlight && { backgroundColor: day.todayHighlight },
                                       day.highlight && { backgroundColor: day.highlight },
                                       day.outline && { borderColor: day.outline, borderWidth: 1.5 },
                                       day.filled && { backgroundColor: day.filled, borderWidth: 0 },
                                    ]}
                                 >
                                    <Text
                                       style={[
                                          styles.dateText,
                                          { color: colors.text },
                                          day.highlight && { color: colors.text },
                                          day.filled && { color: '#fff' },
                                          day.muted && [styles.dateTextMuted, { color: colors.textMuted }],
                                       ]}
                                    >
                                       {day.label}
                                    </Text>
                                 </View>
                              ))}
                           </View>
                        );
                     })}
                  </View>
               </View>

               {isLoading ? (
                  <View style={styles.loadingContainer}>
                     <ActivityIndicator size="large" color={colors.primary} />
                     <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('main.loadingTasks')}</Text>
                  </View>
               ) : activeMonth.agenda.length === 0 ? (
                  <View style={styles.emptyAgenda}>
                     <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                     <Text style={[styles.emptyAgendaText, { color: colors.text }]}>{t('main.noTasksScheduled')}</Text>
                     <Text style={[styles.emptyAgendaSubtext, { color: colors.textSecondary }]}>{t('main.addNewTask')}</Text>
                  </View>
               ) : (
                  activeMonth.agenda.map((block) => (
                     <View key={block.day} style={styles.agendaBlock}>
                        <Text style={[styles.agendaLabel, { color: colors.textMuted }]}>{block.day}</Text>
                        {block.items.map((item, idx) => {
                           const isLast = idx === block.items.length - 1;
                           const isGlobal = item.isGlobal === true;
                           // Получаем участников для глобальной задачи
                           const taskParticipants = isGlobal && participantsData[item.id] ? participantsData[item.id] : [];
                           
                           // Проверяем, прикреплен ли текущий пользователь к задаче
                           const isUserJoined = isGlobal && auth.currentUser && item.participants && item.participants.includes(auth.currentUser.uid);
                           
                           // Для админских задач используем цвет тага с градиентом
                           const adminTagColor = isGlobal ? (item.color || '#2f7cff') : '#2f7cff';
                           
                           // Создаем более светлую обводку для кружечка админской задачи
                           // Используем тот же цвет с увеличенной прозрачностью для эффекта осветления
                           // Для обводки используем цвет с добавлением белого через opacity
                           const lightBorderColor = isGlobal ? adminTagColor + 'CC' : null;
                           
                           return (
                              <Pressable
                                 key={`${block.day}-${item.time}-${item.title}-${item.id}`}
                                 style={styles.agendaRow}
                                 onPress={() => handleEventPress(item)}
                              >
                                 <Text style={[styles.timeText, { color: colors.textMuted }]}>{displayTime(item.time)}</Text>
                                 <View style={styles.timeline}>
                                    <View 
                                       style={[
                                          styles.bullet, 
                                          { backgroundColor: isGlobal ? adminTagColor : item.color },
                                          isGlobal && [
                                             styles.bulletGlobal,
                                             lightBorderColor && { borderColor: lightBorderColor, borderWidth: 2 }
                                          ]
                                       ]} 
                                    />
                                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                                 </View>
                                 {isGlobal ? (
                                    <GlobalEventCard
                                       title={item.title}
                                       subtitle={item.subtitle}
                                       color={adminTagColor}
                                       participants={taskParticipants}
                                       isJoined={isUserJoined}
                                    />
                                 ) : (
                                    <View style={[styles.agendaCard, { backgroundColor: colors.cardBackground }]}>
                                       <Text style={[styles.agendaTitle, { color: colors.text }]}>{item.title}</Text>
                                       {item.subtitle && <Text style={[styles.agendaSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>}
                                    </View>
                                 )}
                              </Pressable>
                           );
                        })}
                     </View>
                  ))
               )}
            </View>
         </ScrollView>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />

         <FloatingActionButton onPress={() => navigation.navigate('AddTask')} />

         <EventDetailsModal
            visible={eventModal.isVisible}
            event={eventModal.selectedEvent}
            onClose={eventModal.close}
            onDelete={handleDeleteEvent}
         />
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
   },
   scrollView: {
      flex: 1,
   },
   refreshBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
   },
   hero: {
      borderBottomLeftRadius: 38,
      borderBottomRightRadius: 38,
      paddingTop: 60,
      paddingHorizontal: 22,
      paddingBottom: 50,
      overflow: 'hidden',
   },
   scroll: {
      paddingBottom: 140,
      flexGrow: 1,
   },
   body: {
      paddingHorizontal: 22,
      marginTop: -34,
      paddingTop: 6,
   },
   headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
   },
   avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
   },
   monthBlock: {
      flex: 1,
      alignItems: 'center',
   },
   monthSwitcher: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
   },
   monthBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
   },
   monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 130,
      position: 'relative',
   },
   monthText: {
      fontSize: 28,
      color: '#fefefe',
      fontWeight: '600',
   },
   yearText: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 13,
      marginTop: 6,
   },
   refreshBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
   },
   filterSection: {
      marginTop: -12,
      marginBottom: 16,
   },
   calendarCard: {
      borderRadius: 28,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginTop: 26,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
   },
   weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 18,
   },
   weekLabel: {
      fontSize: 12,
   },
   dateGrid: {
      flexDirection: 'column',
      gap: 10,
   },
   dateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
   },
   dateBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: 6,
   },
   dateText: {
      fontWeight: '600',
   },
   dateTextMuted: {
   },
   agendaBlock: {
      marginTop: 28,
   },
   agendaLabel: {
      fontSize: 13,
      marginBottom: 12,
      letterSpacing: 1,
   },
   agendaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
   },
   timeText: {
      width: 52,
      fontWeight: '600',
   },
   timeline: {
      alignItems: 'center',
      marginRight: 12,
      alignSelf: 'stretch',
   },
   bullet: {
      width: 12,
      height: 12,
      borderRadius: 6,
   },
   bulletGlobal: {
      width: 16,
      height: 16,
      borderRadius: 8,
   },
   timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      minHeight: 48,
   },
   agendaCard: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
   },
   agendaTitle: {
      fontWeight: '600',
      marginBottom: 4,
   },
   agendaSubtitle: {
      fontSize: 12,
   },
   loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
      marginTop: 28,
   },
   loadingText: {
      marginTop: 12,
      fontSize: 14,
   },
   emptyAgenda: {
      alignItems: 'center',
      paddingVertical: 40,
      marginTop: 28,
   },
   emptyAgendaText: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
   },
   emptyAgendaSubtext: {
      marginTop: 4,
      fontSize: 12,
   },
});