import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, orderBy, onSnapshot, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db } from '../FireBaseConfig';
import { auth } from '../FireBaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDDEN_MESSAGES_KEY = '@hidden_messages';

/**
 * Зберігає повідомлення у Firestore (з перевіркою на дублікати)
 */
export async function saveMessage(title, body, type, taskId = null) {
   try {
      const user = auth.currentUser;
      if (!user) {
         return null;
      }

      // Перевіряємо, чи не існує вже таке повідомлення
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const existingQuery = query(
         collection(db, 'messages'),
         where('userId', '==', user.uid),
         where('taskId', '==', taskId),
         where('type', '==', type),
         where('month', '==', currentMonth),
         where('year', '==', currentYear)
      );

      const existingSnapshot = await getDocs(existingQuery);
      
      // Якщо вже є таке повідомлення за цей місяць - не створюємо дублікат
      if (!existingSnapshot.empty) {
         return existingSnapshot.docs[0].id;
      }

      const messageDoc = {
         userId: user.uid,
         title,
         body,
         type,
         taskId,
         createdAt: Timestamp.now(),
         month: new Date().getMonth(), // 0-11
         year: new Date().getFullYear(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageDoc);
      return docRef.id;
   } catch (error) {
      console.error('Error saving message:', error);
      return null;
   }
}

/**
 * Отримує повідомлення користувача за поточний місяць
 */
export async function getCurrentMonthMessages() {
   try {
      const user = auth.currentUser;
      if (!user) {
         return [];
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const messagesQuery = query(
         collection(db, 'messages'),
         where('userId', '==', user.uid),
         where('month', '==', currentMonth),
         where('year', '==', currentYear)
      );

      const querySnapshot = await getDocs(messagesQuery);
      const messages = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data(),
      }));
      
      // Сортуємо на клієнті
      messages.sort((a, b) => {
         const dateA = a.createdAt?.toMillis?.() || 0;
         const dateB = b.createdAt?.toMillis?.() || 0;
         return dateB - dateA;
      });
      
      return messages;
   } catch (error) {
      console.error('Error getting messages:', error);
      return [];
   }
}

/**
 * Підписується на повідомлення користувача за поточний місяць
 */
export function subscribeToCurrentMonthMessages(callback) {
   const user = auth.currentUser;
   if (!user) {
      callback([]);
      return () => {};
   }

   const now = new Date();
   const currentMonth = now.getMonth();
   const currentYear = now.getFullYear();

   // Спочатку фільтруємо за userId, month, year, потім сортуємо на клієнті
   // щоб уникнути необхідності створювати складний індекс
   const messagesQuery = query(
      collection(db, 'messages'),
      where('userId', '==', user.uid),
      where('month', '==', currentMonth),
      where('year', '==', currentYear)
   );
   
   const unsubscribe = onSnapshot(
      messagesQuery,
      (querySnapshot) => {
         const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
         }));
         // Сортуємо на клієнті за датою створення (новіші спочатку)
         messages.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
         });
         callback(messages);
      },
      (error) => {
         console.error('Error subscribing to messages:', error);
         callback([]);
      }
   );

   return unsubscribe;
}

/**
 * Видаляє повідомлення старіші за поточний місяць
 */
export async function cleanupOldMessages() {
   try {
      const user = auth.currentUser;
      if (!user) {
         return;
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Отримуємо всі повідомлення користувача
      const messagesQuery = query(
         collection(db, 'messages'),
         where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      let batchCount = 0;

      querySnapshot.docs.forEach((doc) => {
         const message = doc.data();
         const messageMonth = message.month;
         const messageYear = message.year;

         // Видаляємо повідомлення, які не належать поточному місяцю
         if (messageYear < currentYear || (messageYear === currentYear && messageMonth < currentMonth)) {
            batch.delete(doc.ref);
            batchCount++;
         }
      });

      if (batchCount > 0) {
         await batch.commit();
         console.log(`Cleaned up ${batchCount} old messages`);
      }
   } catch (error) {
      console.error('Error cleaning up old messages:', error);
   }
}

/**
 * Видаляє повідомлення за taskId
 */
export async function deleteMessagesByTaskId(taskId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         return;
      }

      const messagesQuery = query(
         collection(db, 'messages'),
         where('userId', '==', user.uid),
         where('taskId', '==', taskId)
      );

      const querySnapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach((doc) => {
         batch.delete(doc.ref);
      });

      if (querySnapshot.docs.length > 0) {
         await batch.commit();
         console.log(`Deleted ${querySnapshot.docs.length} messages for task ${taskId}`);
      }
   } catch (error) {
      console.error('Error deleting messages by taskId:', error);
   }
}

/**
 * Видаляє одне повідомлення за ID
 */
export async function deleteMessage(messageId) {
   try {
      const user = auth.currentUser;
      if (!user) {
         throw new Error('User not authenticated');
      }

      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
         throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      if (messageData.userId !== user.uid) {
         throw new Error('You can only delete your own messages');
      }

      await deleteDoc(messageRef);
      return true;
   } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
   }
}

/**
 * Оновлює повідомлення для задачі - видаляє старі та створює нові
 */
export async function updateMessagesForTask(taskId) {
   try {
      // Видаляємо старі повідомлення
      await deleteMessagesByTaskId(taskId);
      // Нові повідомлення будуть створені через updateTaskNotifications
   } catch (error) {
      console.error('Error updating messages for task:', error);
   }
}

/**
 * Отримує список прихованих повідомлень з AsyncStorage
 */
export async function getHiddenMessages() {
   try {
      const hiddenJson = await AsyncStorage.getItem(HIDDEN_MESSAGES_KEY);
      if (hiddenJson) {
         return new Set(JSON.parse(hiddenJson));
      }
      return new Set();
   } catch (error) {
      console.error('Error getting hidden messages:', error);
      return new Set();
   }
}

/**
 * Зберігає список прихованих повідомлень в AsyncStorage
 */
export async function saveHiddenMessages(hiddenIds) {
   try {
      const hiddenArray = Array.from(hiddenIds);
      await AsyncStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify(hiddenArray));
   } catch (error) {
      console.error('Error saving hidden messages:', error);
   }
}

/**
 * Додає повідомлення до списку прихованих
 */
export async function hideMessage(messageId) {
   try {
      const hidden = await getHiddenMessages();
      hidden.add(messageId);
      await saveHiddenMessages(hidden);
      return hidden;
   } catch (error) {
      console.error('Error hiding message:', error);
      return new Set();
   }
}
