/**
 * CompletedTasksScreen - сторінка для перегляду виконаних та невиконаних задач
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import { subscribeToUserTasks, autoMarkUncompletedTasks } from '../../../services/tasksService';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * Переключатель виконані/невиконані (як modeSelector в AddTaskScreen)
 */
function TaskToggle({ activeTab, onTabChange, t, colors }) {
   return (
      <LinearGradient
         colors={colors.heroGradient}
         start={{ x: 0, y: 0 }}
         end={{ x: 0, y: 1 }}
         style={styles.toggleContainer}
      >
         <Pressable
            style={[styles.toggleSegment, activeTab === 'completed' && [styles.toggleSegmentActive, { backgroundColor: colors.surface }]]}
            onPress={() => onTabChange('completed')}
         >
            <Text 
               style={[
                  styles.toggleText,
                  { color: activeTab === 'completed' ? colors.text : '#fff' },
                  activeTab === 'completed' && styles.toggleTextActive
               ]}
               numberOfLines={1}
               adjustsFontSizeToFit={true}
               minimumFontScale={0.8}
            >
               {t('completed.completed')}
            </Text>
         </Pressable>
         <Pressable
            style={[styles.toggleSegment, activeTab === 'uncompleted' && [styles.toggleSegmentActive, { backgroundColor: colors.surface }]]}
            onPress={() => onTabChange('uncompleted')}
         >
            <Text 
               style={[
                  styles.toggleText,
                  { color: activeTab === 'uncompleted' ? colors.text : '#fff' },
                  activeTab === 'uncompleted' && styles.toggleTextActive
               ]}
               numberOfLines={1}
               adjustsFontSizeToFit={true}
               minimumFontScale={0.8}
            >
               {t('completed.uncompleted')}
            </Text>
         </Pressable>
      </LinearGradient>
   );
}

/**
 * Форматує дату для відображення
 */
function formatDateForDisplay(dateString, t) {
   const [day, month, year] = dateString.split('.');
   const monthNames = [
      t('date.january'), t('date.february'), t('date.march'), t('date.april'), t('date.may'), t('date.june'),
      t('date.july'), t('date.august'), t('date.september'), t('date.october'), t('date.november'), t('date.december')
   ];
   return `${day} ${monthNames[parseInt(month) - 1]} ${year}`;
}

/**
 * Форматує час для відображення
 */
function formatTimeForDisplay(timeString) {
   if (!timeString) return '';
   if (timeString.includes('-')) {
      const [from, to] = timeString.split('-');
      return `${formatSingleTime(from)} - ${formatSingleTime(to)}`;
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

export default function CompletedTasks({ navigation, route }) {
   const { t } = useI18n();
   const { colors } = useTheme();
   const activeRoute = route?.name ?? 'CompletedTasks';
   const [activeTab, setActiveTab] = useState('completed'); // 'completed' or 'uncompleted'
   const [tasks, setTasks] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);

   // Завантаження задач
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
         
         setTasks(loadedTasks);
         setIsLoading(false);
      });

      return () => {
         if (unsubscribe) unsubscribe();
      };
   }, []);

   // Фільтрація задач за статусом
   const filteredTasks = tasks.filter(task => {
      let isCompleted = false;
      let isUncompleted = false;
      
      if (task.isGlobal && task.userCompletions && auth.currentUser) {
         // Для глобальних задач перевіряємо статус користувача
         const userCompletion = task.userCompletions[auth.currentUser.uid];
         if (userCompletion) {
            isCompleted = userCompletion.isCompleted === true;
            isUncompleted = userCompletion.isUncompleted === true;
         }
      } else {
         // Для звичайних задач перевіряємо загальний статус
         isCompleted = task.isCompleted === true;
         isUncompleted = task.isUncompleted === true;
      }
      
      if (activeTab === 'completed') {
         return isCompleted;
      } else {
         return isUncompleted;
      }
   });

   // Групування задач за датою
   const tasksByDate = {};
   filteredTasks.forEach(task => {
      const dateKey = task.date || 'no-date';
      if (!tasksByDate[dateKey]) {
         tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
   });

   // Сортування дат
   const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
      if (a === 'no-date') return 1;
      if (b === 'no-date') return -1;
      const [dayA, monthA, yearA] = a.split('.');
      const [dayB, monthB, yearB] = b.split('.');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
      return dateB - dateA; // Новіші спочатку
   });

   const onRefresh = async () => {
      setRefreshing(true);
      try {
         await autoMarkUncompletedTasks();
         // Дані оновляться автоматично через subscribeToUserTasks
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
                  tintColor={colors.primary}
                  progressViewOffset={Platform.OS === 'ios' ? 100 : 0}
               />
            }
         >
            <View style={styles.header}>
               <Text style={[styles.title, { color: colors.text }]}>{t('completed.title')}</Text>
            </View>

            {/* Переключатель */}
            <View style={styles.toggleWrapper}>
               <TaskToggle 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab}
                  t={t}
                  colors={colors}
               />
            </View>

            {/* Список задач */}
            {isLoading ? (
               <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('completed.loading')}</Text>
               </View>
            ) : sortedDates.length === 0 ? (
               <View style={styles.emptyContainer}>
                  <Ionicons 
                     name={activeTab === 'completed' ? 'checkmark-circle-outline' : 'close-circle-outline'} 
                     size={48} 
                     color={colors.textMuted} 
                  />
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                     {activeTab === 'completed' 
                        ? t('completed.noCompletedTasks') 
                        : t('completed.noUncompletedTasks')}
                  </Text>
               </View>
            ) : (
               <View style={styles.tasksContainer}>
                  {sortedDates.map(dateKey => {
                     const dateTasks = tasksByDate[dateKey];
                     return (
                        <View key={dateKey} style={styles.dateGroup}>
                           <Text style={styles.dateLabel}>
                              {dateKey === 'no-date' 
                                 ? t('completed.noDate') 
                                 : formatDateForDisplay(dateKey, t)}
                           </Text>
                           {dateTasks.map(task => {
                              let timeDisplay = '';
                              if (task.timeDilation && task.fromTime && task.toTime) {
                                 timeDisplay = `${task.fromTime}-${task.toTime}`;
                              } else if (task.time) {
                                 timeDisplay = task.time;
                              }

                              return (
                                 <Pressable
                                    key={task.id}
                                    style={[styles.taskCard, { backgroundColor: colors.cardBackground }]}
                                    onPress={() => {
                                       // Навігація до UserCalendar з датою задачі
                                       navigation.navigate('UserCalendar', { 
                                          initialDate: task.date 
                                       });
                                    }}
                                 >
                                    <View style={styles.taskContent}>
                                       <View style={[
                                          styles.taskColorIndicator,
                                          { backgroundColor: task.taskColor || colors.primary }
                                       ]} />
                                       <View style={styles.taskInfo}>
                                          <Text style={[styles.taskName, { color: colors.text }]}>{task.name}</Text>
                                          {task.description && (
                                             <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                                {task.description}
                                             </Text>
                                          )}
                                          <View style={styles.taskMeta}>
                                             {timeDisplay && (
                                                <View style={styles.taskMetaItem}>
                                                   <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                                                   <Text style={[styles.taskMetaText, { color: colors.textMuted }]}>
                                                      {formatTimeForDisplay(timeDisplay)}
                                                   </Text>
                                                </View>
                                             )}
                                             {task.tagText && (
                                                <View style={styles.taskMetaItem}>
                                                   <View style={[
                                                      styles.taskTag,
                                                      { backgroundColor: task.taskColor || colors.primary }
                                                   ]}>
                                                      <Text style={styles.taskTagText}>{task.tagText}</Text>
                                                   </View>
                                                </View>
                                             )}
                                          </View>
                                       </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                 </Pressable>
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

const styles = StyleSheet.create({
   screen: {
      flex: 1,
   },
   scroll: {
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 140,
   },
   header: {
      marginBottom: 24,
      alignItems: 'center',
   },
   title: {
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
   },
   toggleWrapper: {
      marginBottom: 24,
      alignItems: 'center',
   },
   toggleContainer: {
      alignSelf: 'center',
      flexDirection: 'row',
      borderRadius: 40,
      padding: 5,
      overflow: 'hidden',
      minHeight: 50,
   },
   toggleSegment: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      minWidth: 120,
   },
   toggleSegmentActive: {
      backgroundColor: '#FFFFFF',
   },
   toggleText: {
      fontSize: 15,
      color: '#FFFFFF',
      fontWeight: '600',
   },
   toggleTextActive: {
      color: '#000000',
   },
   loadingContainer: {
      alignItems: 'center',
      paddingVertical: 60,
   },
   loadingText: {
      marginTop: 12,
      color: '#9aa7bd',
      fontSize: 14,
   },
   emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
   },
   emptyText: {
      marginTop: 16,
      fontSize: 16,
      color: '#9aa7bd',
      textAlign: 'center',
   },
   tasksContainer: {
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
   taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
   },
   taskContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
   },
   taskColorIndicator: {
      width: 4,
      height: '100%',
      borderRadius: 2,
      marginRight: 12,
      minHeight: 40,
   },
   taskInfo: {
      flex: 1,
   },
   taskName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
   },
   taskDescription: {
      fontSize: 13,
      marginBottom: 8,
      lineHeight: 18,
   },
   taskMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
   },
   taskMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
   },
   taskMetaText: {
      fontSize: 12,
   },
   taskTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
   },
   taskTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#fff',
   },
});
