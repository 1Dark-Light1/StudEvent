import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Main from "./components/main"
import Home from "./components/Home"

const Stack = createNativeStackNavigator();

export default function App() {
  return(
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName='Home'>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Main" component={Main} />
      </Stack.Navigator>
    </NavigationContainer>

  );
}
















//  //При нажаті на текст в терміналі виводить що текст був нажатий 
//  const handleTextPress = () => console.log('Text Press');
  //Дoдає висвітлення повідомлення при нажаті кнопки
//  const handleButtonPress = () => Alert.alert("StudEvent", "Button Press", [ 
    //Виводить в тепмінал що було нажати
//    {text: "Yes", onPress: () => console.log('Yes')},
//    {text: "No", onPress: () => console.log('No')},
// ]);

// return (
//    <View style={GlobalStyle.container}>
//      <Image
//        source={require('./assets/logo.png')}
//        style={GlobalStyle.logo}
//      />
//      <Text style={GlobalStyle.title} numberOfLines={1} onPress={handleTextPress}  >StudEvent!</Text>
//      <Text style={GlobalStyle.subtitle}>Organizuj. Dolączaj. Komunikuj się!</Text>
//
//      <Button  title='Start' onPress={handleButtonPress}  />

//      <StatusBar style="auto" />
//    </View>
//  );


//const styles = StyleSheet.create({

// });
