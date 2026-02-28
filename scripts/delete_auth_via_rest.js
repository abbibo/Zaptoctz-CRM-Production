/**
 * delete_auth_via_rest.js
 *
 * Uses the Google Identity Toolkit REST API to delete Firebase Auth users.
 * Authenticates using the Firebase CLI access token (firebase login required).
 *
 * Run from the project root:
 *   node scripts/delete_auth_via_rest.js
 */

const { execSync } = require('child_process');
const https = require('https');

const PROJECT_ID = 'zaptockz-crm-app';

// UIDs to delete (manager and member accounts, keeping both admin gmail accounts)
const UIDS_TO_DELETE = [
  // test-role-sync-client@zaptockz.com  (member)
  '2rAdpsRjSYOKODEJet2g6pkfrjT2',
  // faiziibinazzii@gmail.com             (member)
  'MiWV5j914rROpG8SaC21Rj9usVJ3',
  // member2@zaptockz.com                 (member)
  'NxadPWvIWCP3DGPgKo5oXydg1s32',
  // member1@zaptockz.com                 (member)
  'bkpqkIYmZmYDOCeI0MojGiHjPkf2',
  // manager3@zaptockz.com                (manager)
  'hGq0Riy57FQpzMsl9u4SgEDdFPq1',
  // member3@zaptockz.com                 (member)
  'kKVtfbhtJfaovSokIFMhRDD6DGn1',
  // manager2@zaptockz.com                (manager)
  'nczNmmRvuCSlAQIACVPoATkbjHF2',
  // manager1@zaptockz.com                (manager)
  'scU1mEk9X3QGLa1AjOikC2Ei7Jc2',
];

// Get access token from Firebase CLI
function getAccessToken() {
  try {
    const token = execSync('firebase login:print-access-token 2>NUL', { encoding: 'utf8' }).trim();
    if (!token || token.startsWith('Error')) throw new Error('No token');
    return token;
  } catch {
    try {
      // fallback: try gcloud
      return execSync('gcloud auth print-access-token 2>NUL', { encoding: 'utf8' }).trim();
    } catch {
      throw new Error('Could not get access token. Run: firebase login');
    }
  }
}

function deleteUser(uid, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ localId: uid });
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/accounts:delete`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(postData),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ uid, success: true });
        } else {
          resolve({ uid, success: false, error: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== Getting Firebase CLI access token ===');
  const token = getAccessToken();
  console.log('  ✓ Access token obtained\n');

  console.log('=== Deleting Firebase Auth users ===\n');

  for (const uid of UIDS_TO_DELETE) {
    const result = await deleteUser(uid, token);
    if (result.success) {
      console.log(`  ✓ Deleted: ${uid}`);
    } else {
      console.error(`  ✗ Failed:  ${uid} → ${result.error}`);
    }
  }

  console.log('\n=== Done! ===');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
