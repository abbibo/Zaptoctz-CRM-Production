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

/**
 * Triggers when a new user is created in Firebase Auth.
 * Creates a default document in the 'members' collection.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const {uid, email, displayName, photoURL} = user;

  const newUser = {
    uid: uid,
    email: email || "",
    displayName: displayName || "",
    photoURL: photoURL || "",
    role: "member", // Default role
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const docRef = admin.firestore().collection("members").doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set(newUser);
      console.log(`Created member document for user ${uid}`);
    } else {
      console.log(`Member document for user ${uid} already exists (likely created by createMember). Skipping.`);
    }
  } catch (error) {
    console.error(`Error creating member document for user ${uid}:`, error);
  }

  return null;
});

/**
 * Callable function to create a new member (Admin only).
 * This allows admins to create users without being logged out.
 */
exports.createMember = functions.https.onCall(async (data, context) => {
  // Check if request is made by an authenticated user
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
    );
  }

  // Check if the caller is an admin
  const callerUid = context.auth.uid;
  const callerToken = await admin.auth().getUser(callerUid);
  const callerRole = callerToken.customClaims ? callerToken.customClaims.role : null;

  if (callerRole !== 'admin' && callerRole !== 'manager') {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins and managers can create new members."
    );
  }

  const { email, password, name, phone, role, referralLink, status, assignedManager } = data;

  if (callerRole === 'manager' && role !== 'member') {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Managers can only create agents."
    );
  }

  // Validate required fields
  if (!email || !password || !name) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Email, password, and name are required."
    );
  }

  try {
    // 1. Create user in Firebase Auth
    let uid;
    try {
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: name,
        disabled: status === 'inactive'
      });
      uid = userRecord.uid;
      console.log(`Created new user ${email} (UID: ${uid})`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'A member with this email already exists.');
      }
      throw error;
    }

    // 2. Set custom claims (role)
    await admin.auth().setCustomUserClaims(uid, { role: role });

    // 3. Create document in Firestore 'members' collection
    const newMember = {
      uid: uid,
      name,
      email,
      phone: phone || "",
      role: role || "member",
      referralLink: referralLink || "",
      status: status || "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid
    };

    // If an assignedManager is provided (e.g. from Admin side) and the user is an agent, set it
    if (role === 'member' && assignedManager) {
      newMember.assignedManager = assignedManager;
    }

    // If created by a manager, auto-assign the member to the manager
    if (callerRole === 'manager') {
      newMember.assignedManager = callerUid;
    }

    await admin.firestore().collection("members").doc(uid).set(newMember, { merge: true });

    // 4. Update the manager's assignedMembers array if applicable
    if (newMember.assignedManager) {
      const targetManagerId = newMember.assignedManager;
      const managerRef = admin.firestore().collection("members").doc(targetManagerId);
      await managerRef.update({
        assignedMembers: admin.firestore.FieldValue.arrayUnion(uid)
      });
    }

    return { success: true, message: `Member ${email} created successfully.` };

  } catch (error) {
    console.error("Error creating member:", error);
    throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create member."
    );
  }
});
