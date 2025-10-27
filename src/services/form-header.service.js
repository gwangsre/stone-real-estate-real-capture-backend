import { db } from "../config/firebase.js";

// Form Header Service - Simplified for single document with fixed ID 'main'
const FORM_HEADER_ID = 'main';

export async function getFormHeader() {
  console.log("🔍 Form Header GET - Fetching document with ID:", FORM_HEADER_ID);
  
  const doc = await db().collection('form_header').doc(FORM_HEADER_ID).get();
  console.log("📄 Form Header GET - Document exists:", doc.exists);
  
  if (!doc.exists) {
    console.log("⚠️ Form Header GET - Document not found, returning default");
    // Return default if not exists
    return {
      id: FORM_HEADER_ID,
      header_id: FORM_HEADER_ID,
      message: "Chào mừng bạn đến với Stone Real Estate",
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  
  const data = doc.data();
  console.log("✅ Form Header GET - Document data:", data);
  
  const result = { id: doc.id, ...data };
  console.log("📤 Form Header GET - Returning result:", result);
  
  return result;
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