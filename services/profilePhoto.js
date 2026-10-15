/**
 * Profile photo: picked from the gallery, cropped square, shrunk to 256x256 JPEG
 * and stored as a data URI in the user's Firestore profile (users/{uid}.photo).
 * Firebase Storage would need the paid plan; a ~20-40 KB image fits a document fine.
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { deleteField } from 'firebase/firestore';
import { saveUserData } from './userService';

const SIZE = 256;

/**
 * Lets the user pick and crop a photo, then saves it.
 * Returns 'saved', 'cancelled' or 'denied' (no access to the photos).
 */
export async function pickAndSaveProfilePhoto() {
   const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
   if (!permission.granted) return 'denied';

   const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
   });
   if (result.canceled || !result.assets?.length) return 'cancelled';

   const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: SIZE, height: SIZE }).renderAsync();
   const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });

   await saveUserData({ photo: `data:image/jpeg;base64,${saved.base64}` });
   return 'saved';
}

export async function removeProfilePhoto() {
   await saveUserData({ photo: deleteField() });
}
