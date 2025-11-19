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
