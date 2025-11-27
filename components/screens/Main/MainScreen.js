/**
 * MainScreen hosts the calendar-centric home hub. It combines a hero header, a stylised
 * month grid and an agenda list so students can scan their day quickly.
 */
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';

/**
 * Builds a 7-column grid that includes leading/trailing muted days so layout never shifts.
 */
function buildCalendar({ daysInMonth, startOffset, prevMonthDays, highlightDays = {}, outlineDays = {} }) {
   const grid = [];
   for (let i = startOffset; i > 0; i -= 1) {
      grid.push({ label: String(prevMonthDays - i + 1), muted: true });
   }
   for (let day = 1; day <= daysInMonth; day += 1) {
      const entry = { label: String(day) };
      if (highlightDays[day]) {
         entry.highlight = highlightDays[day];
      }
      if (outlineDays[day]) {
         entry.outline = outlineDays[day];
      }
      grid.push(entry);
   }
   let next = 1;
   while (grid.length % 7 !== 0 || grid.length < 35) {
      grid.push({ label: String(next), muted: true });
      next += 1;
   }
   return grid;
}

/** Hard-coded sample data that mimics a backend payload. */
const months = [
   {
      name: 'October',
      year: '2025',
      calendar: buildCalendar({
         daysInMonth: 31,
         startOffset: 4,
         prevMonthDays: 30,
         highlightDays: { 10: '#d9ecff' },
         outlineDays: { 16: '#f2de7b', 20: '#d7c5ff', 21: '#ffb2c4' },
      }),
      agenda: [
         {
            day: 'WEDNESDAY 19',
            items: [
               { time: '7:00', title: 'Wakeup', color: '#f3b664' },
               { time: '8:00', title: 'Morning exercise', color: '#f06792' },
               {
                  time: '9:05',
                  title: 'Laboratory classes',
                  subtitle: 'Programming in room P1-102',
                  color: '#8dddbd',
               },
            ],
         },
         {
            day: 'THURSDAY 20',
            items: [
               { time: '8:00', title: 'Breakfast', subtitle: 'Bacon and eggs', color: '#709bff' },
               { time: '9:15', title: 'IT Academic Day', color: '#caa6ff' },
               { time: '15:00', title: 'Take some apply for internship', color: '#bcd5ff' },
            ],
         },
      ],
   },
   {
      name: 'November',
      year: '2025',
      calendar: buildCalendar({
         daysInMonth: 30,
         startOffset: 0,
         prevMonthDays: 31,
         highlightDays: { 2: '#d9ecff' },
         outlineDays: { 11: '#81d0b4', 17: '#f2de7b' },
      }),
      agenda: [
         {
            day: 'TUESDAY 2',
            items: [
               { time: '7:30', title: 'Stand-up meeting', color: '#8dddbd' },
               { time: '10:00', title: 'UX Workshop', color: '#f06792' },
            ],
         },
         {
            day: 'FRIDAY 5',
            items: [
               { time: '8:30', title: 'Breakfast with mentor', color: '#709bff' },
               { time: '11:45', title: 'Midterm review', color: '#f3b664' },
            ],
         },
      ],
   },
   {
      name: 'December',
      year: '2025',
      calendar: buildCalendar({
         daysInMonth: 31,
         startOffset: 1,
         prevMonthDays: 30,
         highlightDays: { 12: '#d9ecff' },
         outlineDays: { 18: '#f7a6c1', 24: '#d7c5ff' },
      }),
      agenda: [
         {
            day: 'MONDAY 12',
            items: [
               { time: '6:45', title: 'Snow run', color: '#f06792' },
               { time: '9:00', title: 'Product design sync', color: '#709bff' },
            ],
         },
         {
            day: 'THURSDAY 15',
            items: [
               { time: '11:00', title: 'Client check-in', color: '#8dddbd' },
               { time: '16:30', title: 'Gift shopping', color: '#f3b664' },
            ],
         },
      ],
   },
];

export default function Main({ navigation, route }) {
   const [monthIndex, setMonthIndex] = useState(0);
   const activeMonth = months[monthIndex];
   const activeRoute = route?.name ?? 'Main';

   /** Moves the selection within the months array while keeping the index in range. */
   const shiftMonth = (step) => {
      setMonthIndex((prev) => {
         const next = (prev + step + months.length) % months.length;
         return next;
      });
   };

   return (
      <View style={styles.screen}>
         <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={["#3b85ff", "#8fc5ff"]} style={styles.hero}>
               <View style={styles.headerRow}>
                  <View style={styles.avatar}>
                     <Ionicons name="person" size={22} color="#1d3f72" />
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
                  </View>
                  <Pressable style={styles.refreshBtn} onPress={() => { }}>
                     <Ionicons name="refresh" size={18} color="#1f3d68" />
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
                     {activeMonth.calendar.map((day, index) => (
                        <View
                           key={`${activeMonth.name}-${index}-${day.label}`}
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
               </View>

               {activeMonth.agenda.map((block) => (
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
               ))}
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
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 14,
      columnGap: 12,
   },
   dateBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ecf0fb',
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
});