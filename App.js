import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image } from 'react-native';



export default function App() {
  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logo.png')} // замените logo.png на имя вашего файла
        style={styles.logo}
      />
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
