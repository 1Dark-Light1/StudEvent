/**
 * MainScreen hosts the calendar-centric home hub. It combines a hero header, a stylised
 * month grid and an agenda list so students can scan their day quickly.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
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
import { useTaskFilters, useParticipants, useEventModal, toEventDetails } from '../calendarShared';
import { getMonthData } from './monthData';
import MonthHeader from './MonthHeader';
import MonthGrid from './MonthGrid';
import AgendaList from './AgendaList';

export default function Main({ navigation, route }) {
   const { t } = useI18n();
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
            <MonthHeader
               monthName={activeMonth.name}
               year={activeMonth.year}
               onPrevMonth={() => shiftMonth(-1)}
               onNextMonth={() => shiftMonth(1)}
               onOpenProfile={() => navigation.navigate('Settings')}
               onOpenAlerts={() => navigation.navigate('Alerts')}
            />

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

               <MonthGrid days={activeMonth.calendar} monthName={activeMonth.name} />

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
                  <AgendaList
                     agenda={activeMonth.agenda}
                     participants={participantsData}
                     onEventPress={handleEventPress}
                  />
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
   scroll: {
      paddingBottom: 140,
      flexGrow: 1,
   },
   body: {
      paddingHorizontal: 22,
      marginTop: -34,
      paddingTop: 6,
   },
   filterSection: {
      marginTop: -12,
      marginBottom: 16,
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