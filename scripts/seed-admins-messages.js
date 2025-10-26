import 'dotenv/config';
import { initFirebase, db } from '../src/config/firebase.js';
import crypto from 'crypto';

function uuid() {
  return crypto.randomUUID();
}

async function seed() {
  initFirebase();
  const firestore = db();
  const now = new Date();

  // Seed admins collection
  const admin_id = uuid();
  const adminDoc = {
    admin_id,
    username: 'admin',
    password: 'secret123', // NOTE: sample only. In production, store a hash instead of plaintext.
    first_name: 'Stone',
    last_name: 'Admin',
    email: 'pcpps2507@gmail.com',
    metadata: {
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
      tags: ['seed', 'admin'],
      custom_fields: {},
    },
  };

  await firestore.collection('admins').doc(admin_id).set(adminDoc);
  console.log('[seed] admins inserted:', admin_id);

  // Seed messages collection
  const text_id = uuid();
  const messageDoc = {
    text_id,
    message: 'Welcome to Stone Real Estate backend!',
    metadata: {
      created_at: now,
      updated_at: now,
      version: 1,
      tags: ['seed', 'message'],
      custom_fields: {},
    },
  };

  await firestore.collection('messages').doc(text_id).set(messageDoc);
  console.log('[seed] messages inserted:', text_id);
}

seed()
  .then(() => {
    console.log('[seed] completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] failed:', err?.message || err);
    process.exit(1);
  });
