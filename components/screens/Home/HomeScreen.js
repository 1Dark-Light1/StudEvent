/**
 * HomeScreen acts as a lightweight entry point before the user dives into the main tabs.
 * It is intentionally minimal so it can double as a splash/CTA surface during onboarding.
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Image, Button, Alert } from 'react-native';
import { GlobalStyle } from '../../../styles/style'; 
import Header from '../../ui/Header';

export default function Home({ navigation }) {
  // Helpful for instrumentation / verifying press areas while the UI is simple.
  const handleTextPress = () => console.log('Text Press');

  /** Sends the user into the primary experience stack. */
  const handleButtonPress = () => {
    navigation.navigate("Main");
  };

  return (
    <View style={GlobalStyle.container}>
      <Header />
      <Text onPress={handleTextPress}> </Text>
      <Text> </Text>
      <Button title='Start' onPress={handleButtonPress}   />

      <StatusBar style="auto" />
    </View>
  );
}

