import { db } from "../config/firebase.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const uuid = () => crypto.randomUUID();

function sanitize(admin) {
  if (!admin) return admin;
  const { password, password_hash, ...safe } = admin;
  return safe;
}

export async function createAdmin(payload) {
  const now = new Date();
  let password_hash = undefined;
  if (payload.password) {
    password_hash = await bcrypt.hash(payload.password, 10);
  }
  // normalize username lowercase
  const username = (payload.username || '').toLowerCase();
  // uniqueness checks
  if (username) {
    const existingUserSnap = await db().collection('admins').where('username', '==', username).limit(1).get();
    if (!existingUserSnap.empty) {
      throw Object.assign(new Error('USERNAME_EXISTS'), { status: 409 });
    }
  }
  if (payload.email) {
    const existingEmailSnap = await db().collection('admins').where('email', '==', payload.email).limit(1).get();
    if (!existingEmailSnap.empty) {
      throw Object.assign(new Error('EMAIL_EXISTS'), { status: 409 });
    }
  }
  const doc = {
    admin_id: uuid(),
    username,
    // Do not store plain password; keep hashed version only
    password_hash,
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    metadata: {
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
      tags: payload?.metadata?.tags || [],
      custom_fields: payload?.metadata?.custom_fields || {},
    },
  };
  const ref = db().collection('admins').doc(doc.admin_id);
  await ref.set(doc);
  const { password, password_hash: _ph, ...safe } = doc;
  return { id: ref.id, ...safe };
}

export async function listAdmins({ limit = 20, offset = 0 }) {
  try {
    let ref = db().collection('admins')
      .where('metadata.deleted_at', '==', null)
      .orderBy('metadata.created_at', 'desc')
      .offset(offset)
      .limit(limit);
    const snap = await ref.get();
    const items = snap.docs.map(d => ({ id: d.id, ...sanitize(d.data()) }));
    return items;
  } catch (err) {
    // Fallback when Firestore composite index is missing
    // Strategy: fetch (limit+offset) docs by created_at desc, filter deleted_at === null in memory, then slice.
    console.warn('[admins.list] missing index, using fallback without where filter:', err?.message || err);
    const take = Math.max(0, Number(limit)) + Math.max(0, Number(offset));
    let ref = db().collection('admins')
      .orderBy('metadata.created_at', 'desc')
      .limit(take || limit);
    const snap = await ref.get();
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const filtered = all.filter(x => !x?.metadata?.deleted_at);
    return filtered.slice(offset, offset + limit).map(sanitize);
  }
}

export async function getAdminById(id) {
  const doc = await db().collection('admins').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const { password, password_hash, ...safe } = data;
  return { id: doc.id, ...safe };
}

export async function updateAdmin(id, patch) {
  const ref = db().collection('admins').doc(id);
  const now = new Date();
  const payload = { ...patch, 'metadata.updated_at': now };
  if (patch.username) {
    const uname = patch.username.toLowerCase();
    const existingUserSnap = await db().collection('admins').where('username', '==', uname).limit(1).get();
    if (!existingUserSnap.empty && existingUserSnap.docs[0].id !== id) {
      throw Object.assign(new Error('USERNAME_EXISTS'), { status: 409 });
    }
    payload.username = uname;
  }
  if (patch.email) {
    const existingEmailSnap = await db().collection('admins').where('email', '==', patch.email).limit(1).get();
    if (!existingEmailSnap.empty && existingEmailSnap.docs[0].id !== id) {
      throw Object.assign(new Error('EMAIL_EXISTS'), { status: 409 });
    }
  }
  if (patch.password) {
    payload.password_hash = await bcrypt.hash(patch.password, 10);
    delete payload.password;
  }
  await ref.set(payload, { merge: true });
  const updated = await ref.get();
  const data = updated.data();
  const { password, password_hash, ...safe } = data;
  return { id: updated.id, ...safe };
}

export async function softDeleteAdmin(id) {
  const ref = db().collection('admins').doc(id);
  const now = new Date();
  await ref.set({ metadata: { deleted_at: now, updated_at: now } }, { merge: true });
  const snap = await ref.get();
  const data = snap.data();
  const { password, password_hash, ...safe } = data;
  return { id: snap.id, ...safe };
}
