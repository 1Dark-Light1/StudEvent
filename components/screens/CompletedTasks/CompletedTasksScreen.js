/**
 * CompletedTasksScreen - completed and uncompleted tasks
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import SegmentedToggle from '../../ui/SegmentedToggle';
import { subscribeToUserTasks, autoMarkUncompletedTasks } from '../../../services/tasksService';
import { compareDateStrings } from '../../../services/taskRules';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function CompletedTasks({ navigation, route }) {
   const { t, tagLabel, displayDate, displayTime } = useI18n();
   const { colors } = useTheme();
   const activeRoute = route?.name ?? 'CompletedTasks';
   const [activeTab, setActiveTab] = useState('completed'); // 'completed' or 'uncompleted'
   const [tasks, setTasks] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);

   // Load tasks
   useEffect(() => {
      if (!auth.currentUser) {
         setIsLoading(false);
         return;
      }

      setIsLoading(true);
      let isFirstLoad = true;
      const unsubscribe = subscribeToUserTasks(async (loadedTasks) => {
         // Mark overdue tasks as uncompleted, only on the first load
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

   // Filter tasks by status
   const filteredTasks = tasks.filter(task => {
      let isCompleted = false;
      let isUncompleted = false;
      
      if (task.isGlobal && task.userCompletions && auth.currentUser) {
         // Global tasks: use the current user's status
         const userCompletion = task.userCompletions[auth.currentUser.uid];
         if (userCompletion) {
            isCompleted = userCompletion.isCompleted === true;
            isUncompleted = userCompletion.isUncompleted === true;
         }
      } else {
         // Own tasks: use the task status
         isCompleted = task.isCompleted === true;
         isUncompleted = task.isUncompleted === true;
      }
      
      if (activeTab === 'completed') {
         return isCompleted;
      } else {
         return isUncompleted;
      }
   });

   // Group tasks by date
   const tasksByDate = {};
   filteredTasks.forEach(task => {
      const dateKey = task.date || 'no-date';
      if (!tasksByDate[dateKey]) {
         tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
   });

   // Sort dates
   const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
      if (a === 'no-date') return 1;
      if (b === 'no-date') return -1;
      return compareDateStrings(b, a); // newest first
   });

   const onRefresh = async () => {
      setRefreshing(true);
      try {
         await autoMarkUncompletedTasks();
         // The list updates through subscribeToUserTasks
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
            <View style={styles.header}>
               <Text style={[styles.title, { color: colors.text }]}>{t('completed.title')}</Text>
            </View>

            {/* Completed / uncompleted switch */}
            <View style={styles.toggleWrapper}>
               <SegmentedToggle
                  options={[
                     { value: 'completed', label: t('completed.completed') },
                     { value: 'uncompleted', label: t('completed.uncompleted') },
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
               />
            </View>

            {/* Task list */}
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
                           <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                              {dateKey === 'no-date' 
                                 ? t('completed.noDate') 
                                 : displayDate(dateKey)}
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
                                       // Open the personal calendar on the task's date
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
                                                      {displayTime(timeDisplay)}
                                                   </Text>
                                                </View>
                                             )}
                                             {task.tagText && (
                                                <View style={styles.taskMetaItem}>
                                                   <View style={[
                                                      styles.taskTag,
                                                      { backgroundColor: task.taskColor || colors.primary }
                                                   ]}>
                                                      <Text style={styles.taskTagText}>{tagLabel(task.tagText)}</Text>
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
