const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, getDoc, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBST6zHnQpBjt6KTCtG4FIAnMz51SBqou4',
  authDomain: 'zaptockz-crm-app.firebaseapp.com',
  projectId: 'zaptockz-crm-app',
  storageBucket: 'zaptockz-crm-app.firebasestorage.app',
  appId: '1:272528841000:web:ccddc91d838287d883181d'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTest(role, email, password) {
  console.log(`\n--- Testing Role: ${role.toUpperCase()} (${email}) ---`);
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    console.log(`Signed in successfully as ${user.uid}`);
    
    await delay(1000); // Wait for auth claims to settle

    // Test 1: Read all members
    try {
      const p = await getDocs(collection(db, 'members'));
      console.log(`[${role}] Read all members: SUCCESS (${p.size} members found)`);
    } catch (e) {
      console.log(`[${role}] Read all members: FAILED - ${e.code}`);
    }

    // Test 2: Read own member document
    try {
      const selfDoc = await getDoc(doc(db, 'members', user.uid));
      console.log(`[${role}] Read own member doc: SUCCESS (Exists: ${selfDoc.exists()})`);
    } catch (e) {
      console.log(`[${role}] Read own member doc: FAILED - ${e.code}`);
    }

    // Test 3: Read all leads
    try {
      const p = await getDocs(collection(db, 'leads'));
      console.log(`[${role}] Read all leads: SUCCESS (${p.size} leads found)`);
    } catch (e) {
      console.log(`[${role}] Read all leads: FAILED - ${e.code}`);
    }

  } catch (error) {
    console.error(`Error authenticating ${role}:`, error.message);
  }
}

async function runAll() {
  await runTest('admin', 'abeypaul13@gmail.com', 'abeypaul1316');
  await auth.signOut();
  
  await runTest('manager', 'manager1@zaptockz.com', 'password123');
  await auth.signOut();
  
  await runTest('member', 'member1@zaptockz.com', 'password123');
  await auth.signOut();
  
  process.exit(0);
}

runAll();
