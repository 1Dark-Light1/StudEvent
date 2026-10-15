/**
 * AuthHeader provides a branded hero (logo + copy) reused across the entry flows.
 * Keeping it isolated avoids duplicating marketing copy and ensures spacing stays aligned.
 */
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export default function Header() {
  const { isDark } = useTheme();
  const { t } = useI18n();
  const textColor = { color: isDark ? '#5a9fff' : '#06276C' };

  return (
    <View style={styles.header}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.brand, textColor]}>StudEvent</Text>
      <Text style={[styles.subtitle, textColor]}>{t('auth.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: -20,
  },
  logo: {
    width: 100,
    height: 100,
  },
  brand: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});
