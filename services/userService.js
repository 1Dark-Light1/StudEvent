import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../FireBaseConfig';
import { auth } from '../FireBaseConfig';

/**
 * Gets user data from Firestore
 */
export async function getUserData() {
   try {
      const user = auth.currentUser;
      if (!user) {
         return null;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
         return userDoc.data();
      }

      // If no data in Firestore, try to get from displayName
      if (user.displayName) {
         const nameParts = user.displayName.split(' ');
         return {
            name: nameParts[0] || '',
            surname: nameParts.slice(1).join(' ') || '',
         };
      }

      return null;
   } catch (error) {
      console.error('Error getting user data:', error);
      return null;
   }
}

/**
 * Saves user data to Firestore
 */
export async function saveUserData(userData) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
         ...userData,
         updatedAt: new Date(),
      }, { merge: true });

      return true;
   } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
   }
}

/**
 * Gets user data by their UID
 */
export async function getUserDataById(userId) {
   try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
         return userDoc.data();
      }

      return null;
   } catch (error) {
      console.error('Error getting user data by ID:', error);
      return null;
   }
}

/**
 * Gets data for multiple users by their UIDs
 */
export async function getUsersDataByIds(userIds) {
   try {
      const usersData = await Promise.all(
         userIds.slice(0, 4).map(userId => getUserDataById(userId))
      );
      return usersData.filter(user => user !== null);
   } catch (error) {
      console.error('Error getting users data by IDs:', error);
      return [];
   }
}

/**
 * Subscribes to real-time user data changes
 */
export function subscribeToUserData(callback) {
   const user = auth.currentUser;
   if (!user) {
      callback(null);
      return () => {};
   }

   const userDocRef = doc(db, 'users', user.uid);

   return onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
         callback(docSnapshot.data());
      } else {
         
         if (user.displayName) {
            const nameParts = user.displayName.split(' ');
            callback({
               name: nameParts[0] || '',
               surname: nameParts.slice(1).join(' ') || '',
            });
         } else {
            callback(null);
         }
      }
   }, (error) => {
      console.error('Error subscribing to user data:', error);
      
      if (user.displayName) {
         const nameParts = user.displayName.split(' ');
         callback({
            name: nameParts[0] || '',
            surname: nameParts.slice(1).join(' ') || '',
         });
      } else {
         callback(null);
      }
   });
}

/**
 * Gets all users from the users collection
 */
export async function getAllUsers() {
   try {
      const { collection, getDocs } = await import('firebase/firestore');
      const usersCollectionRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollectionRef);
      
      const users = [];
      querySnapshot.forEach((doc) => {
         users.push({
            uid: doc.id,
            ...doc.data()
         });
      });
      
      return users;
   } catch (error) {
      console.error('Error getting all users:', error);
      return [];
   }
}


