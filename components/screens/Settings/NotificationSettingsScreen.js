/**
 * NotificationSettingsScreen - екран налаштувань повідомлень
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import { getNotificationSettings, saveNotificationSettings } from '../../../services/notificationsService';
import { useI18n } from '../../../i18n/I18nContext';

export default function NotificationSettings({ navigation, route }) {
   const { t } = useI18n();
   const activeRoute = route?.name ?? 'NotificationSettings';
   const [settings, setSettings] = useState({
      enabled: true,
      soundEnabled: true,
      reminderEnabled: true,
   });
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      loadSettings();
   }, []);

   const loadSettings = async () => {
      try {
         const loadedSettings = await getNotificationSettings();
         setSettings(loadedSettings);
      } catch (error) {
         console.error('Error loading notification settings:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleToggle = async (key) => {
      const newSettings = {
         ...settings,
         [key]: !settings[key],
      };
      setSettings(newSettings);
      await saveNotificationSettings(newSettings);
   };

   return (
      <View style={styles.screen}>
         <LinearGradient colors={["#dbe8ff", "#f6f7fb"]} style={styles.heroBg} />
         <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
               <Pressable
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
               >
                  <Ionicons name="arrow-back" size={24} color="#262c3b" />
               </Pressable>
               <Text style={styles.headerTitle}>{t('notifications.settings.title')}</Text>
               <View style={styles.backButtonPlaceholder} />
            </View>

            <View style={styles.card}>
               <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                     <View style={styles.settingIcon}>
                        <Ionicons name="notifications" size={22} color="#2f7cff" />
                     </View>
                     <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>{t('notifications.settings.enable')}</Text>
                        <Text style={styles.settingDescription}>{t('notifications.settings.enableDesc')}</Text>
                     </View>
                  </View>
                  <Switch
                     value={settings.enabled}
                     onValueChange={() => handleToggle('enabled')}
                     trackColor={{ false: '#e0e0e0', true: '#2f7cff' }}
                     thumbColor="#fff"
                  />
               </View>

               <View style={styles.divider} />

               <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                     <View style={styles.settingIcon}>
                        <Ionicons name="volume-high" size={22} color="#2f7cff" />
                     </View>
                     <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>{t('notifications.settings.sound')}</Text>
                        <Text style={styles.settingDescription}>{t('notifications.settings.soundDesc')}</Text>
                     </View>
                  </View>
                  <Switch
                     value={settings.soundEnabled && settings.enabled}
                     onValueChange={() => handleToggle('soundEnabled')}
                     disabled={!settings.enabled}
                     trackColor={{ false: '#e0e0e0', true: '#2f7cff' }}
                     thumbColor="#fff"
                  />
               </View>

               <View style={styles.divider} />

               <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                     <View style={styles.settingIcon}>
                        <Ionicons name="time" size={22} color="#2f7cff" />
                     </View>
                     <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>{t('notifications.settings.reminders')}</Text>
                        <Text style={styles.settingDescription}>{t('notifications.settings.remindersDesc')}</Text>
                     </View>
                  </View>
                  <Switch
                     value={settings.reminderEnabled && settings.enabled}
                     onValueChange={() => handleToggle('reminderEnabled')}
                     disabled={!settings.enabled}
                     trackColor={{ false: '#e0e0e0', true: '#2f7cff' }}
                     thumbColor="#fff"
                  />
               </View>
            </View>

            <View style={styles.infoCard}>
               <Ionicons name="information-circle" size={20} color="#2f7cff" />
               <Text style={styles.infoText}>{t('notifications.settings.info')}</Text>
            </View>
         </ScrollView>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />
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
      height: 200,
   },
   scroll: {
      paddingTop: 60,
      paddingHorizontal: 22,
      paddingBottom: 200,
   },
   header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
   },
   backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
   },
   backButtonPlaceholder: {
      width: 40,
   },
   headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#262c3b',
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
   settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 18,
   },
   settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 16,
   },
   settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#e3f2fd',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
   },
   settingText: {
      flex: 1,
   },
   settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#262c3b',
      marginBottom: 4,
   },
   settingDescription: {
      fontSize: 13,
      color: '#7e889e',
      lineHeight: 18,
   },
   divider: {
      height: 1,
      backgroundColor: '#eef1f6',
      marginHorizontal: 18,
   },
   infoCard: {
      flexDirection: 'row',
      backgroundColor: '#e3f2fd',
      borderRadius: 16,
      padding: 16,
      alignItems: 'flex-start',
   },
   infoText: {
      flex: 1,
      fontSize: 13,
      color: '#1976d2',
      marginLeft: 12,
      lineHeight: 18,
   },
});
