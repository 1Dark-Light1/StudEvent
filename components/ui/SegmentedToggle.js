/**
 * Pill-shaped two-way switch on the hero gradient (Build/Change task, Completed/Uncompleted).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function SegmentedToggle({ options, value, onChange, minSegmentWidth = 120, style }) {
   const { colors } = useTheme();

   return (
      <View style={[styles.shadow, { backgroundColor: colors.heroGradient[0] }, style]}>
         <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
            {options.map((option) => {
               const active = option.value === value;
               return (
                  <Pressable
                     key={option.value}
                     style={[styles.segment, { minWidth: minSegmentWidth }, active && { backgroundColor: colors.surface }]}
                     onPress={() => onChange(option.value)}
                  >
                     <Text
                        style={[styles.text, { color: active ? colors.text : '#fff' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                     >
                        {option.label}
                     </Text>
                  </Pressable>
               );
            })}
         </LinearGradient>
      </View>
   );
}

const styles = StyleSheet.create({
   shadow: {
      alignSelf: 'center',
      borderRadius: 40,
      // the same soft shadow as the fields and buttons
      shadowColor: '#2f7cff',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
   },
   container: {
      flexDirection: 'row',
      borderRadius: 40,
      padding: 5,
      overflow: 'hidden',
      minHeight: 50,
   },
   segment: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
   },
   text: {
      fontSize: 15,
      fontWeight: '600',
   },
});
