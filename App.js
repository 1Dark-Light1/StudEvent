import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image } from 'react-native';



export default function App() {
  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>StudEvent!</Text>
      <Text style={styles.subtitle}>Organizuj. Dolączaj. Komunikuj się!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginVertical: 10,
  },
  title: {
    fontSize: 30,
  },
  subtitle: {
    fontSize: 20,
  },
});
