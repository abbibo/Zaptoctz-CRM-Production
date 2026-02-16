const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getFirestore, doc, setDoc, updateDoc } = require("firebase/firestore");

// --- 1. Load Environment Variables ---
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

// --- CONFIG ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "zaptockz@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Z@pT0ckz!9QmL7#A";

const TEST_EMAIL = "test-role-sync-client@zaptockz.com";
const TEST_PASSWORD = "Password123!";


const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper: Log with timestamp
const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`);

async function verifyRoleSync() {
    log(`Starting Client-Side Role Sync Verification...`);
    log(`Admin: ${ADMIN_EMAIL}`);
    log(`Test User: ${TEST_EMAIL}`);

    try {
        // --- Step 1: Login as Admin ---
        log(`\n--- [1] Authenticating as Admin ---`);
        const adminCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        const adminUid = adminCred.user.uid;
        log(`Admin logged in: ${adminUid}`);

        // Re-authenticate or ensuring our token is fresh
        const adminTokenResult = await adminCred.user.getIdTokenResult(true);
        log(`Admin Claims: ${JSON.stringify(adminTokenResult.claims)}`);

        // --- Step 2: Create/Reset Test User ---
        log(`\n--- [2] Setting up Test User ---`);
        
        // We need a secondary app to handle the test user auth concurrently or sequentially without losing admin state?
        // Actually, for simplicity, let's just swap sessions.
        await signOut(auth); // Sign out admin
        
        // Create or Login Test User
        let testUserUid;
        try {
            const userCred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
            testUserUid = userCred.user.uid;
            log(`Logged in as existing Test User: ${testUserUid}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                 // Try creating? check if we can register
                 // If not allowed, we might need to fail. 
                 // Assuming public registration is allowed or we can use createUserWithEmailAndPassword
                 try {
                    const { createUserWithEmailAndPassword } = require("firebase/auth");
                    const userCred = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
                    testUserUid = userCred.user.uid;
                    log(`Created new Test User: ${testUserUid}`);
                 } catch (regError) {
                     throw new Error(`Could not create test user: ${regError.message}`);
                 }
            } else {
                throw e;
            }
        }
        
        // --- Step 3: Login as Admin to Update Role ---
        log(`\n--- [3] Admin Updating Role ---`);
        await signOut(auth); // Sign out Test User
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD); // Back to Admin
        
        // Reset role to member first
        const userDocRef = doc(db, "members", testUserUid);
        await setDoc(userDocRef, {
            email: TEST_EMAIL,
            role: "member",
            status: "active",
            name: "Test Client User",
            updatedBy: "verify_script"
        }, { merge: true });
        log(`Reset Test User Firestore doc to 'member'.`);

        // Wait a moment
        await new Promise(r => setTimeout(r, 1000));

        // Update to admin
        log(`Updating Test User Firestore doc to 'admin'...`);
        await updateDoc(userDocRef, {
            role: "admin",
            updatedAt: new Date().toISOString()
        });
        
        // --- Step 4: Verify as Test User ---
        log(`\n--- [4] Verifying Claims as Test User ---`);
        await signOut(auth); // Sign out Admin
        const testUserCred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
        const userCred = testUserCred.user;

        log(`Polling for custom claims (timeout 30s)...`);
        
        // Pass userCred object which has getIdTokenResult method
        const success = await waitForRoleClaim(userCred, 'admin', 30000);

        if (success) {
            log(`\n✅ SUCCESS: Custom claim 'role: admin' detected!`);
        } else {
            log(`\n❌ FAILED: Role 'admin' not found in claims after timeout.`);
        }

    } catch (error) {
        console.error("\n❌ ERROR:", error);
    } finally {
        // Cleanup: Exit process
        process.exit(0);
    }
}

async function waitForRoleClaim(user, expectedRole, timeoutMs) {
    const start = Date.now();
    let attempts = 0;

    while (Date.now() - start < timeoutMs) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
        
        // Force token refresh to get new claims
        const idTokenResult = await user.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        
        process.stdout.write('.');
        
        if (claims.role === expectedRole) {
            console.log(`\n   -> Found role '${claims.role}' on attempt ${attempts}`);
            return true;
        }
    }
    return false;
}

verifyRoleSync();
