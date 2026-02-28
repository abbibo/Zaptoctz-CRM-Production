const admin = require("firebase-admin");
// Initialize using application default credentials, matching how functions/index.js does
admin.initializeApp({
  projectId: "zaptockz-crm-app"
});

async function run() {
  const db = admin.firestore();
  
  // get all members
  const snapshot = await db.collection("members").get();
  const members = {};
  
  let managerId = null;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    members[doc.id] = data;
    if (data.role === 'manager') managerId = doc.id;
  });

  console.log("Total members:", snapshot.size);
  
  if (managerId) {
    const manager = members[managerId];
    console.log(`\nFound Manager: ${manager.name} (${manager.email})`);
    console.log(`Assigned Members IDs: ${JSON.stringify(manager.assignedMembers || [])}`);
    
    // Check members
    const assignedIds = manager.assignedMembers || [];
    const assignedByField = Object.values(members).filter(m => m.assignedManager === managerId);
    
    console.log("\nAssigned Members details (from assignedMembers array):");
    assignedIds.forEach(id => {
      const m = members[id];
      if (m) console.log(`- ${m.name} (${m.email}) | Role: ${m.role} | Status: "${m.status}" | assignedManager: ${m.assignedManager}`);
      else console.log(`- ID: ${id} NOT FOUND IN MEMBERS COLLECTION`);
    });

    console.log("\nAssigned Members details (from assignedManager field):");
    assignedByField.forEach(m => {
      console.log(`- ${m.name} (${m.email}) | Role: ${m.role} | Status: "${m.status}" | ID: ${m.uid}`);
    });
  } else {
    console.log("No manager found in DB.");
  }
}

run().catch(console.error);
