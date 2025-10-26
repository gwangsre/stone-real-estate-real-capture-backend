import { db } from "../config/firebase.js";
import crypto from "crypto";

const uuid = () => crypto.randomUUID();

export async function createMessage(payload) {
  const now = new Date();
  const doc = {
    text_id: uuid(),
    message: payload.message,
    metadata: {
      created_at: now,
      updated_at: now,
      version: 1,
      tags: payload?.metadata?.tags || [],
      custom_fields: payload?.metadata?.custom_fields || {},
    },
  };
  const ref = db().collection('messages').doc(doc.text_id);
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function listMessages({ limit = 20, offset = 0 }) {
  let ref = db().collection('messages').orderBy('metadata.created_at', 'desc').offset(offset).limit(limit);
  const snap = await ref.get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return items;
}

export async function getMessageById(id) {
  const doc = await db().collection('messages').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function updateMessage(id, patch) {
  const ref = db().collection('messages').doc(id);
  const now = new Date();
  const payload = { ...patch, 'metadata.updated_at': now };
  await ref.set(payload, { merge: true });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

export async function deleteMessage(id) {
  const ref = db().collection('messages').doc(id);
  await ref.delete();
  return { id, deleted: true };
}
