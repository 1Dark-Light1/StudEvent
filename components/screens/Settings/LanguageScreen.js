import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../navigation/BottomNav';
import FloatingActionButton from '../../ui/FloatingActionButton';
import { useI18n } from '../../../i18n/I18nContext';
import { SUPPORTED_LOCALES } from '../../../i18n/translations';

export default function LanguageScreen({ navigation, route }) {
  const activeRoute = route?.name ?? 'Language';
  const { locale, setLocale, t } = useI18n();

  const items = useMemo(() => SUPPORTED_LOCALES, []);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#dbe8ff", "#f6f7fb"]} style={styles.heroBg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#3a4257" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('language.title')}</Text>
            <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {items.map((l, index) => {
            const isActive = l.code === locale;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLocale(l.code)}
                style={({ pressed }) => [
                  styles.row,
                  index === items.length - 1 && styles.rowLast,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.radio, isActive && styles.radioActive]}>
                    {isActive ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={styles.rowLabel}>{l.label}</Text>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark" size={18} color="#2f6bff" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#c3cadb" />
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
  screen: { flex: 1, backgroundColor: '#f2f4fa' },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  scroll: { paddingTop: 70, paddingHorizontal: 22, paddingBottom: 200 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  headerText: { marginLeft: 12, flex: 1 },
  title: { fontSize: 24, color: '#3a4257', fontWeight: '600' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6a748b' },

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
  rowLast: { borderBottomWidth: 0 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 15, color: '#3a4257', fontWeight: '500', marginLeft: 14 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#c9d3e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#2f6bff' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2f6bff' },
});



