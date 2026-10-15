/** Round profile photo, or a person icon when there is none. */
import React, { useEffect, useState } from 'react';
import { View, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToUserData } from '../../services/userService';
import { pickAndSaveProfilePhoto, removeProfilePhoto } from '../../services/profilePhoto';
import { useI18n } from '../../i18n/I18nContext';

/**
 * "Choose a photo / Remove photo" menu for the profile photo.
 * Returns { saving, openPhotoMenu }.
 */
export function useProfilePhotoMenu(currentPhoto) {
   const { t } = useI18n();
   const [saving, setSaving] = useState(false);

   const run = async (action) => {
      setSaving(true);
      try {
         const result = await action();
         if (result === 'denied') Alert.alert(t('settings.photo.title'), t('settings.photo.denied'));
      } catch (error) {
         console.error('Error saving profile photo:', error);
         Alert.alert(t('common.error'), t('settings.photo.error'));
      } finally {
         setSaving(false);
      }
   };

   const openPhotoMenu = () => {
      const buttons = [{ text: t('settings.photo.choose'), onPress: () => run(pickAndSaveProfilePhoto) }];
      if (currentPhoto) buttons.push({ text: t('settings.photo.remove'), style: 'destructive', onPress: () => run(removeProfilePhoto) });
      buttons.push({ text: t('task.cancel'), style: 'cancel' });
      Alert.alert(t('settings.photo.title'), undefined, buttons);
   };

   return { saving, openPhotoMenu };
}

/** The signed-in user's profile (name, surname, photo), kept up to date. */
export function useMyProfile() {
   const [profile, setProfile] = useState(null);
   useEffect(() => subscribeToUserData(setProfile), []);
   return profile;
}

export default function Avatar({ photo, size, backgroundColor, iconColor, style }) {
   return (
      <View
         style={[
            { width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor },
            style,
         ]}
      >
         {photo ? (
            <Image source={{ uri: photo }} style={{ width: size, height: size }} />
         ) : (
            <Ionicons name="person" size={Math.round(size * 0.55)} color={iconColor} />
         )}
      </View>
   );
}
