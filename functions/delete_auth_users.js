/**
 * delete_auth_users.js
 *
 * Uses the Firebase Auth REST API to list all users and delete those matching
 * a given list of UIDs. We build the UID list from the Firestore docs that
 * were already deleted (we pass them as command-line args or hard-code them).
 *
 * Strategy: since Firestore is already emptied, we'll list ALL Auth users
 * and delete any that are NOT the admin. The admin email is kept safe.
 *
 * NOTE: This script uses firebase-admin with the service account key.
 * Run from: functions/
 */

const admin = require('firebase-admin');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'zaptockz@gmail.com'; // Keep this account safe
const PROJECT_ID  = 'zaptockz-crm-app';
// ──────────────────────────────────────────────────────────────────────────────

const serviceAccount = require('C:/Users/ASUS/Downloads/zaptockz-crm-firebase-adminsdk-fbsvc-35d741acc9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: PROJECT_ID,
});

const auth = admin.auth();

async function listAllUsers(users = [], pageToken) {
  const result = await auth.listUsers(1000, pageToken);
  users.push(...result.users);
  if (result.pageToken) {
    return listAllUsers(users, result.pageToken);
  }
  return users;
}

async function deleteNonAdminUsers() {
  console.log('=== Listing all Firebase Auth users ===\n');
  const allUsers = await listAllUsers();
  console.log(`Total Auth users found: ${allUsers.length}`);

  const toDelete = allUsers.filter(u => u.email !== ADMIN_EMAIL);

  if (toDelete.length === 0) {
    console.log('No non-admin users found. Nothing to delete.');
    process.exit(0);
  }

  console.log(`\nUsers to delete (all except admin ${ADMIN_EMAIL}):\n`);
  for (const u of toDelete) {
    console.log(`  - ${u.email || '(no email)'} | uid: ${u.uid} | customClaims: ${JSON.stringify(u.customClaims || {})}`);
  }

  const uids = toDelete.map(u => u.uid);

  console.log('\n=== Deleting from Firebase Auth ===\n');
  // deleteUsers handles up to 1000 UIDs in one call
  const result = await auth.deleteUsers(uids);

  console.log(`  ✓ Successfully deleted: ${result.successCount}`);
  if (result.failureCount > 0) {
    console.log(`  ✗ Failed to delete: ${result.failureCount}`);
    result.errors.forEach(e => console.error(`    uid=${e.index}: ${e.error.message}`));
  }

  console.log('\n=== Done! All manager and agent Auth accounts removed. ===');
  process.exit(0);
}

deleteNonAdminUsers().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
