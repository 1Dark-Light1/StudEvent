import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Image, Button, Alert } from 'react-native';



export default function App() {
  //При нажаті на текст в терміналі виводить що текст був нажатий 
  const handleTextPress = () => console.log('Text Press');
  //Дадає висвітлення повідомлення при нажаті кнопки
  const handleButtonPress = () => Alert.alert("StudEvent", "Button Press", [ 
    //Виводить в тепмінал що було нажати
    {text: "Yes", onPress: () => console.log('Yes')},
    {text: "No", onPress: () => console.log('No')},
 ]);

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title} numberOfLines={1} onPress={handleTextPress}  >StudEvent!</Text>
      <Text style={styles.subtitle}>Organizuj. Dolączaj. Komunikuj się!</Text>

      <Button  title='Start' onPress={handleButtonPress}  />
      
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
    color:'#33b6b3ff',
  },
  subtitle: {
    fontSize: 20,
    color: '#095d61ff', 
  },
});
