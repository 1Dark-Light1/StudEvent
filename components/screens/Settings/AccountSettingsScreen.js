/**
 * Account settings: change email, change password, shortcuts to app preferences,
 * delete the account, and the app version.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { auth } from '../../../FireBaseConfig';
import { changeEmail, changePassword, deleteAccount } from '../../../services/accountService';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import SettingsPage, { Card, Field, PageButton, SectionTitle, settingsStyles } from './SettingsPage';

const MIN_PASSWORD = 6;

export default function AccountSettingsScreen({ navigation, route }) {
   const { t, errorText } = useI18n();
   const { colors } = useTheme();
   const [busy, setBusy] = useState(null); // 'email' | 'password' | 'delete'

   const [newEmail, setNewEmail] = useState('');
   const [emailPassword, setEmailPassword] = useState('');
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [repeatPassword, setRepeatPassword] = useState('');
   const [deletePassword, setDeletePassword] = useState('');

   const run = async (key, action, successKey) => {
      setBusy(key);
      try {
         await action();
         if (successKey) Alert.alert(t('common.success'), t(successKey));
         return true;
      } catch (error) {
         console.error(`Error (${key}):`, error);
         Alert.alert(t('common.error'), errorText(error, 'account.error'));
         return false;
      } finally {
         setBusy(null);
      }
   };

   const handleChangeEmail = async () => {
      if (!newEmail.trim() || !emailPassword) return Alert.alert(t('common.error'), t('account.fillAll'));
      const ok = await run('email', () => changeEmail(emailPassword, newEmail), 'account.emailSent');
      if (ok) {
         setNewEmail('');
         setEmailPassword('');
      }
   };

   const handleChangePassword = async () => {
      if (!currentPassword || !newPassword || !repeatPassword) return Alert.alert(t('common.error'), t('account.fillAll'));
      if (newPassword.length < MIN_PASSWORD) return Alert.alert(t('common.error'), t('errors.auth/weak-password'));
      if (newPassword !== repeatPassword) return Alert.alert(t('common.error'), t('account.passwordsDiffer'));
      const ok = await run('password', () => changePassword(currentPassword, newPassword), 'account.passwordChanged');
      if (ok) {
         setCurrentPassword('');
         setNewPassword('');
         setRepeatPassword('');
      }
   };

   const handleDelete = () => {
      if (!deletePassword) return Alert.alert(t('common.error'), t('account.fillAll'));
      Alert.alert(t('account.deleteTitle'), t('account.deleteConfirm'), [
         { text: t('task.cancel'), style: 'cancel' },
         {
            text: t('account.deleteAction'),
            style: 'destructive',
            onPress: async () => {
               const ok = await run('delete', () => deleteAccount(deletePassword));
               if (ok) navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            },
         },
      ]);
   };

   const shortcuts = [
      { icon: 'notifications', label: t('settings.notifications'), route: 'NotificationSettings' },
      { icon: 'language', label: t('settings.language'), route: 'Language' },
      { icon: 'color-palette', label: t('settings.theme'), route: 'Theme' },
   ];

   return (
      <SettingsPage navigation={navigation} route={route} title={t('settings.settings')} subtitle={t('account.subtitle')}>
         <SectionTitle>{t('account.emailSection')}</SectionTitle>
         <Card>
            <Text style={[settingsStyles.hint, { color: colors.textSecondary }]}>
               {t('account.emailHint', { email: auth.currentUser?.email || '' })}
            </Text>
            <Field label={t('account.newEmail')} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
            <Field label={t('account.currentPassword')} value={emailPassword} onChangeText={setEmailPassword} secureTextEntry />
            <PageButton title={t('account.changeEmail')} onPress={handleChangeEmail} disabled={busy !== null} />
         </Card>

         <SectionTitle>{t('account.passwordSection')}</SectionTitle>
         <Card>
            <Field label={t('account.currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <Field label={t('account.newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Field label={t('account.repeatPassword')} value={repeatPassword} onChangeText={setRepeatPassword} secureTextEntry />
            <PageButton title={t('account.changePassword')} onPress={handleChangePassword} disabled={busy !== null} />
         </Card>

         <SectionTitle>{t('account.appSection')}</SectionTitle>
         <Card style={styles.listCard}>
            {shortcuts.map((item, index) => (
               <Pressable
                  key={item.route}
                  onPress={() => navigation.navigate(item.route)}
                  style={({ pressed }) => [
                     styles.row,
                     { borderBottomColor: colors.border },
                     index === shortcuts.length - 1 && styles.rowLast,
                     pressed && { opacity: 0.85 },
                  ]}
               >
                  <View style={[styles.rowIcon, { backgroundColor: colors.iconBg }]}>
                     <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
               </Pressable>
            ))}
         </Card>

         <SectionTitle>{t('account.dangerSection')}</SectionTitle>
         <Card>
            <Text style={[settingsStyles.hint, { color: colors.textSecondary }]}>{t('account.deleteHint')}</Text>
            <Field label={t('account.currentPassword')} value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
            <PageButton danger title={t('account.deleteAction')} onPress={handleDelete} disabled={busy !== null} />
         </Card>

         <Text style={[styles.version, { color: colors.textMuted }]}>
            StudEvent {Constants.expoConfig?.version ?? ''}
         </Text>
      </SettingsPage>
   );
}

const styles = StyleSheet.create({
   listCard: { paddingVertical: 6 },
   row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
   rowLast: { borderBottomWidth: 0 },
   rowIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
   rowLabel: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 14 },
   version: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
