import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
   getAuth,
   initializeAuth,
   getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Конфиг из консоли Firebase (оставил твой)
const firebaseConfig = {
   apiKey: 'AIzaSyDmnjfOhA629stxePe7_gfHQzZbfHm0ZU0',
   authDomain: 'studeventbase.firebaseapp.com',
   projectId: 'studeventbase',
   storageBucket: 'studeventbase.firebasestorage.app',
   messagingSenderId: '967372320018',
   appId: '1:967372320018:web:46e5d4ae481d7891dcd7cb',
};

// Инициализация приложения
export const app = initializeApp(firebaseConfig);

// Отдельно настраиваем auth для web / native
let auth;

if (Platform.OS === 'web') {
   // Для web
   auth = getAuth(app);
} else {
   // Для React Native
   auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
   });
}

export { auth };

// Инициализация Firestore
export const db = getFirestore(app);