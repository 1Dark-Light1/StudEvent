/** Grid of task colors in a centered modal. */
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useI18n } from '../../../i18n/I18nContext';

export default function ColorPickerModal({ visible, value, palette, onSelect, onClose }) {
   const { colors } = useTheme();
   const { t } = useI18n();

   return (
      <Modal
         visible={visible}
         transparent={true}
         animationType="fade"
         onRequestClose={onClose}
      >
         <Pressable style={styles.colorModalOverlay} onPress={onClose}>
            <View style={[styles.colorModalContent, { backgroundColor: colors.cardBackground }]} onStartShouldSetResponder={() => true}>
               <View style={styles.colorModalHeader}>
                  <Text style={[styles.colorModalTitle, { color: colors.text }]}>{t('task.chooseColor')}</Text>
                  <Pressable onPress={onClose}>
                     <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
               </View>
               <View style={styles.colorGrid}>
                  {palette.map((color) => (
                     <Pressable
                        key={color}
                        style={[
                           styles.colorOption,
                           { backgroundColor: color },
                           value === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => {
                           onSelect(color);
                           onClose();
                        }}
                     >
                        {value === color && (
                           <Ionicons name="checkmark" size={20} color="#fff" />
                        )}
                     </Pressable>
                  ))}
               </View>
            </View>
         </Pressable>
      </Modal>
   );
}

const styles = StyleSheet.create({
   colorModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
   },
   colorModalContent: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 20,
      width: '85%',
      maxWidth: 400,
   },
   colorModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
   },
   colorModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1B2430',
   },
   colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
   },
   colorOption: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
   },
   colorOptionSelected: {
      borderColor: '#2F7BFF',
      borderWidth: 3,
   },
});
