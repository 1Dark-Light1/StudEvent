import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FloatingActionButton({ onPress, icon = 'add', style }) {
   return (
      <Pressable
         style={({ pressed }) => [styles.fab, pressed && styles.fabPressed, style]}
         onPress={onPress}
         hitSlop={10}
      >
         <Ionicons name={icon} size={28} color="#fff" />
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
      backgroundColor: '#2f7cff',
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
