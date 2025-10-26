import bcrypt from 'bcryptjs';
import { db } from '../config/firebase.js';

const ADMINS_COLLECTION = 'admins';

export async function findAdminByUsername(username) {
  const snap = await db().collection(ADMINS_COLLECTION).where('username', '==', username).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function verifyAdminCredentials(username, password) {
  const admin = await findAdminByUsername(username.toLowerCase());
  if (!admin || admin?.metadata?.deleted_at) return null;
  const { password_hash } = admin;
  if (!password_hash) return null;
  const ok = await bcrypt.compare(password, password_hash);
  if (!ok) return null;
  const safe = {
    id: admin.id,
    username: admin.username,
    email: admin.email || '',
    name: admin.name || '',
    role: admin.role || 'admin',
  };
  return safe;
}

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function findAdminById(adminId) {
  const doc = await db().collection(ADMINS_COLLECTION).doc(adminId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function updateAdminPassword(adminId, newPasswordHash) {
  const now = new Date().toISOString();
  await db().collection(ADMINS_COLLECTION).doc(adminId).update({
    password_hash: newPasswordHash,
    'metadata.updated_at': now,
  });
  return true;
}
