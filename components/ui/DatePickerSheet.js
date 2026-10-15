/**
 * Date picker: a bottom sheet with a spinner and Cancel/Done on iOS,
 * the native date dialog on Android. Calls onConfirm(date) only when confirmed.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export default function DatePickerSheet({ visible, value, onConfirm, onClose }) {
   const { colors, isDark } = useTheme();
   const { t } = useI18n();
   const [draft, setDraft] = useState(value);

   useEffect(() => {
      if (visible) setDraft(value);
   }, [visible, value]);

   if (!visible) return null;

   if (Platform.OS !== 'ios') {
      return (
         <DateTimePicker
            value={value}
            mode="date"
            display="default"
            onChange={(event, date) => {
               onClose();
               if (event.type === 'set' && date) onConfirm(date);
            }}
         />
      );
   }

   return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
         <View style={styles.overlay}>
            <View style={[styles.content, { backgroundColor: colors.surface }]}>
               <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <Pressable onPress={onClose}>
                     <Text style={[styles.cancel, { color: colors.textSecondary }]}>{t('task.cancel')}</Text>
                  </Pressable>
                  <Text style={[styles.title, { color: colors.text }]}>{t('task.selectDate')}</Text>
                  <Pressable
                     onPress={() => {
                        onConfirm(draft);
                        onClose();
                     }}
                  >
                     <Text style={styles.done}>{t('task.done')}</Text>
                  </Pressable>
               </View>
               <DateTimePicker
                  value={draft}
                  mode="date"
                  display="spinner"
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_event, date) => date && setDraft(date)}
                  style={styles.picker}
               />
            </View>
         </View>
      </Modal>
   );
}

const styles = StyleSheet.create({
   overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
   },
   content: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
   },
   header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
   },
   title: {
      fontSize: 18,
      fontWeight: '600',
   },
   cancel: {
      fontSize: 16,
   },
   done: {
      fontSize: 16,
      color: '#2F7BFF',
      fontWeight: '600',
   },
   picker: {
      width: '100%',
   },
});
