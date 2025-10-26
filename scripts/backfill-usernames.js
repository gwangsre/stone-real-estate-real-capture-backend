import 'dotenv/config';
import { initFirebase } from '../src/config/firebase.js';
import { db } from '../src/config/firebase.js';

/*
  Backfill usernames for existing admins that lack a username field.
  Strategy:
    - Derive from email local part (before @)
    - Normalize: lowercase, keep only a-z0-9._-
    - If collision, append '-' + 4 random hex chars until unique
*/
function normalize(base) {
  return base.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function randSuffix() {
  return Math.random().toString(16).slice(2, 6);
}

async function run() {
  initFirebase();
  const col = db().collection('admins');
  const snap = await col.get();
  const taken = new Set();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.username) taken.add(d.username);
  });
  let updates = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.username) continue;
    if (!d.email) {
      console.warn(`[skip] admin ${doc.id} has no email & no username`);
      continue;
    }
    let base = normalize(d.email.split('@')[0]);
    if (!base) base = 'user';
    let candidate = base;
    while (taken.has(candidate)) {
      candidate = `${base}-${randSuffix()}`;
    }
    taken.add(candidate);
    await doc.ref.set({ username: candidate, 'metadata.updated_at': new Date() }, { merge: true });
    console.log(`[update] ${doc.id} -> username='${candidate}'`);
    updates++;
  }
  console.log(`Done. Updated ${updates} admin(s).`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
