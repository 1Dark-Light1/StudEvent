/**
 * BottomNav renders the persistent navigation pill used across screens.
 * It keeps the surface responsive (pressable icons + labels) and highlights
 * the active route so users always know where they are inside the app shell.
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bottomNavItems } from './navItems';

const NAV_HEIGHT = 68;

export default function BottomNav({ navigation, activeRoute, style }) {
   // Map config to UI to keep navigation copy and routing centralized.
   return (
      <View style={[styles.navBar, style]}>
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
                     color={isActive ? '#2f6bff' : '#9aa8c2'}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
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
      backgroundColor: '#fff',
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
      color: '#99a6bf',
   },
   navLabelActive: {
      color: '#2f6bff',
      fontWeight: '600',
   },
});
