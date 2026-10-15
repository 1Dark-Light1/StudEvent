/** Home hero: profile button, month switcher and notifications button. */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import Avatar, { useMyProfile } from '../../ui/Avatar';

export default function MonthHeader({ monthName, year, onPrevMonth, onNextMonth, onOpenProfile, onOpenAlerts }) {
   const { colors } = useTheme();
   const profile = useMyProfile();

   return (
      <LinearGradient colors={colors.heroGradient} style={styles.hero}>
         <View style={styles.headerRow}>

            <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
               <Pressable
                  onPress={() => onOpenProfile()}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, })}
               >
                  <Avatar photo={profile?.photo} size={38} iconColor={colors.text} />
               </Pressable>
            </View>

            <View style={styles.monthBlock}>
               <View style={styles.monthSwitcher}>
                  <Pressable style={styles.monthBtn} onPress={() => onPrevMonth()} hitSlop={8}>
                     <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.9)" />
                  </Pressable>
                  <View style={styles.monthRow}>
                     <Text style={styles.monthText}>{monthName}</Text>
                  </View>
                  <Pressable style={styles.monthBtn} onPress={() => onNextMonth()} hitSlop={8}>
                     <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
                  </Pressable>
               </View>
               <Text style={styles.yearText}>{year}</Text>
            </View>
            <Pressable 
               style={[styles.refreshBtn, { backgroundColor: colors.iconBg }]} 
               onPress={() => onOpenAlerts()}
            >
               <Ionicons name="notifications" size={18} color={colors.text} />
            </Pressable>
         </View>

      </LinearGradient>
   );
}

const styles = StyleSheet.create({
   hero: {
      borderBottomLeftRadius: 38,
      borderBottomRightRadius: 38,
      paddingTop: 60,
      paddingHorizontal: 22,
      paddingBottom: 50,
      overflow: 'hidden',
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
      alignItems: 'center',
      justifyContent: 'center',
   },
});
