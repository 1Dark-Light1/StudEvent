import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Image, Button, Alert } from 'react-native';
import { GlobalStyle } from '../styles/style'; 
import Header from './Header';



export default function Home({ navigation }) {
  //При нажаті на текст в терміналі виводить що текст був нажатий 
  const handleTextPress = () => console.log('Text Press');

  const handleButtonPress = () => {
    navigation.navigate("Main");
};




  return (
    <View style={GlobalStyle.container}>
      <Header />
      <Text> </Text>
      <Text> </Text>
      <Button title='Start' onPress= {handleButtonPress}   />

      <StatusBar style="auto" />
    </View>
  );
}

