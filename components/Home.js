import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Image, Button, Alert } from 'react-native';
import { GlobalStyle } from '../styles/style'; 



export default function Home({ navigation }) {
  //При нажаті на текст в терміналі виводить що текст був нажатий 
  const handleTextPress = () => console.log('Text Press');

  const handleButtonPress = () => {
    navigation.navigate("Main");
};




  return (
    <View style={GlobalStyle.container}>
      <Image
        source={require('../assets/logo.png')}
        style={GlobalStyle.logo}
      />
      <Text style={GlobalStyle.title} numberOfLines={1} onPress={handleTextPress}  >StudEvent!</Text>
      <Text style={GlobalStyle.subtitle} numberOfLines={1}>Organizuj. Dolączaj. Komunikuj się! {'\n'}  </Text>
      <Text> </Text>
      <Button title='Start' onPress= {handleButtonPress}   />

      <StatusBar style="auto" />
    </View>
  );
}

