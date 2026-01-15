import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';

const THEMES = [
  { code: 'light', label: 'Світла тема', icon: 'sunny' },
  { code: 'dark', label: 'Темна тема', icon: 'moon' },
];

export default function ThemeScreen({ navigation, route }) {
  const activeRoute = route?.name ?? 'Theme';
  const { t } = useI18n();
  const { theme, setTheme, colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.heroGradientSettings} style={styles.heroBg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.6 }
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{t('settings.theme')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Оберіть тему для додатку
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          {THEMES.map((t, index) => {
            const isActive = t.code === theme;
            return (
              <Pressable
                key={t.code}
                onPress={() => setTheme(t.code)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.border },
                  index === THEMES.length - 1 && styles.rowLast,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
                    <Ionicons 
                      name={t.icon} 
                      size={20} 
                      color={isActive ? colors.primary : colors.textSecondary} 
                    />
                  </View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t.label}</Text>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} activeRoute={activeRoute} />
      <FloatingActionButton onPress={() => navigation.navigate('AddTask')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1,
  },
  heroBg: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 240 
  },
  scroll: { 
    paddingTop: 70, 
    paddingHorizontal: 22, 
    paddingBottom: 200 
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 18 
  },
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
  headerText: { 
    marginLeft: 12, 
    flex: 1 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '600' 
  },
  subtitle: { 
    marginTop: 4, 
    fontSize: 13 
  },
  card: {
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
  },
  rowLast: { 
    borderBottomWidth: 0 
  },
  rowLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { 
    fontSize: 15, 
    fontWeight: '500', 
    marginLeft: 14 
  },
});
