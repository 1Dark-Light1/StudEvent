/** Bottom sheet with the built-in tags and an input for a custom tag. */
import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useI18n } from '../../../i18n/I18nContext';

export default function TagPickerModal({ visible, value, tags, onSelect, onClose }) {
   const { colors } = useTheme();
   const { t, tagLabel } = useI18n();
   const [customTagInput, setCustomTagInput] = useState('');

   return (
      <Modal
         visible={visible}
         transparent={true}
         animationType="slide"
         onRequestClose={onClose}
      >
         <Pressable 
            style={styles.tagModalOverlay} 
            onPress={onClose}
         >
            <View 
               style={[styles.tagModalContent, { backgroundColor: colors.cardBackground }]} 
               onStartShouldSetResponder={() => true}
            >
               <View style={[styles.tagModalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tagModalTitle, { color: colors.text }]}>{t('task.selectTag')}</Text>
                  <Pressable onPress={onClose}>
                     <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
               </View>
               
               <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
                  {tags.map((tag) => (
                     <Pressable
                        key={tag}
                        style={[
                           styles.tagOption,
                           { backgroundColor: colors.iconBg },
                           value === tag && [styles.tagOptionSelected, { backgroundColor: colors.primary }],
                        ]}
                        onPress={() => {
                           onSelect(tag);
                           onClose();
                        }}
                     >
                        <Text
                           style={[
                              styles.tagOptionText,
                              { color: colors.text },
                              value === tag && [styles.tagOptionTextSelected, { color: '#fff' }],
                           ]}
                        >
                           {tagLabel(tag)}
                        </Text>
                        {value === tag && (
                           <Ionicons name="checkmark" size={20} color="#fff" />
                        )}
                     </Pressable>
                  ))}
               </ScrollView>

               <View style={[styles.customTagSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.customTagLabel, { color: colors.text }]}>{t('task.customTag')}</Text>
                  <View style={[styles.customTagInputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                     <TextInput
                        style={[styles.customTagInput, { color: colors.text, backgroundColor: colors.iconBg }]}
                        placeholder={t('task.customTagPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        value={customTagInput}
                        onChangeText={setCustomTagInput}
                        autoCorrect={false}
                     />
                     <Pressable
                        style={[
                           styles.addCustomTagBtn,
                           { backgroundColor: colors.primary },
                           !customTagInput.trim() && [styles.addCustomTagBtnDisabled, { backgroundColor: colors.border }],
                        ]}
                        onPress={() => {
                           if (customTagInput.trim()) {
                              onSelect(customTagInput.trim());
                              setCustomTagInput('');
                              onClose();
                           }
                        }}
                        disabled={!customTagInput.trim()}
                     >
                        <Ionicons name="add" size={20} color="#fff" />
                     </Pressable>
                  </View>
               </View>
            </View>
         </Pressable>
      </Modal>
   );
}

const styles = StyleSheet.create({
   tagModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
   },
   tagModalContent: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: '70%',
   },
   tagModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E3E8F4',
   },
   tagModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1B2430',
   },
   tagList: {
      maxHeight: 300,
      paddingHorizontal: 20,
      paddingVertical: 12,
   },
   tagOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: '#F0F4F8',
      minHeight: 48,
   },
   tagOptionSelected: {
      backgroundColor: '#E3F2FD',
      borderWidth: 2,
      borderColor: '#2F7BFF',
   },
   tagOptionText: {
      fontSize: 16,
      color: '#1B2430',
      fontWeight: '500',
   },
   tagOptionTextSelected: {
      color: '#2F7BFF',
      fontWeight: '600',
   },
   customTagSection: {
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#E3E8F4',
   },
   customTagLabel: {
      fontSize: 14,
      color: '#6B7A8F',
      marginBottom: 12,
      fontWeight: '500',
   },
   customTagInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
   },
   customTagInput: {
      flex: 1,
      backgroundColor: '#F0F4F8',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: '#1B2430',
      fontWeight: '500',
   },
   addCustomTagBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#2F7BFF',
      alignItems: 'center',
      justifyContent: 'center',
   },
   addCustomTagBtnDisabled: {
      backgroundColor: '#B0B8C4',
   },
});
