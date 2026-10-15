/** The selected day's events on a vertical timeline. */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalEventCard from '../../ui/GlobalEventCard';
import { auth } from '../../../FireBaseConfig';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function DayTimeline({ events, participants, onEventPress }) {
   const { displayTime } = useI18n();
   const { colors, isDark } = useTheme();

   return (
      <>
         {events.map((event, index) => {
            const isLast = index === events.length - 1;
            const isGlobal = event.isGlobal === true;

            // Has the current user joined this task?
            const isUserJoined = isGlobal && auth.currentUser && event.participants && event.participants.includes(auth.currentUser.uid);

            // Participants of a global task
            const taskParticipants = isGlobal && participants[event.id] ? participants[event.id] : [];

            return (
               <View key={event.id} style={styles.eventRow}>
                  <Text style={[styles.eventTime, { color: colors.textMuted }]}>{displayTime(event.time)}</Text>
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
                     <Pressable onPress={() => onEventPress(event)} style={{ flex: 1 }}>
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
                     // Active task: gradient and larger card
                     <LinearGradient
                        colors={['#2f7cff', '#4a9eff', '#6bb5ff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.eventCardHighlightGradient, styles.eventCardHighlightActive]}
                     >
                        <Pressable 
                           style={styles.eventCardHighlightContent}
                           onPress={() => onEventPress(event)}
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
                     // Regular task
                     <Pressable 
                        style={[styles.eventCard, { backgroundColor: colors.surface }]}
                        onPress={() => onEventPress(event)}
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
         })}
      </>
   );
}

const styles = StyleSheet.create({
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
   eventTitleHighlight: {
      color: '#fff',
   },
   eventSubtitleHighlight: {
      color: 'rgba(255,255,255,0.85)',
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
   eventTitle: {
      fontWeight: '600',
      fontSize: 16,
      marginBottom: 6,
   },
   eventSubtitle: {
      fontSize: 12,
      lineHeight: 18,
   },
});
