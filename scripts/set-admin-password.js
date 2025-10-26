import 'dotenv/config';
import { initFirebase, db } from '../src/config/firebase.js';
import bcrypt from 'bcryptjs';

async function run() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];
  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret node scripts/set-admin-password.js');
    process.exit(1);
  }

  initFirebase();
  const snap = await db().collection('admins').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    console.error('No admin found with email:', email);
    process.exit(2);
  }
  const doc = snap.docs[0];
  const hash = await bcrypt.hash(password, 10);
  await doc.ref.set({ password_hash: hash, 'metadata.updated_at': new Date() }, { merge: true });
  console.log(`[ok] updated password for admin ${email} (id=${doc.id})`);
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
