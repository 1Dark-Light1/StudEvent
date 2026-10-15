/** Centered icon, title and hint for an empty list (Alerts, completed/uncompleted tasks). */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function EmptyState({ icon, title, subtitle }) {
   const { colors } = useTheme();
   return (
      <View style={styles.container}>
         <Ionicons name={icon} size={64} color={colors.textMuted} />
         <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
         {!!subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
   );
}

const styles = StyleSheet.create({
   container: { alignItems: 'center', paddingVertical: 80 },
   title: { marginTop: 24, fontSize: 20, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
   subtitle: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
});
