import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';



export default function App() {
  return (
    <View style={styles.container}>
      <Text>StudEvent!</Text>
      <Text>Organizuj. Dolączaj. Komunikuj się!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7cccccff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
