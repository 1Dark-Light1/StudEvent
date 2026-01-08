/**
 * AlertsScreen gives the user a quick read on outstanding notifications.
 * For now it is a placeholder with empty state copy but still renders the shared
 * shell so the UX feels cohesive with other tabs.
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import BottomNav from '../../navigation/BottomNav';
import { useI18n } from '../../../i18n/I18nContext';

export default function Alerts({ navigation, route }) {
   const activeRoute = route?.name ?? 'Alerts';
   const { t } = useI18n();

   return (
      <View style={styles.screen}>
         <View style={styles.content}>
            <Text style={styles.title}>{t('alerts.title')}</Text>
            <Text style={styles.subtitle}>{t('alerts.caughtUp')}</Text>
         </View>

         <BottomNav navigation={navigation} activeRoute={activeRoute} />
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
      backgroundColor: '#f6f7fb',
      paddingHorizontal: 24,
      paddingTop: 80,
   },
   content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
   },
   title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#1f2b3f',
      marginBottom: 8,
   },
   subtitle: {
      fontSize: 16,
      color: '#7e889e',
      textAlign: 'center',
   },
});
