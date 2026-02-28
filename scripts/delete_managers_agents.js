/**
 * delete_managers_agents.js
 *
 * Permanently deletes all Firebase Auth users AND their Firestore 'members'
 * documents where role == 'manager' OR role == 'member' (agents).
 * The admin account (role == 'admin') is left untouched.
 *
 * Run with:
 *   node scripts/delete_managers_agents.js
 *
 * Requires Application Default Credentials (firebase CLI login).
 */

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'zaptockz-crm-app',
});

const auth = getAuth();
const db = getFirestore();

async function deleteManagersAndAgents() {
  console.log('=== Fetching members with role manager or member ===\n');

  const snapshot = await db.collection('members')
    .where('role', 'in', ['manager', 'member'])
    .get();

  if (snapshot.empty) {
    console.log('No managers or agents found. Nothing to delete.');
    return;
  }

  console.log(`Found ${snapshot.size} user(s) to delete:\n`);

  const toDelete = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    console.log(`  - ${data.email || '(no email)'} | role: ${data.role} | uid: ${docSnap.id}`);
    toDelete.push({ uid: docSnap.id, email: data.email });
  });

  console.log('\n=== Deleting users from Firebase Auth ===\n');
  for (const { uid, email } of toDelete) {
    try {
      await auth.deleteUser(uid);
      console.log(`  ✓ Deleted Auth user: ${email || uid}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`  ⚠ Auth user not found (already deleted?): ${uid}`);
      } else {
        console.error(`  ✗ Error deleting auth user ${uid}:`, err.message);
      }
    }
  }

  console.log('\n=== Deleting Firestore documents from /members ===\n');
  const batch = db.batch();
  snapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
  console.log(`  ✓ Deleted ${snapshot.size} Firestore document(s).`);

  console.log('\n=== Done! All manager and agent accounts have been permanently removed. ===');
}

deleteManagersAndAgents().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
