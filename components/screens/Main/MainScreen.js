/**
 * MainScreen hosts the calendar-centric home hub. It combines a hero header, a stylised
 * month grid and an agenda list so students can scan their day quickly.
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import SearchBar from '../../ui/SearchBar';
import FilterPanel from '../../ui/FilterPanel';
import { subscribeToUserTasks, isTaskActive, applyTaskFilters, autoMarkUncompletedTasks, deleteTask } from '../../../services/tasksService';
import { getUsersDataByIds } from '../../../services/userService';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import EventDetailsModal from '../../ui/EventDetailsModal';

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
   const { t } = useI18n();
   const { colors } = useTheme();
   const today = new Date();
   const [currentYear, setCurrentYear] = useState(today.getFullYear());
   const [currentMonth, setCurrentMonth] = useState(today.getMonth());
   const [tasks, setTasks] = useState([]);
   const [rawTasks, setRawTasks] = useState([]); // Сохраняем оригинальные данные
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedTags, setSelectedTags] = useState([]);
   const [participantsData, setParticipantsData] = useState({}); // Кэш данных участников по taskId
   const [refreshing, setRefreshing] = useState(false);
   const [selectedEvent, setSelectedEvent] = useState(null);
   const [isModalVisible, setIsModalVisible] = useState(false);
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
         setRawTasks(loadedTasks); // Сохраняем оригинальные данные
         // Применяем фильтры
         const filteredTasks = applyTaskFilters(loadedTasks, searchQuery, selectedTags);
         setTasks(filteredTasks);
         setIsLoading(false);
      });

      return () => {
         if (unsubscribe) unsubscribe();
      };
   }, []);

   // Применяем фильтры при изменении поиска или тегов
   useEffect(() => {
      // Завжди застосовуємо фільтри, навіть якщо rawTasks порожній
      // Це гарантує, що глобальні таски не зникнуть
      const filteredTasks = applyTaskFilters(rawTasks, searchQuery, selectedTags);
      setTasks(filteredTasks);
   }, [searchQuery, selectedTags, rawTasks]);

   // Загружаем данные участников для глобальных задач
   useEffect(() => {
      const loadParticipants = async () => {
         if (rawTasks.length === 0) {
            // Очищаємо кеш, якщо задач немає
            setParticipantsData({});
            return;
         }
         
         // Очищаємо кеш для задач, яких більше немає
         const currentTaskIds = new Set(rawTasks.map(task => task.id));
         setParticipantsData(prev => {
            const cleaned = {};
            Object.keys(prev).forEach(taskId => {
               if (currentTaskIds.has(taskId)) {
                  cleaned[taskId] = prev[taskId];
               }
            });
            return cleaned;
         });
         
         const globalTasksWithParticipants = rawTasks.filter(task => task.isGlobal && task.participants && task.participants.length > 0);
         const participantsMap = {};
         
         for (const task of globalTasksWithParticipants) {
            if (!participantsData[task.id] && task.participants && task.participants.length > 0) {
               const usersData = await getUsersDataByIds(task.participants);
               participantsMap[task.id] = usersData;
            }
         }
         
         if (Object.keys(participantsMap).length > 0) {
            setParticipantsData(prev => ({ ...prev, ...participantsMap }));
         }
      };
      
      loadParticipants();
   }, [rawTasks]);

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

   // Обработчики для поиска и фильтров
   const handleSearchChange = (text) => {
      setSearchQuery(text);
   };

   const handleSearchClear = () => {
      setSearchQuery('');
   };

   const handleTagToggle = (tag) => {
      setSelectedTags(prev => {
         if (prev.includes(tag)) {
            return prev.filter(t => t !== tag);
         } else {
            return [...prev, tag];
         }
      });
   };

   const handleClearFilters = () => {
      setSelectedTags([]);
   };

   const onRefresh = async () => {
      setRefreshing(true);
      try {
         // Перекидаємо на поточний місяць
         const today = new Date();
         setCurrentYear(today.getFullYear());
         setCurrentMonth(today.getMonth());
         
         // Очищаємо фільтри
         setSearchQuery('');
         setSelectedTags([]);
         
         // Очищаємо кеш учасників
         setParticipantsData({});
         
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
      // Знаходимо повну задачу за id
      const fullTask = rawTasks.find(t => t.id === item.id);
      if (!fullTask) return;

      const isActive = isTaskActive(fullTask);

      setSelectedEvent({
         id: fullTask.id,
         title: fullTask.name,
         subtitle: fullTask.description,
         time: item.time,
         color: fullTask.taskColor || item.color,
         tone: isActive ? 'highlight' : 'frost',
         date: fullTask.date,
         tagText: fullTask.tagText,
         name: fullTask.name,
         description: fullTask.description,
         isGlobal: fullTask.isGlobal || false,
         timeDilation: fullTask.timeDilation || false,
         fromTime: fullTask.fromTime || null,
         toTime: fullTask.toTime || null,
      });
      setIsModalVisible(true);
   };

   const handleCloseModal = () => {
      setIsModalVisible(false);
      setSelectedEvent(null);
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
         <ScrollView 
            contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]} 
            showsVerticalScrollIndicator={false}
            style={[styles.scrollView, { backgroundColor: colors.background }]}
            bounces={true}
            alwaysBounceVertical={false}
            refreshControl={
               <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                  progressViewOffset={Platform.OS === 'ios' ? 100 : 0}
               />
            }
         >
            <View style={[styles.topBounceBackground, { backgroundColor: colors.heroGradient[0] }]} />
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
                     onChangeText={handleSearchChange}
                     onClear={handleSearchClear}
                     placeholder={t('field.searchEvents')}
                  />

                  <FilterPanel
                     selectedTags={selectedTags}
                     onTagToggle={handleTagToggle}
                     onClearFilters={handleClearFilters}
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
                           const displayParticipants = taskParticipants.slice(0, 4);
                           
                           // Проверяем, прикреплен ли текущий пользователь к задаче
                           const isUserJoined = isGlobal && auth.currentUser && item.participants && item.participants.includes(auth.currentUser.uid);
                           
                           // Для админских задач используем цвет тага с градиентом
                           const adminTagColor = isGlobal ? (item.color || '#2f7cff') : '#2f7cff';
                           const adminGradientColors = isGlobal 
                              ? [adminTagColor, `${adminTagColor}E6`, `${adminTagColor}CC`, `${adminTagColor}99`]
                              : [item.color || '#2f7cff', `${item.color || '#2f7cff'}E6`, `${item.color || '#2f7cff'}CC`];
                           
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
                                 <Text style={[styles.timeText, { color: colors.textMuted }]}>{item.time}</Text>
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
                                    <LinearGradient
                                       colors={adminGradientColors}
                                       start={{ x: 0, y: 0 }}
                                       end={{ x: 0, y: 1 }}
                                       style={styles.agendaCardGlobal}
                                    >
                                       <View style={styles.agendaCardGlobalContent}>
                                          <View style={styles.agendaCardGlobalText}>
                                             <Text style={styles.agendaTitleGlobal}>{item.title}</Text>
                                             {item.subtitle && (
                                                <Text style={styles.agendaSubtitleGlobal}>{item.subtitle}</Text>
                                             )}
                                             {displayParticipants.length > 0 && (
                                                <View style={styles.agendaParticipantsRow}>
                                                   {displayParticipants.map((participant, pIdx) => (
                                                      <View 
                                                         key={pIdx} 
                                                         style={[
                                                            styles.agendaParticipantAvatar, 
                                                            { backgroundColor: adminTagColor },
                                                            pIdx > 0 && { marginLeft: -8 }
                                                         ]}
                                                      >
                                                         <Ionicons name="person" size={14} color="#fff" />
                                                      </View>
                                                   ))}
                                                </View>
                                             )}
                                          </View>
                                       </View>
                                       {isGlobal && (
                                          <View style={styles.agendaJoinStatusIcon}>
                                             {isUserJoined ? (
                                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                             ) : (
                                                <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.7)" />
                                             )}
                                          </View>
                                       )}
                                    </LinearGradient>
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
            visible={isModalVisible}
            event={selectedEvent}
            onClose={handleCloseModal}
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
   topBounceBackground: {
      position: 'absolute',
      top: -1000,
      left: 0,
      right: 0,
      height: 1000,
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
   agendaCardGlobal: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      minHeight: 70,
      position: 'relative',
   },
   agendaCardGlobalContent: {
      flex: 1,
   },
   agendaCardGlobalText: {
      flex: 1,
   },
   agendaTitle: {
      fontWeight: '600',
      marginBottom: 4,
   },
   agendaSubtitle: {
      fontSize: 12,
   },
   agendaTitleGlobal: {
      color: '#fff',
      fontWeight: '600',
      marginBottom: 6,
      fontSize: 15,
   },
   agendaSubtitleGlobal: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 12,
      marginBottom: 8,
   },
   agendaParticipantsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
   },
   agendaParticipantAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
   },
   agendaJoinStatusIcon: {
      position: 'absolute',
      bottom: 14,
      right: 14,
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