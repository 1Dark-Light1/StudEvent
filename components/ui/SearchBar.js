/**
 * SearchBar компонент для поиска событий
 */
import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar({ value, onChangeText, onClear, placeholder = 'Search events...' }) {
   return (
      <View style={styles.container}>
         <Ionicons name="search" size={22} color="#2f7cff" style={styles.searchIcon} />
         <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#a0a5ba"
            autoCorrect={false}
         />
         {value.length > 0 && (
            <Pressable onPress={onClear} style={styles.clearButton}>
               <Ionicons name="close-circle" size={20} color="#a0a5ba" />
            </Pressable>
         )}
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      shadowColor: '#2f7cff',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      borderWidth: 1,
      borderColor: '#e8eaf2',
   },
   searchIcon: {
      marginRight: 12,
   },
   input: {
      flex: 1,
      fontSize: 15,
      color: '#262c3b',
      fontFamily: 'System',
      fontWeight: '500',
   },
   clearButton: {
      padding: 6,
      backgroundColor: '#f4f5fb',
      borderRadius: 20,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
   },
});
