/**
 * FilterPanel компонент для фильтрации событий по тегам
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PREDEFINED_TAGS = [
   'Work',
   'Study',
   'Personal',
   'Health',
   'Sport',
   'Home',
   'Finance',
   'Shopping',
   'Other',
];

export default function FilterPanel({ selectedTags, onTagToggle, onClearFilters }) {
   const hasFilters = selectedTags.length > 0;
   const [expandedTag, setExpandedTag] = useState(null);

   return (
      <View style={styles.container}>
         <View style={styles.header}>
            <View style={styles.headerLeft}>
               <View style={styles.iconCircle}>
                  <Ionicons name="filter" size={16} color="#2f7cff" />
               </View>
               <Text style={styles.headerText}>Filter by Category</Text>
            </View>
            {hasFilters && (
               <Pressable 
                  onPress={onClearFilters} 
                  style={styles.clearButton}
               >
                  <Ionicons name="close-circle" size={18} color="#ff6b6b" />
                  <Text style={styles.clearText}>Clear</Text>
               </Pressable>
            )}
         </View>
         <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContainer}
         >
            {PREDEFINED_TAGS.map((tag) => {
               const isSelected = selectedTags.includes(tag);
               return (
                  <Pressable
                     key={tag}
                     style={({ pressed }) => [
                        styles.tag,
                        isSelected && styles.tagSelected,
                        pressed && styles.tagPressed
                     ]}
                     onPress={() => onTagToggle(tag)}
                  >
                     {isSelected ? (
                        <LinearGradient
                           colors={['#2f7cff', '#1a5fd9']}
                           style={styles.tagGradient}
                           start={{ x: 0, y: 0 }}
                           end={{ x: 1, y: 1 }}
                        >
                           <Ionicons name="checkmark-circle" size={18} color="#fff" />
                           <Text style={styles.tagTextSelected}>{tag}</Text>
                        </LinearGradient>
                     ) : (
                        <View style={styles.tagContent}>
                           <Ionicons name="pricetag-outline" size={16} color="#5a6477" />
                           <Text style={styles.tagText}>{tag}</Text>
                        </View>
                     )}
                  </Pressable>
               );
            })}
         </ScrollView>
         {hasFilters && (
            <View style={styles.activeFiltersInfo}>
               <Ionicons name="information-circle" size={14} color="#2f7cff" />
               <Text style={styles.activeFiltersText}>
                  {selectedTags.length} {selectedTags.length === 1 ? 'filter' : 'filters'} active
               </Text>
            </View>
         )}
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      marginBottom: 20,
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      borderWidth: 1,
      borderColor: '#f0f2f8',
   },
   header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
   },
   headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
   },
   iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#e3f2fd',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
   },
   headerText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#262c3b',
   },
   clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: '#fff5f5',
      borderRadius: 20,
      gap: 4,
   },
   clearText: {
      fontSize: 13,
      color: '#ff6b6b',
      fontWeight: '600',
   },
   tagsContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingRight: 16,
      paddingVertical: 4,
   },
   tag: {
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#2f7cff',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
   },
   tagSelected: {
      shadowOpacity: 0.2,
      shadowRadius: 8,
   },
   tagPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
   },
   tagGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 6,
   },
   tagContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#f8f9fd',
      gap: 6,
      borderWidth: 1.5,
      borderColor: '#e8eaf2',
      borderRadius: 24,
   },
   tagText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#5a6477',
   },
   tagTextSelected: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
   },
   activeFiltersInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#f0f2f8',
      gap: 6,
   },
   activeFiltersText: {
      fontSize: 12,
      color: '#2f7cff',
      fontWeight: '600',
   },
});
