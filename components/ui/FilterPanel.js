/**
 * FilterPanel - filters events by tag
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';

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
   const { t } = useI18n();
   const { colors } = useTheme();
   const hasFilters = selectedTags.length > 0;

   return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
         <View style={styles.header}>
            <View style={styles.headerLeft}>
               <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
                  <Ionicons name="filter" size={16} color={colors.primary} />
               </View>
               <Text style={[styles.headerText, { color: colors.text }]}>{t('filter.title')}</Text>
            </View>
            {hasFilters && (
               <Pressable 
                  onPress={onClearFilters} 
                  style={[styles.clearButton, { backgroundColor: colors.iconBg }]}
               >
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                  <Text style={[styles.clearText, { color: colors.error }]}>{t('filter.clear')}</Text>
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
               const tagKey = `filter.tag.${tag.toLowerCase()}`;
               return (
                  <Pressable
                     key={tag}
                     style={({ pressed }) => [styles.tag, pressed && styles.tagPressed]}
                     onPress={() => onTagToggle(tag)}
                  >
                     {isSelected ? (
                        <View style={[styles.tagContent, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                           <Ionicons name="checkmark-circle" size={18} color="#fff" />
                           <Text style={styles.tagTextSelected}>{t(tagKey)}</Text>
                        </View>
                     ) : (
                        <View style={[styles.tagContent, { backgroundColor: colors.iconBg, borderColor: colors.border }]}>
                           <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
                           <Text style={[styles.tagText, { color: colors.textSecondary }]}>{t(tagKey)}</Text>
                        </View>
                     )}
                  </Pressable>
               );
            })}
         </ScrollView>
            {hasFilters && (
               <View style={[styles.activeFiltersInfo, { borderTopColor: colors.border }]}>
                  <Ionicons name="information-circle" size={14} color={colors.primary} />
                  <Text style={[styles.activeFiltersText, { color: colors.primary }]}>
                     {selectedTags.length} {selectedTags.length === 1 ? t('filter.active') : t('filter.activePlural')} {t('filter.activeText')}
                  </Text>
               </View>
            )}
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      marginBottom: 20,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      borderWidth: 1,
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
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
   },
   headerText: {
      fontSize: 15,
      fontWeight: '700',
   },
   clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 4,
   },
   clearText: {
      fontSize: 13,
      fontWeight: '600',
   },
   tagsContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingRight: 16,
      paddingVertical: 6,
   },
   tag: {
      borderRadius: 24,
   },
   tagPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
   },
   tagContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 6,
      borderWidth: 1.5,
      borderRadius: 24,
   },
   tagText: {
      fontSize: 14,
      fontWeight: '600',
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
      gap: 6,
   },
   activeFiltersText: {
      fontSize: 12,
      fontWeight: '600',
   },
});
