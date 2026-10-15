/**
 * Shared layout of the settings sub-pages: soft gradient, back button, title and
 * subtitle, the page content, and the bottom navigation.
 * Also exports the card/row styles the pages use, so they look the same.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import { useTheme } from '../../../contexts/ThemeContext';

export default function SettingsPage({ navigation, route, title, subtitle, children }) {
   const { colors } = useTheme();

   return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
         <LinearGradient colors={colors.heroGradientSettings} style={styles.heroBg} />
         <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
         >
            <View style={styles.headerRow}>
               <Pressable
                  onPress={() => navigation.goBack()}
                  hitSlop={12}
                  style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface }, pressed && { opacity: 0.6 }]}
               >
                  <Ionicons name="chevron-back" size={22} color={colors.text} />
               </Pressable>
               <View style={styles.headerText}>
                  <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                  {!!subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
               </View>
            </View>
            {children}
         </ScrollView>
         <BottomNav navigation={navigation} activeRoute={route?.name} />
      </View>
   );
}

/** Section title above a card. */
export function SectionTitle({ children }) {
   const { colors } = useTheme();
   return <Text style={[settingsStyles.sectionTitle, { color: colors.textMuted }]}>{children}</Text>;
}

/** Card with rows or a form. */
export function Card({ children, style }) {
   const { colors } = useTheme();
   return <View style={[settingsStyles.card, { backgroundColor: colors.cardBackground }, style]}>{children}</View>;
}

/** Labelled text field in the app's input style. */
export function Field({ label, ...inputProps }) {
   const { colors } = useTheme();
   return (
      <View style={settingsStyles.field}>
         <Text style={[settingsStyles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
         <TextInput
            placeholderTextColor={colors.textMuted}
            style={[settingsStyles.input, { color: colors.text, backgroundColor: colors.iconBg }]}
            {...inputProps}
         />
      </View>
   );
}

/** Full-width button: primary (blue), or danger (red outline). */
export function PageButton({ title, onPress, disabled, danger }) {
   const { colors } = useTheme();
   return (
      <Pressable
         onPress={onPress}
         disabled={disabled}
         style={({ pressed }) => [
            settingsStyles.button,
            danger ? { borderWidth: 1.5, borderColor: colors.error } : { backgroundColor: colors.primary },
            (pressed || disabled) && { opacity: 0.6 },
         ]}
      >
         <Text style={[settingsStyles.buttonText, { color: danger ? colors.error : '#fff' }]}>{title}</Text>
      </Pressable>
   );
}

const styles = StyleSheet.create({
   screen: { flex: 1 },
   heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
   scroll: { paddingTop: 70, paddingHorizontal: 22, paddingBottom: 200 },
   headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
   backBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
   },
   headerText: { marginLeft: 12, flex: 1 },
   title: { fontSize: 24, fontWeight: '600' },
   subtitle: { marginTop: 4, fontSize: 13 },
});

export const settingsStyles = StyleSheet.create({
   sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 6,
   },
   card: {
      borderRadius: 22,
      padding: 18,
      marginBottom: 22,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
   },
   field: { marginBottom: 14 },
   fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
   input: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
   button: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
   buttonText: { fontSize: 15, fontWeight: '600' },
   infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
   infoLabel: { fontSize: 14 },
   infoValue: { fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
   hint: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
});
