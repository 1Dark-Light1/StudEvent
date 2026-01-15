/**
 * FloatingActionButton provides a single obvious affordance for quick actions.
 * It is rendered once per screen so any tab can surface creation flows consistently.
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function FloatingActionButton({ onPress, icon = 'add', style }) {
   const { colors } = useTheme();
   return (
      <Pressable
         style={({ pressed }) => [
            styles.fab, 
            { backgroundColor: colors.primary },
            pressed && styles.fabPressed, 
            style
         ]}
         onPress={onPress}
         hitSlop={10}
      >
         <Ionicons name={icon} size={30} color="#fff" />
      </Pressable>
   );
}

const styles = StyleSheet.create({
   fab: {
      position: 'absolute',
      bottom: 90,
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
   },
   fabPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.95,
   },
});
