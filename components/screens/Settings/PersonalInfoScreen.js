/**
 * Personal information: profile photo, editable first and last name, the sign-in
 * email (changed in Account settings) and the date the account was created.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../../FireBaseConfig';
import { saveUserData } from '../../../services/userService';
import { useI18n } from '../../../i18n/I18nContext';
import { useTheme } from '../../../contexts/ThemeContext';
import Avatar, { useMyProfile, useProfilePhotoMenu } from '../../ui/Avatar';
import SettingsPage, { Card, Field, PageButton, SectionTitle, settingsStyles } from './SettingsPage';

export default function PersonalInfoScreen({ navigation, route }) {
   const { t, displayDate, errorText } = useI18n();
   const { colors } = useTheme();
   const profile = useMyProfile();
   const { saving: savingPhoto, openPhotoMenu } = useProfilePhotoMenu(profile?.photo);
   const [name, setName] = useState('');
   const [surname, setSurname] = useState('');
   const [saving, setSaving] = useState(false);
   const user = auth.currentUser;

   // fill the form once the profile has loaded
   useEffect(() => {
      if (profile) {
         setName(profile.name || '');
         setSurname(profile.surname || '');
      }
   }, [profile]);

   const changed = profile && (name.trim() !== (profile.name || '') || surname.trim() !== (profile.surname || ''));

   const handleSave = async () => {
      if (!name.trim()) {
         Alert.alert(t('common.error'), t('profile.nameRequired'));
         return;
      }
      setSaving(true);
      try {
         await saveUserData({ name: name.trim(), surname: surname.trim() });
         await updateProfile(user, { displayName: `${name.trim()} ${surname.trim()}`.trim() });
         Alert.alert(t('common.success'), t('profile.saved'));
      } catch (error) {
         console.error('Error saving profile:', error);
         Alert.alert(t('common.error'), errorText(error, 'profile.saveError'));
      } finally {
         setSaving(false);
      }
   };

   return (
      <SettingsPage navigation={navigation} route={route} title={t('settings.personalInfo')} subtitle={t('profile.subtitle')}>
         <Pressable onPress={openPhotoMenu} disabled={savingPhoto} style={styles.avatarWrap}>
            <Avatar photo={profile?.photo} size={112} backgroundColor={colors.avatarBg} iconColor={colors.textMuted} />
            <View style={[styles.avatarBadge, { backgroundColor: colors.surface }]}>
               {savingPhoto ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="camera" size={15} color={colors.text} />}
            </View>
         </Pressable>

         <SectionTitle>{t('profile.nameSection')}</SectionTitle>
         <Card>
            <Field label={t('field.firstName')} value={name} onChangeText={setName} autoCapitalize="words" />
            <Field label={t('field.lastName')} value={surname} onChangeText={setSurname} autoCapitalize="words" />
            <PageButton title={saving ? t('profile.saving') : t('profile.save')} onPress={handleSave} disabled={!changed || saving} />
         </Card>

         <SectionTitle>{t('profile.accountSection')}</SectionTitle>
         <Card>
            <View style={settingsStyles.infoRow}>
               <Text style={[settingsStyles.infoLabel, { color: colors.textSecondary }]}>{t('field.email')}</Text>
               <Text style={[settingsStyles.infoValue, { color: colors.text }]} numberOfLines={1}>{user?.email}</Text>
            </View>
            {!!user?.metadata?.creationTime && (
               <View style={settingsStyles.infoRow}>
                  <Text style={[settingsStyles.infoLabel, { color: colors.textSecondary }]}>{t('profile.memberSince')}</Text>
                  <Text style={[settingsStyles.infoValue, { color: colors.text }]}>{displayDate(new Date(user.metadata.creationTime))}</Text>
               </View>
            )}
            <Pressable onPress={() => navigation.navigate('AccountSettings')} style={styles.link}>
               <Text style={[styles.linkText, { color: colors.primary }]}>{t('profile.changeEmailLink')}</Text>
               <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
         </Card>
      </SettingsPage>
   );
}

const styles = StyleSheet.create({
   avatarWrap: { alignSelf: 'center', marginBottom: 24 },
   avatarBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
   },
   link: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
   linkText: { fontSize: 14, fontWeight: '600' },
});
