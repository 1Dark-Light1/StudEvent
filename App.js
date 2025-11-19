import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Minimal App to isolate runtime boolean/string error.
export default function App() {
  useEffect(() => {
    console.log('[App] Mounted minimal baseline');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#222', fontSize: 18 }}>Baseline Render OK + StatusBar</Text>
      <StatusBar style="auto" />
    </View>
  );
}