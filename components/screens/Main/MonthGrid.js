/** 5x7 month grid with today, task and muted (other month) days. */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function MonthGrid({ days, monthName }) {
   const { t } = useI18n();
   const { colors } = useTheme();

   return (
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
               const rowItems = days.slice(rowStart, rowStart + 7);
               return (
                  <View key={`row-${rowIdx}`} style={styles.dateRow}>
                     {rowItems.map((day, idx) => (
                        <View
                           key={`${monthName}-${rowIdx}-${idx}-${day.label}`}
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
   );
}

const styles = StyleSheet.create({
   calendarCard: {
      borderRadius: 28,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginTop: 8, // plus the filter panel's 20 px bottom margin: a 28 px gap
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
});
