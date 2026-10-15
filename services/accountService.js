/**
 * Account changes that need the current password: email, password, deleting the account.
 * Firebase requires a recent sign-in for these, so each call re-authenticates first.
 */
import {
   EmailAuthProvider,
   reauthenticateWithCredential,
   verifyBeforeUpdateEmail,
   updatePassword,
   deleteUser,
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, arrayRemove, deleteField } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../FireBaseConfig';
import { deleteAllMyMessages } from './messagesService';

function appError(code) {
   const error = new Error(code);
   error.code = code;
   return error;
}

async function reauthenticate(password) {
   const user = auth.currentUser;
   if (!user) throw appError('not-signed-in');
   await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
   return user;
}

/** Sends a confirmation link to the new address; the email changes once it is opened. */
export async function changeEmail(password, newEmail) {
   const user = await reauthenticate(password);
   await verifyBeforeUpdateEmail(user, newEmail.trim());
}

export async function changePassword(currentPassword, newPassword) {
   const user = await reauthenticate(currentPassword);
   await updatePassword(user, newPassword);
}

/**
 * Deletes the user's data and then the account: own tasks (including global events they
 * created), their place in other events, messages and profile.
 */
export async function deleteAccount(password) {
   const user = await reauthenticate(password);
   const uid = user.uid;

   const own = await getDocs(query(collection(db, 'tasks'), where('userId', '==', uid)));
   for (const task of own.docs) await deleteDoc(task.ref);

   // leaving an event: the rules allow these as two separate updates
   const joined = await getDocs(query(collection(db, 'tasks'), where('participants', 'array-contains', uid)));
   for (const task of joined.docs) {
      await updateDoc(task.ref, { participants: arrayRemove(uid) });
      if (task.get(`userCompletions.${uid}`) !== undefined) {
         await updateDoc(task.ref, { [`userCompletions.${uid}`]: deleteField() });
      }
   }

   await deleteAllMyMessages();
   await deleteDoc(doc(db, 'users', uid));
   await AsyncStorage.removeItem('studevent.rememberLogin').catch(() => {});
   await deleteUser(user);
}
