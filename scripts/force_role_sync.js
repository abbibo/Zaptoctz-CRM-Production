const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeFirestore, doc, updateDoc } = require("firebase/firestore");
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });

const adminEmail = "zaptockz@gmail.com";
const adminPassword = "Z@pT0ckz!9QmL7#A";

const forceSync = async () => {
    try {
        console.log(`Signing in as ${adminEmail}...`);
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;
        console.log("Signed in. UID:", user.uid);

        const userRef = doc(db, "members", user.uid);

        console.log("Step 1: Setting role to 'member' to force change...");
        await updateDoc(userRef, { role: "member" });
        console.log("Role set to 'member'. Waiting 5 seconds for Cloud Function...");

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("Step 2: Setting role to 'admin'...");
        await updateDoc(userRef, { role: "admin" });
        console.log("Role set to 'admin'. Cloud Function should now sync to Auth Claims.");
        
        console.log("\nDONE! Please LOGOUT and LOGIN again on the website to see changes.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

forceSync();
