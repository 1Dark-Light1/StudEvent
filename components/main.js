
import { StyleSheet, View, Text } from 'react-native';
import { GlobalStyle } from '../styles/style'; 
import Header from './Header';
 

export default function Main() {
return(
 <View style={GlobalStyle.container}>
    <Header />
    <Text> </Text>
    <Text>Its a main!</Text>


 </View>

 );
}

const styles = StyleSheet.create({

});