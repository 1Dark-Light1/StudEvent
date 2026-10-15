// Firestore security rules tests. Run with: npm run test:rules (needs Java for the emulator)
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import {
   initializeTestEnvironment,
   assertSucceeds,
   assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';

let env;
const db = (uid) => env.authenticatedContext(uid).firestore();

before(async () => {
   env = await initializeTestEnvironment({
      projectId: 'demo-studevent',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
   });
});

after(() => env.cleanup());

beforeEach(async () => {
   await env.clearFirestore();
   await env.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'admins/admin'), {});
      await setDoc(doc(adminDb, 'tasks/global'), {
         userId: 'admin', isGlobal: true, participants: ['alice'], name: 'Event',
      });
      await setDoc(doc(adminDb, 'tasks/personal'), { userId: 'alice', name: 'Mine' });
   });
});

test('only admins create global events', async () => {
   await assertFails(setDoc(doc(db('alice'), 'tasks/x'), { userId: 'alice', isGlobal: true, participants: [] }));
   await assertSucceeds(setDoc(doc(db('admin'), 'tasks/x'), { userId: 'admin', isGlobal: true, participants: [] }));
   await assertSucceeds(setDoc(doc(db('alice'), 'tasks/y'), { userId: 'alice', name: 'Personal' }));
});

test('admins collection is read-only for clients', async () => {
   await assertFails(setDoc(doc(db('alice'), 'admins/alice'), {}));
   await assertSucceeds(getDoc(doc(db('admin'), 'admins/admin')));
   await assertFails(getDoc(doc(db('alice'), 'admins/admin')));
});

test('users join and leave only themselves', async () => {
   await assertSucceeds(updateDoc(doc(db('bob'), 'tasks/global'), { participants: arrayUnion('bob') }));
   await assertSucceeds(updateDoc(doc(db('bob'), 'tasks/global'), { participants: arrayRemove('bob') }));
   await assertFails(updateDoc(doc(db('bob'), 'tasks/global'), { participants: arrayRemove('alice') }));
   await assertFails(updateDoc(doc(db('bob'), 'tasks/global'), { participants: arrayUnion('carol') }));
   await assertFails(updateDoc(doc(db('bob'), 'tasks/global'), { participants: [] }));
});

test('users change only their own completion', async () => {
   await assertSucceeds(updateDoc(doc(db('bob'), 'tasks/global'), { 'userCompletions.bob': { isCompleted: true } }));
   await assertSucceeds(updateDoc(doc(db('bob'), 'tasks/global'), { 'userCompletions.bob': deleteField() }));
   await assertFails(updateDoc(doc(db('bob'), 'tasks/global'), { 'userCompletions.alice': { isCompleted: false } }));
});

test('participants add only themselves to completedBy', async () => {
   await assertSucceeds(updateDoc(doc(db('alice'), 'tasks/global'), { completedBy: arrayUnion('alice'), completedAt: 1 }));
   await assertFails(updateDoc(doc(db('alice'), 'tasks/global'), { completedBy: arrayUnion('bob') }));
   await assertFails(updateDoc(doc(db('bob'), 'tasks/global'), { completedBy: arrayUnion('bob') }));
});

test('only admins edit or delete global events', async () => {
   await assertFails(updateDoc(doc(db('alice'), 'tasks/global'), { name: 'Hacked' }));
   await assertFails(deleteDoc(doc(db('alice'), 'tasks/global')));
   await assertSucceeds(updateDoc(doc(db('admin'), 'tasks/global'), { name: 'Renamed' }));
   await assertSucceeds(deleteDoc(doc(db('admin'), 'tasks/global')));
});

test('personal tasks belong to their owner', async () => {
   await assertFails(getDoc(doc(db('bob'), 'tasks/personal')));
   await assertFails(updateDoc(doc(db('bob'), 'tasks/personal'), { name: 'x' }));
   await assertSucceeds(updateDoc(doc(db('alice'), 'tasks/personal'), { name: 'Renamed', isCompleted: true }));
   await assertFails(updateDoc(doc(db('alice'), 'tasks/personal'), { isGlobal: true }));
   await assertFails(updateDoc(doc(db('alice'), 'tasks/personal'), { userId: 'bob' }));
});

test('users set their own, small profile photo', async () => {
   const small = 'data:image/jpeg;base64,' + 'A'.repeat(40000);
   const huge = 'data:image/jpeg;base64,' + 'A'.repeat(300000);
   await assertSucceeds(setDoc(doc(db('alice'), 'users/alice'), { name: 'Alice', photo: small }));
   await assertFails(setDoc(doc(db('alice'), 'users/alice'), { name: 'Alice', photo: huge }));
   await assertFails(setDoc(doc(db('bob'), 'users/alice'), { photo: small }));
   // deleting the own profile (account deletion) is allowed, someone else's is not
   await assertFails(deleteDoc(doc(db('bob'), 'users/alice')));
   await assertSucceeds(deleteDoc(doc(db('alice'), 'users/alice')));
});
