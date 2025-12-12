/**
 * MainScreen hosts the calendar-centric home hub. It combines a hero header, a stylised
 * month grid and an agenda list so students can scan their day quickly.
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Animated, Easing, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import { subscribeToUserTasks, isTaskActive } from '../../../services/tasksService';
import { auth } from '../../../FireBaseConfig';

/**
 * Builds a 7-column grid that includes leading/trailing muted days so layout never shifts.
 */
function buildCalendar({ year, month, tasks = [] }) {
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

   // Дни текущего месяца
   for (let day = 1; day <= daysInMonth; day += 1) {
      const entry = { label: String(day) };
      const dayTasks = tasksByDay[day] || [];

      if (dayTasks.length > 0) {
         // Выделяем день с задачами
         const hasActiveTask = dayTasks.some(task => isTaskActive(task));
         if (hasActiveTask) {
            entry.highlight = '#d9ecff';
         } else {
            // Используем цвет первой задачи для outline
            entry.outline = dayTasks[0].taskColor || '#d7c5ff';
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
            time: timeDisplay,
            title: task.name,
            subtitle: task.description,
            color: task.taskColor || '#8dddbd',
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
function getMonthData(year, month, tasks) {
   const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
   ];

   return {
      name: monthNames[month],
      year: String(year),
      month: month,
      yearNum: year,
      calendar: buildCalendar({ year, month, tasks }),
      agenda: formatTasksForAgenda(tasks, year, month),
   };
}

export default function Main({ navigation, route }) {
   const today = new Date();
   const [currentYear, setCurrentYear] = useState(today.getFullYear());
   const [currentMonth, setCurrentMonth] = useState(today.getMonth());
   const [tasks, setTasks] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const activeRoute = route?.name ?? 'Main';

   const activeMonth = getMonthData(currentYear, currentMonth, tasks);

   // Загрузка задач из Firestore
   useEffect(() => {
      if (!auth.currentUser) {
         setIsLoading(false);
         return;
      }

      setIsLoading(true);
      const unsubscribe = subscribeToUserTasks((loadedTasks) => {
         setTasks(loadedTasks);
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
   /** 
    *Starts the refresh button rotation animation 
    
    *And returns the calendar to the initial month.
   */
   const rotateAnim = useState(new Animated.Value(0))[0];
   const [isRefreshing, setIsRefreshing] = useState(false);

   const refreshCalendar = () => {
      if (isRefreshing) return;

      setIsRefreshing(true);

      //Start Animation
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, {
         toValue: 1,
         duration: 600,
         easing: Easing.linear,
         useNativeDriver: true
      }).start(() => {
         setCurrentYear(today.getFullYear());
         setCurrentMonth(today.getMonth());

         setTimeout(() => {
            setIsRefreshing(false);
         }, 200)
      })
   };

   const spin = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
   });



   return (
      <View style={styles.screen}>
         <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={["#3b85ff", "#8fc5ff"]} style={styles.hero}>
               <View style={styles.headerRow}>

                  <View style={styles.avatar}>
                     <Pressable
                        onPress={() => navigation.navigate('Settings')}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, })}
                     >
                        <Ionicons name="person" size={22} color="#1d3f72" />
                     </Pressable>
                  </View>

                  <View style={styles.monthBlock}>
                     <View style={styles.monthSwitcher}>
                        <Pressable style={styles.monthBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
                           <Ionicons name="chevron-back" size={18} color="#1f3d68" />
                        </Pressable>
                        <View style={styles.monthRow}>
                           <Text style={styles.monthText}>{activeMonth.name}</Text>
                        </View>
                        <Pressable style={styles.monthBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
                           <Ionicons name="chevron-forward" size={18} color="#1f3d68" />
                        </Pressable>
                     </View>
                     <Text style={styles.yearText}>{activeMonth.year}</Text>

                     {/*Animation-Imitation Refresh*/}
                  </View>
                  <Pressable style={styles.refreshBtn} onPress={refreshCalendar}>
                     <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="refresh" size={18} color="#1f3d68" />
                     </Animated.View>
                  </Pressable>
               </View>

            </LinearGradient>

            <View style={styles.body}>
               <View style={styles.searchRow}>
                  <Ionicons name="search" size={18} color="#8ea2c0" />
                  <Text style={styles.searchText}>Search</Text>
                  <View style={styles.searchSpacer} />
                  <View style={styles.searchMood}>
                     <Ionicons name="happy" size={18} color="#fff" />
                  </View>
                  <Pressable style={styles.searchTag}>
                     <Ionicons name="calendar" size={18} color="#2e63c3" />
                  </Pressable>
               </View>

               <View style={styles.calendarCard}>
                  <View style={styles.weekRow}>
                     {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <Text key={day} style={styles.weekLabel}>
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
                                       day.highlight && { backgroundColor: day.highlight },
                                       day.outline && { borderColor: day.outline, borderWidth: 1.5 },
                                    ]}
                                 >
                                    <Text
                                       style={[
                                          styles.dateText,
                                          day.highlight && { color: '#1a3d64' },
                                          day.muted && styles.dateTextMuted,
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
                     <ActivityIndicator size="large" color="#3b85ff" />
                     <Text style={styles.loadingText}>Loading tasks...</Text>
                  </View>
               ) : activeMonth.agenda.length === 0 ? (
                  <View style={styles.emptyAgenda}>
                     <Ionicons name="calendar-outline" size={32} color="#d0d8ec" />
                     <Text style={styles.emptyAgendaText}>No tasks scheduled</Text>
                     <Text style={styles.emptyAgendaSubtext}>Tap + to add a new task</Text>
                  </View>
               ) : (
                  activeMonth.agenda.map((block) => (
                     <View key={block.day} style={styles.agendaBlock}>
                        <Text style={styles.agendaLabel}>{block.day}</Text>
                        {block.items.map((item, idx) => {
                           const isLast = idx === block.items.length - 1;
                           return (
                              <View key={`${block.day}-${item.time}-${item.title}`} style={styles.agendaRow}>
                                 <Text style={styles.timeText}>{item.time}</Text>
                                 <View style={styles.timeline}>
                                    <View style={[styles.bullet, { backgroundColor: item.color }]} />
                                    <View style={[styles.timelineLine, isLast && styles.timelineLineHidden]} />
                                 </View>
                                 <View style={styles.agendaCard}>
                                    <Text style={styles.agendaTitle}>{item.title}</Text>
                                    {item.subtitle && <Text style={styles.agendaSubtitle}>{item.subtitle}</Text>}
                                 </View>
                              </View>
                           );
                        })}
                     </View>
                  ))
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
      backgroundColor: '#eef4ff',
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
      backgroundColor: '#dfe9ff',
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
      backgroundColor: '#f0f5ff',
      alignItems: 'center',
      justifyContent: 'center',
   },
   searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: -12,
      backgroundColor: '#f6f8ff',
      borderRadius: 18,
      paddingHorizontal: 16,
      height: 52,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
   },
   searchText: {
      flex: 1,
      marginLeft: 10,
      color: '#8ea2c0',
   },
   searchSpacer: {
      flex: 0,
   },
   searchMood: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: '#3a7efb',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
   },
   searchTag: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
   },
   calendarCard: {
      backgroundColor: '#fff',
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
      color: '#b0bbd6',
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
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ecf0fb',
      marginBottom: 6,
   },
   dateText: {
      color: '#1b2d4e',
      fontWeight: '600',
   },
   dateTextMuted: {
      color: '#c4cbdc',
   },
   agendaBlock: {
      marginTop: 28,
   },
   agendaLabel: {
      fontSize: 13,
      color: '#9aa8c2',
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
      color: '#b0bbd6',
      fontWeight: '600',
   },
   timeline: {
      alignItems: 'center',
      marginRight: 12,
   },
   bullet: {
      width: 12,
      height: 12,
      borderRadius: 6,
   },
   timelineLine: {
      width: 2,
      height: 48,
      backgroundColor: '#e3e8f4',
      marginTop: 4,
   },
   timelineLineHidden: {
      opacity: 0,
   },
   agendaCard: {
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 14,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
   },
   agendaTitle: {
      color: '#1a2c4f',
      fontWeight: '600',
      marginBottom: 4,
   },
   agendaSubtitle: {
      color: '#99a7c3',
      fontSize: 12,
   },
   loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
      marginTop: 28,
   },
   loadingText: {
      marginTop: 12,
      color: '#99a7c3',
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
      color: '#1a2c4f',
   },
   emptyAgendaSubtext: {
      marginTop: 4,
      color: '#99a7c3',
      fontSize: 12,
   },
});