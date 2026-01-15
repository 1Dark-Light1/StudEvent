/**
 * BottomNav renders the persistent navigation pill used across screens.
 * It keeps the surface responsive (pressable icons + labels) and highlights
 * the active route so users always know where they are inside the app shell.
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bottomNavItems } from './navItems';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';

const NAV_HEIGHT = 68;

export default function BottomNav({ navigation, activeRoute, style }) {
   const { t } = useI18n();
   const { colors } = useTheme();
   // Map config to UI to keep navigation copy and routing centralized.
   return (
      <View style={[styles.navBar, { backgroundColor: colors.cardBackground }, style]}>
         {bottomNavItems.map((item) => {
            const isActive = item.route === activeRoute;
            return (
               <Pressable
                  key={item.key}
                  style={styles.navItem}
                  onPress={() => navigation.navigate(item.route)}
               >
                  <Ionicons
                     name={`${item.icon}${isActive ? '' : '-outline'}`}
                     size={21}
                     color={isActive ? colors.primary : colors.textMuted}
                  />
                  <Text style={[
                     styles.navLabel, 
                     { color: colors.textMuted },
                     isActive && { color: colors.primary, fontWeight: '600' }
                  ]}>
                     {t(item.labelKey)}
                  </Text>
               </Pressable>
            );
         })}
      </View>
   );
}

const styles = StyleSheet.create({
   navBar: {
      position: 'absolute',
      bottom: 24,
      left: 24,
      right: 24,
      height: NAV_HEIGHT,
      borderRadius: NAV_HEIGHT / 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
   },
   navItem: {
      flex: 1,
      alignItems: 'center',
   },
   navLabel: {
      marginTop: 4,
      fontSize: 11,
   },
});
