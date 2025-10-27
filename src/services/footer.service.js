import { db } from "../config/firebase.js";

// Footer Service - Simplified for single document with fixed ID 'main'
const FOOTER_ID = 'main';

export async function getFooter() {
  const doc = await db().collection('footer').doc(FOOTER_ID).get();
  if (!doc.exists) {
    // Return default if not exists
    return {
      id: FOOTER_ID,
      footer_id: FOOTER_ID,
      message: "© 2025 Stone Real Estate. Tất cả quyền được bảo lưu.",
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  return { id: doc.id, ...doc.data() };
}

export async function updateFooter(messageData) {
  console.log("🔍 Footer Service - Input data:", messageData);
  
  const ref = db().collection('footer').doc(FOOTER_ID);
  const now = new Date();
  
  const payload = {
    footer_id: FOOTER_ID,
    message: messageData.message,
    updated_at: now
  };
  
  console.log("🔍 Footer Service - Payload to save:", payload);
  
  // Check if document exists
  const existing = await ref.get();
  if (!existing.exists) {
    // Create if not exists
    payload.created_at = now;
    console.log("📝 Footer Service - Creating new document");
  } else {
    console.log("🔄 Footer Service - Updating existing document");
  }
  
  await ref.set(payload, { merge: true });
  console.log("💾 Footer Service - Document saved successfully");
  
  const updated = await ref.get();
  const result = { id: updated.id, ...updated.data() };
  console.log("✅ Footer Service - Final result:", result);
  
  return result;
}