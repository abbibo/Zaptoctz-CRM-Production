const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeFirestore, doc, setDoc } = require("firebase/firestore");

// 1. Load Environment Variables from .env file
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} else {
    console.error("No .env file found at " + envPath);
    process.exit(1);
}

console.log("Using Project ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);

// 2. Firebase Configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Aggressive settings to bypass gRPC issues
const db = initializeFirestore(app, { 
    experimentalForceLongPolling: true,
    useFetchStreams: false 
});

// 4. Admin Credentials
const adminName = "System Admin";
const adminEmail = "admin@example.com";
const adminPassword = "change-me-immediately";
const adminPhone = "0000000000";

const createAdmin = async () => {
    try {
        console.log(`Processing admin user: ${adminEmail}...`);

        let user;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            user = userCredential.user;
            console.log("New Auth user created. UID:", user.uid);
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log("User already exists. Signing in...");
                const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                user = userCredential.user;
                console.log("Signed in. UID:", user.uid);
            } else {
                throw authError;
            }
        }

        const memberData = {
            name: adminName,
            phone: adminPhone,
            role: "admin",
            referralLink: "https://internify.online",
            email: adminEmail,
            status: "active",
            notes: "System Administrator - Auto Generated",
            updatedAt: new Date().toISOString()
        };

        console.log("Attempting Firestore write...");
        
        // Add a timeout to fail fast if it hangs
        const writePromise = setDoc(doc(db, "members", user.uid), memberData, { merge: true });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timed out")), 15000));
        
        await Promise.race([writePromise, timeoutPromise]);

        console.log("Firestore document updated successfully.");
        console.log("--------------------------------------------------");
        console.log("ADMIN ACCOUNT READY");
        console.log("Username: " + adminEmail);
        console.log("Password: " + adminPassword);
        console.log("Role:     admin");
        console.log("--------------------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("CRITICAL ERROR:", error.message || error);
        // Explicitly dump error code if available
        if (error.code) console.error("Error Code:", error.code);
        process.exit(1);
    }
};

createAdmin();
