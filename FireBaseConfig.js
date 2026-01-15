import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
   getAuth,
   initializeAuth,
   getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config from Firebase console
const firebaseConfig = {
   apiKey: 'AIzaSyDmnjfOhA629stxePe7_gfHQzZbfHm0ZU0',
   authDomain: 'studeventbase.firebaseapp.com',
   projectId: 'studeventbase',
   storageBucket: 'studeventbase.firebasestorage.app',
   messagingSenderId: '967372320018',
   appId: '1:967372320018:web:46e5d4ae481d7891dcd7cb',
};

// Initialize application
export const app = initializeApp(firebaseConfig);

// Configure auth separately for web / native
let auth;

if (Platform.OS === 'web') {
   // For web
   auth = getAuth(app);
} else {
   // For React Native
   auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
   });
}

export { auth };

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);