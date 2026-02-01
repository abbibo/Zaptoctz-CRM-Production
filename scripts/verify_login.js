const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
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

const email = process.env.ADMIN_EMAIL || "zaptockz@13.online";
const password = process.env.ADMIN_PASSWORD || "Z@pT0ckz!9QmL7#A";

const verify = async () => {
    try {
        console.log(`Attempting to login as ${email}...`);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("LOGIN SUCCESSFUL!");
        console.log("User UID:", userCredential.user.uid);
        process.exit(0);
    } catch (error) {
        console.error("LOGIN FAILED:", error.code, error.message);
        process.exit(1);
    }
};

verify();
