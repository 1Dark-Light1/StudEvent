/** Week of day chips; a horizontal swipe on it moves to the previous/next week. */
import React, { useMemo } from 'react';
import { View, Text, Pressable, PanResponder, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

export default function DayStrip({ days, activeDate, todayDateString, onSelectDay, onShiftWeek }) {
   const { colors } = useTheme();

   const panResponder = useMemo(
      () =>
         PanResponder.create({
            // react only to clearly horizontal moves, so taps and vertical scrolling still work
            onMoveShouldSetPanResponder: (_evt, { dx, dy }) => Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2,
            onPanResponderRelease: (_evt, { dx }) => {
               if (dx > 30) onShiftWeek(-1);
               else if (dx < -30) onShiftWeek(1);
            },
         }),
      [onShiftWeek]
   );

   return (
      <View style={[styles.dayStrip, { backgroundColor: colors.cardBackground }]} {...panResponder.panHandlers}>
         {days.map((day) => {
            const isActive = day.dateString === activeDate;
            const isTodayDate = day.dateString === todayDateString;
            return (
               <Pressable
                  key={day.dateString}
                  style={[
                     styles.dayChip,
                     { backgroundColor: colors.cardBackground },
                     isActive && [styles.dayChipActive, { backgroundColor: colors.primary }]
                  ]}
                  onPress={() => onSelectDay(day.dateString)}
               >
                  <Text style={[
                     styles.dayLabel,
                     { color: colors.textSecondary },
                     isActive && [styles.dayLabelActive, { color: '#fff' }]
                  ]}>{day.label}</Text>
                  <Text style={[
                     styles.dayNumber,
                     { color: colors.text },
                     isActive && [styles.dayNumberActive, { color: '#fff' }]
                  ]}>{day.date}</Text>
                  {isTodayDate && !isActive && (
                     <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                  )}
               </Pressable>
            );
         })}
      </View>
   );
}

const styles = StyleSheet.create({
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
   todayIndicator: {
      position: 'absolute',
      bottom: 2,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#2f6cff',
   },
});
