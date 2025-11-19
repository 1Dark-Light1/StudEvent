import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Header() {
  return (
    <View style={styles.header}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>StudEvent</Text>
      <Text style={styles.subtitle}>Dołącz do StudEvent</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  logo: {
    width: 84,
    height: 84,
    marginBottom: 6,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2B63F1',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#3556A8',
  },
});
