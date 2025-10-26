import 'dotenv/config';
import { initFirebase, db } from '../src/config/firebase.js';

async function run() {
  initFirebase();
  const snap = await db().collection('admins').get();
  let fixed = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (Object.prototype.hasOwnProperty.call(data, 'password')) {
      const { password, ...rest } = data;
      // Overwrite document without the 'password' field
      await d.ref.set(rest, { merge: false });
      fixed++;
    }
  }
  console.log(`[cleanup] removed plain password from ${fixed} admin docs`);
}

run().then(()=>process.exit(0)).catch(err=>{ console.error(err); process.exit(1); });
