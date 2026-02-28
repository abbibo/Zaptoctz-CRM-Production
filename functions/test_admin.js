const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'zaptockz-crm-app' });

async function check() {
  try {
    const snapshot = await admin.firestore().collection('members').limit(1).get();
    console.log("Connected! Docs found:", snapshot.size);
  } catch (e) {
    console.error("Error:", e);
  }
}

check();
