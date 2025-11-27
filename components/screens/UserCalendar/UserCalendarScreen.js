/**
 * UserCalendarScreen focuses on the daily timeline experience.
 * It mixes a day-strip selector with a vertical schedule so users can
 * jump between days and immediately see context-rich events.
 */
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './BottomNav';
import FloatingActionButton from './FloatingActionButton';

/**
 * Days shown in the pill selector. Weekday labels make the strip readable at a glance
 * even when the user only remembers the label ("Wed") instead of the date.
 */
const stripDays = [
   { label: 'Mon', date: '17' },
   { label: 'Tue', date: '18' },
   { label: 'Wed', date: '19' },
   { label: 'Thu', date: '20' },
   { label: 'Fri', date: '21' },
   { label: 'Sat', date: '22' },
   { label: 'Sun', date: '23' },
];

/**
 * Mock schedule data keyed by date to simulate the API contract for the timeline.
 * Each entry captures semantic hints (tone) so the UI can highlight the urgent items.
 */
const daySchedules = {
   '17': [
      { id: 'yoga', time: '6:30 AM', title: 'Morning yoga', subtitle: '15 min stretch', tone: 'frost' },
      { id: 'lecture', time: '9:00 AM', title: 'AI lecture', subtitle: 'Hall C3', tone: 'highlight' },
   ],
   '18': [
      { id: 'coffee', time: '8:00 AM', title: 'Coffee with mentor', subtitle: 'Campus cafe', tone: 'frost' },
      { id: 'designsync', time: '11:00 AM', title: 'Design sync', subtitle: 'UI polish', tone: 'frost' },
      { id: 'gym', time: '5:30 PM', title: 'Gym session', subtitle: 'Leg day', tone: 'highlight' },
   ],
   '19': [
      { id: 'wakeup', time: '7:00 AM', title: 'Wakeup', subtitle: 'Early wakeup from bed', tone: 'frost' },
      { id: 'exercise', time: '8:00 AM', title: 'Morning Exercise', subtitle: '4 exercise', tone: 'frost' },
      {
         id: 'lab',
         time: '9:05-10:00 AM',
         title: 'Laboratory class..',
         subtitle: 'Programming in room P1-102',
         tone: 'highlight',
      },
      {
         id: 'breakfast',
         time: '10:00 AM',
         title: 'Breakfast',
         subtitle: 'Morning breakfast with sandwich, banana',
         tone: 'frost',
      },
   ],
   '20': [
      { id: 'labprep', time: '7:30 AM', title: 'Lab prep', subtitle: 'Review notes', tone: 'frost' },
      { id: 'meetup', time: '1:00 PM', title: 'Team meetup', subtitle: 'Room D4', tone: 'highlight' },
   ],
   '21': [
      { id: 'wfh', time: '9:00 AM', title: 'Remote work', subtitle: 'Code cleanup', tone: 'frost' },
      { id: 'review', time: '3:00 PM', title: 'Sprint review', subtitle: 'Show progress', tone: 'highlight' },
   ],
};

export default function UserCalendar({ navigation, route }) {
   const activeRoute = route?.name ?? 'UserCalendar';
   const defaultDate = stripDays.find((day) => day.date === '19')?.date ?? stripDays[0].date;
   const [activeDate, setActiveDate] = useState(defaultDate);
   const activeDay = stripDays.find((day) => day.date === activeDate);
   const activeEvents = daySchedules[activeDate] ?? [];
   const headerLabel = activeDay?.label === 'Wed' && activeDate === '19' ? 'Today' : activeDay?.label ?? 'Today';

   return (
      <View style={styles.screen}>
         <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
               <View>
                  <Text style={styles.dateOverline}>{`October ${activeDate}, 2025`}</Text>
                  <Text style={styles.title}>{headerLabel}</Text>
               </View>
               <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#262c3b" />
               </View>
            </View>

            <View style={styles.dayStrip}>
               {stripDays.map((day) => {
                  const isActive = day.date === activeDate;
                  return (
                     <Pressable
                        key={day.date}
                        style={[styles.dayChip, isActive && styles.dayChipActive]}
                        onPress={() => setActiveDate(day.date)}
                     >
                        <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>{day.label}</Text>
                        <Text style={[styles.dayNumber, isActive && styles.dayNumberActive]}>{day.date}</Text>
                     </Pressable>
                  );
               })}
            </View>

            <View style={styles.timelineWrapper}>
               {activeEvents.length === 0 && (
                  <View style={styles.emptyState}>
                     <Ionicons name="sunny" size={28} color="#d0d8ec" />
                     <Text style={styles.emptyTitle}>Nothing planned</Text>
                     <Text style={styles.emptySubtitle}>Tap + to schedule something new.</Text>
                  </View>
               )}
               {activeEvents.map((event, index) => {
                  const isLast = index === activeEvents.length - 1;
                  const cardStyles = [styles.eventCard];
                  if (event.tone === 'highlight') {
                     cardStyles.push(styles.eventCardHighlight);
                  }

                  return (
                     <View key={event.id} style={styles.eventRow}>
                        <Text style={styles.eventTime}>{event.time}</Text>
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
                                    {[0, 1, 2, 3].map((slot) => (
                                       <View key={`avatar-${slot}`} style={styles.labAvatar}>
                                          <Ionicons name="person" size={14} color="#2f7cff" />
                                       </View>
                                    ))}
                                 </View>
                                 <View style={styles.labAction}>
                                    <Ionicons name="star" size={18} color="#2f7cff" />
                                 </View>
                              </View>
                           )}
                        </View>
                     </View>
                  );
               })}
            </View>
         </ScrollView>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />

         <FloatingActionButton onPress={() => {}} />
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
});
