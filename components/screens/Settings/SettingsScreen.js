/**
 * SettingsScreen centralizes account level preferences and acts as a design reference
 * for list-driven layouts (icon + label + chevron). It intentionally mirrors iOS system
 * cards to make the experience familiar.
 */
import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';

/** Higher priority actions shown at the top of the page. */
const primaryOptions = [
   { icon: 'person-circle', label: 'Personal information' },
   { icon: 'settings', label: 'Settings' },
];

/** Secondary preferences that still need quick access. */
const secondaryOptions = [
   { icon: 'notifications', label: 'Notifications' },
   { icon: 'language', label: 'Language' },
   { icon: 'color-palette', label: 'Theme' },
   { icon: 'people', label: 'Accounts' },
];

export default function Settings({ navigation, route }) {
   const activeRoute = route?.name ?? 'Settings';

   return (
      <View style={styles.screen}>
         <LinearGradient colors={["#dbe8ff", "#f6f7fb"]} style={styles.heroBg} />
         <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
               <Text style={styles.heroTitle}>Your profile</Text>
               <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={76} color="#6a6f80" />
                  <View style={styles.avatarBadge}>
                     <Ionicons name="person-add" size={16} color="#1f2b3f" />
                  </View>
               </View>
               <Text style={styles.heroName}>Name and Surname</Text>
            </View>

            <View style={styles.card}>
               {primaryOptions.map((item, index) => (
                  <View
                     key={item.label}
                     style={[styles.row, index === primaryOptions.length - 1 && styles.rowLast]}
                  >
                     <View style={styles.rowLeft}>
                        <View style={styles.rowIcon}>
                           <Ionicons name={item.icon} size={20} color="#78849e" />
                        </View>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                     </View>
                     <Ionicons name="chevron-forward" size={18} color="#c3cadb" />
                  </View>
               ))}
            </View>

            <View style={styles.card}>
               {secondaryOptions.map((item, index) => (
                  <View
                     key={item.label}
                     style={[styles.row, index === secondaryOptions.length - 1 && styles.rowLast]}
                  >
                     <View style={styles.rowLeft}>
                        <View style={styles.rowIcon}>
                           <Ionicons name={item.icon} size={20} color="#78849e" />
                        </View>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                     </View>
                     <Ionicons name="chevron-forward" size={18} color="#c3cadb" />
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
      backgroundColor: '#f2f4fa',
   },
   heroBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 280,
   },
   scroll: {
      paddingTop: 70,
      paddingHorizontal: 22,
      paddingBottom: 200,
   },
   heroCard: {
      alignItems: 'center',
      marginBottom: 28,
   },
   heroTitle: {
      fontSize: 24,
      color: '#3a4257',
      fontWeight: '600',
      marginBottom: 14,
   },
   avatarWrap: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: '#e4e8f4',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
   },
   avatarBadge: {
      position: 'absolute',
      right: 28,
      bottom: 26,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
   },
   heroName: {
      fontSize: 20,
      fontWeight: '600',
      color: '#4b5465',
   },
   card: {
      backgroundColor: '#fff',
      borderRadius: 22,
      paddingVertical: 12,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
   },
   row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#eef1f6',
   },
   rowLast: {
      borderBottomWidth: 0,
   },
   rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
   },
   rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: '#f2f4fa',
      alignItems: 'center',
      justifyContent: 'center',
   },
   rowLabel: {
      fontSize: 15,
      color: '#3a4257',
      fontWeight: '500',
      marginLeft: 14,
   },
});
