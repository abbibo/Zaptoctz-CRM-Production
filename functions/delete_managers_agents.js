/**
 * delete_managers_agents.js
 *
 * Permanently deletes all Firebase Auth users AND their Firestore 'members'
 * documents where role == 'manager' OR role == 'member' (agents).
 * The admin account (role == 'admin') is left untouched.
 *
 * Run from the /functions directory with:
 *   $env:GOOGLE_CLOUD_PROJECT="zaptockz-crm-app"; node delete_managers_agents.js
 */

const admin = require('firebase-admin');

const serviceAccount = require('C:/Users/ASUS/Downloads/zaptockz-crm-firebase-adminsdk-fbsvc-35d741acc9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'zaptockz-crm-app',
});

const auth = admin.auth();
const db = admin.firestore();

async function deleteManagersAndAgents() {
  console.log('=== Fetching members with role manager or member ===\n');

  const snapshot = await db.collection('members')
    .where('role', 'in', ['manager', 'member'])
    .get();

  if (snapshot.empty) {
    console.log('No managers or agents found. Nothing to delete.');
    process.exit(0);
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
        console.log(`  ⚠ Auth user not found (skipped): ${uid}`);
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
  process.exit(0);
}

deleteManagersAndAgents().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
