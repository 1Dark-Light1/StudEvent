/**
 * UserCalendarScreen focuses on the daily timeline experience.
 * It mixes a day-strip selector with a vertical schedule so users can
 * jump between days and immediately see context-rich events.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, AppState, Alert, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import SearchBar from '../../ui/SearchBar';
import FilterPanel from '../../ui/FilterPanel';
import EventDetailsModal from '../../ui/EventDetailsModal';
import { useTaskFilters, useParticipants, useEventModal, toEventDetails } from '../calendarShared';
import { generateWeekDays, calculateWeekOffset } from './weekData';
import DayStrip from './DayStrip';
import DayTimeline from './DayTimeline';
import { subscribeToTasksByDate, formatTaskForCalendar, applyTaskFilters, deleteTask, autoMarkUncompletedTasks } from '../../../services/tasksService';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function UserCalendar({ navigation, route }) {
   const activeRoute = route?.name ?? 'UserCalendar';
   const { t, displayDate } = useI18n();
   const { colors } = useTheme();
   const today = new Date();
   const todayDateString = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
   
   // initialDate from the navigation params and its week offset
   const initialDate = route?.params?.initialDate;
   const calculatedWeekOffset = initialDate ? calculateWeekOffset(initialDate) : 0;
   const [weekOffset, setWeekOffset] = useState(calculatedWeekOffset);
   const stripDays = useMemo(() => generateWeekDays(t, weekOffset), [t, weekOffset]);
   
   const defaultDay = initialDate 
      ? stripDays.find(day => day.dateString === initialDate) || stripDays[0]
      : stripDays.find(day => day.dateString === todayDateString) || stripDays[0];
   const [activeDate, setActiveDate] = useState(defaultDay.dateString);
   
   // Update weekOffset and activeDate when initialDate changes
   useEffect(() => {
      if (initialDate) {
         const newWeekOffset = calculateWeekOffset(initialDate);
         setWeekOffset(newWeekOffset);
      }
   }, [initialDate]);
   
   // Select initialDate once its week is shown
   useEffect(() => {
      if (initialDate && stripDays.length > 0) {
         const targetDay = stripDays.find(day => day.dateString === initialDate);
         if (targetDay) {
            setActiveDate(initialDate);
         }
      }
   }, [weekOffset, stripDays, initialDate]);
   const [tasks, setTasks] = useState([]);
   const [rawTasks, setRawTasks] = useState([]); // unfiltered tasks of the selected day
   const [isLoading, setIsLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const { searchQuery, setSearchQuery, clearSearch, selectedTags, toggleTag, clearTags, resetFilters } = useTaskFilters();
   const participantsData = useParticipants(rawTasks);
   const eventModal = useEventModal();

   const shiftWeek = useCallback((step) => setWeekOffset((offset) => offset + step), []);

   const activeDay = stripDays.find((day) => day.dateString === activeDate) || stripDays[0];
   const isToday = activeDay.dateString === todayDateString;
   const headerLabel = isToday ? t('calendar.today') : activeDay.label;

   // When the week changes, keep the same weekday (e.g. Thursday -> next Thursday)
   useEffect(() => {
      if (stripDays.length === 0) return;

      setActiveDate((prevDate) => {
         if (!prevDate) return stripDays[0].dateString;

         const [d, m, y] = prevDate.split('.');
         const prevDateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
         // getDay (0-6, 0 = Sunday) -> index from Monday
         const jsDay = prevDateObj.getDay(); // 0..6
         const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0..6, 0 = Monday

         const targetDay = stripDays[weekdayIndex] || stripDays[0];
         return targetDay.dateString;
      });
   }, [weekOffset, stripDays]);

   // Subscribe to the tasks of the selected date
   useEffect(() => {
      if (!auth.currentUser) {
         setIsLoading(false);
         return;
      }

      setIsLoading(true);
      let isFirstLoadForDate = true;
      const unsubscribe = subscribeToTasksByDate(activeDate, async (loadedTasks) => {
         // Mark overdue tasks as uncompleted, only on the first load for this date
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

   // Refresh the "active now" state every 30 seconds and when the app comes back
   useEffect(() => {
      // Re-format regularly so the "active now" highlight follows the clock
      const updateTasks = () => {
         setTasks(applyTaskFilters(rawTasks, searchQuery, selectedTags).map(formatTaskForCalendar));
      };

      // Right away
      updateTasks();

      // Every 30 seconds
      const interval = setInterval(updateTasks, 30000);

      // When the app becomes active
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
         // Back to the current week
         setWeekOffset(0);
         const today = new Date();
         const todayDateString = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
         setActiveDate(todayDateString);
         resetFilters();
         
         // Refresh tasks
         await autoMarkUncompletedTasks();
         // The list updates through subscribeToTasksByDate
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
                  <Text style={[styles.dateOverline, { color: colors.textMuted }]}>{displayDate(activeDate)}</Text>
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

            <DayStrip
               days={stripDays}
               activeDate={activeDate}
               todayDateString={todayDateString}
               onSelectDay={setActiveDate}
               onShiftWeek={shiftWeek}
            />

            {/* Search and filters */}
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
                  <DayTimeline
                     events={tasks}
                     participants={participantsData}
                     onEventPress={handleEventPress}
                  />
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
});
