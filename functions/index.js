const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Triggers when a user's document is written to in the 'members' collection.
 * Syncs the 'role' field from Firestore to Firebase Auth Custom Claims.
 */
exports.syncUserRole = functions.firestore
    .document("members/{uid}")
    .onWrite(async (change, context) => {
      const uid = context.params.uid;
      const newData = change.after.exists ? change.after.data() : null;
      const oldData = change.before.exists ? change.before.data() : null;

      // If document was deleted, we might want to clear claims or disable user.
      // For now, let's just return if no data.
      if (!newData) {
        console.log(`User document ${uid} deleted. No role to sync.`);
        return null;
      }

      const newRole = newData.role;
      const oldRole = oldData ? oldData.role : null;

      if (newRole === oldRole) {
        // Role didn't change, no need to update claims
        return null;
      }

      console.log(`Syncing role for user ${uid}: ${oldRole} -> ${newRole}`);

      try {
        // Set custom user claims on this newly created user.
        await admin.auth().setCustomUserClaims(uid, {role: newRole});
        console.log(`Successfully set custom claims for user ${uid} to role: ${newRole}`);

        // OPTIONAL: Revoke refresh tokens to force client to get new token immediately?
        // await admin.auth().revokeRefreshTokens(uid);
      } catch (error) {
        console.error("Error setting custom claims:", error);
      }

      return null;
    });
