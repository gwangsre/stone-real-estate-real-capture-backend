import { db } from "../config/firebase.js";

// Form Header Service - Simplified for single document with fixed ID 'main'
const FORM_HEADER_ID = 'main';

export async function getFormHeader() {
  const doc = await db().collection('form_header').doc(FORM_HEADER_ID).get();
  if (!doc.exists) {
    // Return default if not exists
    return {
      id: FORM_HEADER_ID,
      header_id: FORM_HEADER_ID,
      message: "Chào mừng bạn đến với Stone Real Estate",
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  return { id: doc.id, ...doc.data() };
}

export async function updateFormHeader(messageData) {
  const ref = db().collection('form_header').doc(FORM_HEADER_ID);
  const now = new Date();
  
  const payload = {
    header_id: FORM_HEADER_ID,
    message: messageData.message,
    updated_at: now
  };
  
  // Check if document exists
  const existing = await ref.get();
  if (!existing.exists) {
    // Create if not exists
    payload.created_at = now;
  }
  
  await ref.set(payload, { merge: true });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}