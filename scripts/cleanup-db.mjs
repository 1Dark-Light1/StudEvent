/**
 * Removes stale data from Firestore: data of deleted Auth users, messages of deleted
 * tasks and messages from previous months, and the old `email` field of user profiles.
 *
 * Needs an admin service account key (Firebase console -> Project settings ->
 * Service accounts -> Generate new private key). Keep it outside the repository.
 *
 *   Dry run (only reports):  node scripts/cleanup-db.mjs <path-to-key.json>
 *   Delete:                  node scripts/cleanup-db.mjs <path-to-key.json> --apply
 *   Also all past tasks:     add --past-tasks (tasks and events dated before today)
 *   Keep only some accounts: add --keep-only=a@x.com,b@y.com (deletes the other accounts and their data)
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [keyPath, ...flags] = process.argv.slice(2);
if (!keyPath) {
   console.error('Usage: node scripts/cleanup-db.mjs <service-account-key.json> [--apply] [--past-tasks] [--keep-only=emails]');
   process.exit(1);
}
const apply = flags.includes('--apply');
const pastTasks = flags.includes('--past-tasks');
// --keep-only=a@x.com,b@y.com: delete every other Auth account (and then all its data)
const keepOnly = flags.find((f) => f.startsWith('--keep-only='))?.slice('--keep-only='.length).split(',').map((e) => e.trim().toLowerCase());

// 'DD.MM.YYYY' before today (local time)
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const isPast = (dateString) => {
   const [day, month, year] = String(dateString || '').split('.').map(Number);
   return !!year && new Date(year, month - 1, day) < startOfToday;
};

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

// ---- existing accounts (accounts to remove with --keep-only count as already deleted)
const existingUids = new Set();
const accountsToDelete = [];
let pageToken;
do {
   const page = await getAuth().listUsers(1000, pageToken);
   for (const user of page.users) {
      if (keepOnly && !keepOnly.includes((user.email || '').toLowerCase())) accountsToDelete.push(user);
      else existingUids.add(user.uid);
   }
   pageToken = page.pageToken;
} while (pageToken);

if (keepOnly) {
   // every listed email must exist, otherwise a typo would delete an account that should stay
   if (existingUids.size !== keepOnly.length) {
      console.error(`--keep-only matched ${existingUids.size} of ${keepOnly.length} emails; check the addresses.`);
      process.exit(1);
   }
   console.log(`Accounts to delete from Auth: ${accountsToDelete.length}`);
   for (const user of accountsToDelete) console.log(`  - ${user.email || user.uid}`);
}

const deletes = []; // { ref, reason }
const updates = []; // { ref, data, reason }
const gone = (uid) => uid && !existingUids.has(uid);

// ---- users and admins of deleted accounts; drop the email field from profiles
for (const doc of (await db.collection('users').get()).docs) {
   if (gone(doc.id)) deletes.push({ ref: doc.ref, reason: 'user profile of a deleted account' });
   else if (doc.get('email') !== undefined) updates.push({ ref: doc.ref, data: { email: FieldValue.delete() }, reason: 'remove email from profile' });
}
for (const doc of (await db.collection('admins').get()).docs) {
   if (gone(doc.id)) deletes.push({ ref: doc.ref, reason: 'admin entry of a deleted account' });
}

// ---- tasks of deleted accounts; deleted users inside global events
const taskIds = new Set();
for (const doc of (await db.collection('tasks').get()).docs) {
   const task = doc.data();
   if (gone(task.userId)) {
      deletes.push({ ref: doc.ref, reason: `${task.isGlobal ? 'global event' : 'task'} "${task.name}" of a deleted account` });
      continue;
   }
   if (pastTasks && isPast(task.date)) {
      deletes.push({ ref: doc.ref, reason: `past ${task.isGlobal ? 'global event' : 'task'} "${task.name}" (${task.date})` });
      continue;
   }
   taskIds.add(doc.id);
   if (!task.isGlobal) continue;

   const data = {};
   const goneParticipants = (task.participants || []).filter(gone);
   if (goneParticipants.length) data.participants = FieldValue.arrayRemove(...goneParticipants);
   const goneCompletedBy = Array.isArray(task.completedBy) ? task.completedBy.filter(gone) : [];
   if (goneCompletedBy.length) data.completedBy = FieldValue.arrayRemove(...goneCompletedBy);
   for (const uid of Object.keys(task.userCompletions || {}).filter(gone)) {
      data[`userCompletions.${uid}`] = FieldValue.delete();
   }
   if (Object.keys(data).length) updates.push({ ref: doc.ref, data, reason: `deleted users in event "${task.name}"` });
}

// ---- messages: deleted accounts, deleted tasks, previous months (the app keeps the current month)
const now = new Date();
for (const doc of (await db.collection('messages').get()).docs) {
   const message = doc.data();
   const oldMonth = message.year < now.getFullYear() || (message.year === now.getFullYear() && message.month < now.getMonth());
   if (gone(message.userId)) deletes.push({ ref: doc.ref, reason: 'message of a deleted account' });
   else if (message.taskId && !taskIds.has(message.taskId)) deletes.push({ ref: doc.ref, reason: 'message of a deleted task' });
   else if (oldMonth) deletes.push({ ref: doc.ref, reason: 'message from a previous month' });
}

// ---- report
const summary = {};
for (const { reason } of [...deletes, ...updates]) {
   const key = reason.replace(/".*"/, '"…"');
   summary[key] = (summary[key] || 0) + 1;
}
console.log(`Accounts in Auth: ${existingUids.size}`);
console.log(`To delete: ${deletes.length} documents, to update: ${updates.length} documents`);
for (const [reason, count] of Object.entries(summary)) console.log(`  ${String(count).padStart(4)}  ${reason}`);
for (const { ref, reason } of deletes.filter((d) => d.ref.parent.id === 'tasks')) console.log(`  - ${ref.path}: ${reason}`);

if (!apply) {
   console.log('\nDry run: nothing was changed. Run again with --apply to clean up.');
   process.exit(0);
}

// ---- apply in batches of 500 (Firestore limit)
const writes = [...deletes.map((d) => (batch) => batch.delete(d.ref)), ...updates.map((u) => (batch) => batch.update(u.ref, u.data))];
for (let i = 0; i < writes.length; i += 500) {
   const batch = db.batch();
   writes.slice(i, i + 500).forEach((write) => write(batch));
   await batch.commit();
}
if (accountsToDelete.length) {
   await getAuth().deleteUsers(accountsToDelete.map((user) => user.uid));
}
console.log(`\nDone: deleted ${deletes.length}, updated ${updates.length} documents, ${accountsToDelete.length} accounts.`);
