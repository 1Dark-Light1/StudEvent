/**
 * SearchBar компонент для поиска событий
 */
import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function SearchBar({ value, onChangeText, onClear, placeholder = 'Search events...' }) {
   const { colors } = useTheme();
   return (
      <View style={[
         styles.container,
         { 
            backgroundColor: colors.cardBackground,
            borderColor: colors.border 
         }
      ]}>
         <Ionicons name="search" size={22} color={colors.primary} style={styles.searchIcon} />
         <TextInput
            style={[styles.input, { color: colors.text }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
         />
         {value.length > 0 && (
            <Pressable 
               onPress={onClear} 
               style={[styles.clearButton, { backgroundColor: colors.iconBg }]}
            >
               <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
         )}
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flexDirection: 'row',
      alignItems: 'center',
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
   },
   searchIcon: {
      marginRight: 12,
   },
   input: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'System',
      fontWeight: '500',
   },
   clearButton: {
      padding: 6,
      borderRadius: 20,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
   },
});
