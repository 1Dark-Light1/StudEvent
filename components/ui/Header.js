/**
 * AuthHeader provides a branded hero (logo + copy) reused across the entry flows.
 * Keeping it isolated avoids duplicating marketing copy and ensures spacing stays aligned.
 */
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Header() {
  return (
    <View style={styles.header}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>StudEvent</Text>
      <Text style={styles.subtitle}>Join to us</Text>
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
    color: '#06276C',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#06276C',
  },
});
