import { db } from "../config/firebase.js";
import crypto from "crypto";
import { computeScore } from "./scoring.service.js";
import { sendMail } from "../utils/mailer.js";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// ===== HELPER: UPDATE EXISTING LEAD WITH NEW DATA =====
async function updateExistingLead({ existingLeadId, form, sellingInterestBool, buyingInterestBool, score, scoring, reqMeta }) {
  const now = new Date();
  console.log(`🔄 Updating existing lead ${existingLeadId} with new submission data`);
  
  const leadRef = db().collection("leads").doc(existingLeadId);
  const existingDoc = await leadRef.get();
  
  if (!existingDoc.exists) {
    console.warn(`⚠️ Lead ${existingLeadId} not found for update`);
    return null;
  }
  
  const existingData = existingDoc.data();
  
  // Prepare updated contact info with latest submission data
  const updatedContact = {
    ...existingData.contact,
    first_name: (form.first_name || "").trim() || existingData.contact.first_name,
    last_name: (form.last_name || "").trim() || existingData.contact.last_name,
    email: (form.email || "").toLowerCase() || existingData.contact.email,
    phone: (form.phone || "").trim() || existingData.contact.phone,
    preferred_contact: form.preferred_contact || existingData.contact.preferred_contact,
    suburb: form.suburb || existingData.contact.suburb,
    address: (form.address || "").trim() || existingData.contact.address,
    timeframe: form.timeframe || existingData.contact.timeframe,
    description: (form.description || "").trim() || existingData.contact.description,
    selling_interest: sellingInterestBool,
    buying_interest: buyingInterestBool,
    score: Number.isFinite(score) ? score : (existingData.contact.score || 0),
    category: scoring.category || existingData.contact.category,
  };
  
  // Add interaction to timeline
  const interactionData = {
    changes_detected: detectChanges(existingData.contact, updatedContact),
    new_score: score,
  };
  
  // Only add non-undefined values to avoid Firestore errors
  if (reqMeta?.user_agent !== undefined) {
    interactionData.user_agent = reqMeta.user_agent;
  }
  if (reqMeta?.ip !== undefined) {
    interactionData.ip = reqMeta.ip;
  }
  
  const newInteraction = {
    type: "form_resubmission",
    message: `Lead resubmitted form with updated information`,
    timestamp: now,
    data: interactionData
  };
  
  const updatedTimeline = [...(existingData.timeline || []), newInteraction];
  
  // Clean undefined values before saving to Firestore
  const updatePayload = cleanUndefinedValues({
    ...existingData,
    contact: updatedContact,
    timeline: updatedTimeline,
    metadata: {
      ...existingData.metadata,
      updated_at: now,
      last_submission: now
    }
  });
  
  // Update the lead document
  await leadRef.set(updatePayload, { merge: true });
  
  console.log(`✅ Successfully updated lead ${existingLeadId}`);
  return { id: existingLeadId, ...existingData, contact: updatedContact, timeline: updatedTimeline };
}

// Helper function to clean undefined values from object (Firestore doesn't allow undefined)
function cleanUndefinedValues(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanUndefinedValues(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// Helper function to detect what changed
function detectChanges(oldContact, newContact) {
  const changes = [];
  const fieldsToCheck = ['first_name', 'last_name', 'phone', 'suburb', 'address', 'timeframe', 'description', 'selling_interest', 'buying_interest', 'score'];
  
  fieldsToCheck.forEach(field => {
    if (oldContact[field] !== newContact[field]) {
      changes.push({
        field,
        old_value: oldContact[field],
        new_value: newContact[field]
      });
    }
  });
  
  return changes;
}

// ===== HELPER: SEND DUPLICATE NOTIFICATION =====
async function sendDuplicateNotification({ form, existingLeadId, sellingInterestBool, buyingInterestBool, score, updatedLead }) {
  const brand = process.env.BRAND_NAME || 'Stone Real Estate';
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_OWNER_EMAIL || 'gwang.sre@gmail.com';
  const adminFrom = process.env.SENDER_EMAIL || adminEmail;

  const changes = updatedLead?.timeline?.slice(-1)[0]?.data?.changes_detected || [];
  const hasChanges = changes.length > 0;
  
  const adminSubject = `🔄 Lead updated via resubmission: ${form.first_name} ${form.last_name} (ID: ${existingLeadId})`;
  const adminText = `A lead resubmitted the form with ${hasChanges ? 'updated' : 'same'} information.\n\n` +
    `✅ The existing lead has been UPDATED with the latest submission data.\n` +
    `Lead ID: ${existingLeadId}\n\n` +
    `${hasChanges ? 'Changes detected:\n' + changes.map(c => `- ${c.field}: "${c.old_value}" → "${c.new_value}"`).join('\n') + '\n\n' : ''}` +
    `Current Information:\n` +
    `Name: ${form.first_name} ${form.last_name}\n` +
    `Email: ${form.email}\n` +
    `Phone: ${form.phone}\n` +
    `Suburb: ${form.suburb}\n` +
    `Address: ${form.address || 'Not provided'}\n` +
    `Timeframe: ${form.timeframe}\n` +
    `Description: ${form.description || 'Not provided'}\n` +
    `Selling interest: ${sellingInterestBool}\n` +
    `Buying interest: ${buyingInterestBool}\n` +
    `Score: ${score}\n` +
    `Brand: ${brand}\n\n` +
    `The lead data has been updated with this latest submission.`;

  const adminHtml = `
    <div style="border-left: 4px solid #10b981; padding-left: 16px; margin: 16px 0;">
      <h3 style="color: #10b981; margin: 0;">🔄 Lead Updated via Resubmission</h3>
      <p style="margin: 8px 0; color: #6b7280;">A lead resubmitted the form. The existing lead has been updated with the latest data.</p>
      ${hasChanges ? `<p style="margin: 8px 0; color: #059669;"><strong>${changes.length} field(s) changed</strong></p>` : ''}
    </div>
    
    <p><strong>Original Lead ID:</strong> <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${existingLeadId}</span></p>
    
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h4 style="margin: 0 0 12px 0; color: #374151;">Submitted Information:</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Name:</strong> ${form.first_name} ${form.last_name}</li>
        <li><strong>Email:</strong> ${form.email}</li>
        <li><strong>Phone:</strong> ${form.phone}</li>
        <li><strong>Suburb:</strong> ${form.suburb}</li>
        <li><strong>Address:</strong> ${form.address || 'Not provided'}</li>
        <li><strong>Timeframe:</strong> ${form.timeframe}</li>
        <li><strong>Description:</strong> ${form.description || 'Not provided'}</li>
        <li><strong>Selling interest:</strong> ${sellingInterestBool}</li>
        <li><strong>Buying interest:</strong> ${buyingInterestBool}</li>
        <li><strong>Score:</strong> ${score}</li>
        <li><strong>Brand:</strong> ${brand}</li>
      </ul>
    </div>
    
    ${hasChanges ? `
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <h4 style="color: #047857; margin: 0 0 8px 0;">📝 Changes Detected:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
        ${changes.map(c => `<li><strong>${c.field}:</strong> "${c.old_value}" → "<strong>${c.new_value}</strong>"</li>`).join('')}
      </ul>
    </div>` : ''}
    
    <p style="color: #6b7280; font-size: 14px;">
      ✅ <strong>Status:</strong> The existing lead has been updated with this latest submission data. 
      Lead ID: <strong>${existingLeadId}</strong>
    </p>
  `;

  console.log('[mailer] sending duplicate lead notification', { to: adminEmail, originalLeadId: existingLeadId });
  
  try {
    await sendMail({
      to: adminEmail,
      from: adminFrom,
      replyTo: form.email || adminEmail,
      subject: adminSubject,
      text: adminText,
      html: adminHtml,
    });
  } catch (err) {
    console.warn('Error sending duplicate notification email:', err?.message || err);
  }
}

// ===== PUBLIC FORM CREATE =====
export async function createLeadFromPublicForm(form, reqMeta) {
  const now = new Date();

  // Normalize selling interest (frontend sends 'interested' as "yes"/"no")
  const sellingRaw = form.interested || "no";
  const sellingInterestBool = String(sellingRaw).toLowerCase() === "yes";

  // Normalize buying interest (accept either 'interested_buying' or 'buying')
  const buyingRaw = form.interested_buying || form.buying || "no";
  const buyingInterestBool = String(buyingRaw).toLowerCase() === "yes";

  // 1) scoring - allow computeScore to take buying/selling boolean if desired
  // Update computeScore signature if you plan to use `buying`/`selling` booleans there.
  const scoring = computeScore({
    interested: sellingInterestBool ? 'yes' : 'no',
    buying: buyingInterestBool ? 'yes' : 'no',
    timeframe: form.timeframe,
  });
  const score = scoring.total_score || 0;

  // 2) dedupe
  const last4 = (form.phone.match(/\d/g) || []).slice(-4).join("");
  const dedupeKey = sha256(`${form.email.toLowerCase()}|${last4}|${now.toISOString().slice(0, 10)}`);
  const dedupeRef = db().collection("leads_dedupe").doc(dedupeKey);
  const existed = await dedupeRef.get();
  let isDuplicate = false;
  let existingLeadId = null;
  
  if (existed.exists) {
    const { lead_id } = existed.data() || {};
    isDuplicate = true;
    existingLeadId = lead_id;
    
    console.log(`🔄 Duplicate detected for lead ${lead_id}. Updating with new data...`);
    
    // Update existing lead with new submission data
    const updatedLead = await updateExistingLead({
      existingLeadId: lead_id,
      form,
      sellingInterestBool,
      buyingInterestBool,
      score,
      scoring,
      reqMeta
    });
    
    // Send notification about the update
    await sendDuplicateNotification({
      form,
      existingLeadId: lead_id,
      sellingInterestBool,
      buyingInterestBool,
      score,
      updatedLead
    });
    
    return { reused: true, lead_id, updated: true, changes: updatedLead?.timeline?.slice(-1)[0]?.data?.changes_detected || [] };
  }

  // 3) build canonical lead doc that matches requested schema
  const leadDoc = {
    // lead_id will be set to doc id after write
    lead_id: null,
    contact: {
      first_name: (form.first_name || "").trim(),
      last_name: (form.last_name || "").trim(),
      email: (form.email || "").toLowerCase(),
      phone: (form.phone || "").trim(),
      preferred_contact: form.preferred_contact || "both",
      suburb: form.suburb,
      address: (form.address || "").trim(),
      timeframe: form.timeframe || "not sure",
      description: (form.description || "").trim(),
      // NEW: store selling and buying interest as booleans for easy querying
      selling_interest: sellingInterestBool,
      buying_interest: buyingInterestBool,
      score: Number.isFinite(score) ? score : 0,
      category: scoring.category,
    },
    status: {
      current: "new",
      history: [
        {
          status: "new",
          changed_at: now,
          changed_by: reqMeta?.userId || "system",
          notes: "Lead from homepage form",
        },
      ],
    },
    metadata: {
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
      tags: [form.suburb].filter(Boolean),
      custom_fields: {
        selling_interest: sellingInterestBool,
        buying_interest: buyingInterestBool,
        scoring_version: scoring.score_version,
        scoring_factors: scoring.factors,
      },
    },
  };

  // Clean undefined values before saving to Firestore
  const cleanLeadDoc = cleanUndefinedValues(leadDoc);
  
  // write using a generated doc (so id is known)
  const ref = db().collection("leads").doc();
  await ref.set(cleanLeadDoc);
  // set lead_id to the doc id and update the doc
  await ref.update({ lead_id: ref.id });
  await dedupeRef.set({ lead_id: ref.id, created_at: now });

  // Send confirmation to submitter and notification to agent
  // On serverless (Vercel), we MUST await to avoid the platform freezing background tasks after response.
  const notify = async () => {
    const brand = process.env.BRAND_NAME || 'Stone Real Estate';
    // Get admin email from environment variable or use fallback
    const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_OWNER_EMAIL || 'gwang.sre@gmail.com';
    const adminFrom = process.env.SENDER_EMAIL || adminEmail;

    const adminSubject = `✨ New lead received: ${leadDoc.contact.first_name} ${leadDoc.contact.last_name} (${ref.id})`;
    const adminText = `A new lead was submitted.\n\n` +
      `Lead ID: ${ref.id}\n` +
      `Name: ${leadDoc.contact.first_name} ${leadDoc.contact.last_name}\n` +
      `Email: ${leadDoc.contact.email}\n` +
      `Phone: ${leadDoc.contact.phone}\n` +
      `Suburb: ${leadDoc.contact.suburb}\n` +
      `Address: ${leadDoc.contact.address || 'Not provided'}\n` +
      `Timeframe: ${leadDoc.contact.timeframe}\n` +
      `Description: ${leadDoc.contact.description || 'Not provided'}\n` +
      `Selling interest: ${leadDoc.contact.selling_interest}\n` +
      `Buying interest: ${leadDoc.contact.buying_interest}\n` +
      `Score: ${leadDoc.contact.score}\n` +
      `Brand: ${brand}\n\n` +
      `View in Firestore with ID: ${ref.id}`;

    const adminHtml = `
      <div style="border-left: 4px solid #10b981; padding-left: 16px; margin: 16px 0;">
        <h3 style="color: #10b981; margin: 0;">✨ New Lead Received</h3>
        <p style="margin: 8px 0; color: #6b7280;">A fresh lead has been submitted through your website.</p>
      </div>
      
      <p><strong>Lead ID:</strong> <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${ref.id}</span></p>
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h4 style="margin: 0 0 12px 0; color: #374151;">Lead Details:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Name:</strong> ${leadDoc.contact.first_name} ${leadDoc.contact.last_name}</li>
          <li><strong>Email:</strong> ${leadDoc.contact.email}</li>
          <li><strong>Phone:</strong> ${leadDoc.contact.phone}</li>
          <li><strong>Suburb:</strong> ${leadDoc.contact.suburb}</li>
          <li><strong>Address:</strong> ${leadDoc.contact.address || 'Not provided'}</li>
          <li><strong>Timeframe:</strong> ${leadDoc.contact.timeframe}</li>
          <li><strong>Description:</strong> ${leadDoc.contact.description || 'Not provided'}</li>
          <li><strong>Selling interest:</strong> ${leadDoc.contact.selling_interest}</li>
          <li><strong>Buying interest:</strong> ${leadDoc.contact.buying_interest}</li>
          <li><strong>Score:</strong> ${leadDoc.contact.score}</li>
          <li><strong>Brand:</strong> ${leadDoc.contact.brand || brand}</li>
        </ul>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        📊 View in Firestore with ID: <strong>${ref.id}</strong>
      </p>
    `;

    console.log('[mailer] about to send admin notification (only)', { to: adminEmail });
    await sendMail({
      to: adminEmail,
      from: adminFrom,
      replyTo: leadDoc.contact.email || adminEmail,
      subject: adminSubject,
      text: adminText,
      html: adminHtml,
    });
  };

  const awaitEmails = (String(process.env.MAILER_AWAIT || '').toLowerCase() === 'true')
    || (String(process.env.VERCEL || '').toLowerCase() === '1');

  if (awaitEmails) {
    try {
      await notify();
    } catch (err) {
      console.warn('Error sending notification emails (awaited):', err?.message || err);
    }
  } else {
    // Local/dev: fire-and-forget
    (async () => {
      try { await notify(); } catch (err) {
        console.warn('Error sending notification emails:', err?.message || err);
      }
    })();
  }

  return { reused: false, lead_id: ref.id, score };
}

// ===== LIST =====
export async function listLeads({ status, suburb, address, limit = 20, offset = 0, q }) {
  let ref = db().collection("leads");
  if (status) ref = ref.where("status.current", "==", status);
  if (suburb) ref = ref.where("contact.suburb", "==", suburb);
  if (address) ref = ref.where("contact.address", ">=", address).where("contact.address", "<=", address + '\uf8ff');
  
  ref = ref.orderBy("metadata.created_at", "desc").offset(offset).limit(limit);
  const snap = await ref.get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  // Client-side filtering for text search (q parameter)
  if (q && q.trim()) {
    const searchTerm = q.toLowerCase().trim();
    items = items.filter(item => {
      const contact = item.contact || {};
      const searchableText = [
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.phone,
        contact.address,
        contact.description,
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }
  
  return items;
}

// ===== GET BY ID =====
export async function getLeadById(id) {
  const doc = await db().collection("leads").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// ===== UPDATE STATUS =====
export async function updateLeadStatus(id, { status, notes, changed_by }) {
  const ref = db().collection("leads").doc(id);
  const now = new Date();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const e = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    const data = snap.data();
    const history = Array.isArray(data.status?.history) ? data.status.history : [];
    history.push({ status, changed_at: now, changed_by, notes: notes || "" });
    tx.update(ref, {
      "status.current": status,
      "status.history": history,
      "metadata.updated_at": now,
    });
  });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

// ===== GENERIC UPDATE (contact/status/metadata) =====
export async function updateLead(id, patch) {
  console.log(`🔍 UpdateLead - ID: ${id}, Patch:`, patch);
  
  const ref = db().collection("leads").doc(id);
  const now = new Date();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const e = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    const data = snap.data();
    console.log(`🔍 UpdateLead - Current contact:`, data.contact);

    // Build updates
    const updates = {};
    let newContact = data.contact || {};
    let scoringRecalc = false;
    
    // Handle contact updates
    if (patch.contact) {
      newContact = { ...newContact, ...patch.contact };
      // Always recalculate score when contact is updated to ensure data consistency
      // This handles cases where frontend might send different field combinations
      console.log(`🔍 UpdateLead - Contact updated, will recalculate score`);
      console.log(`🔍 UpdateLead - Patch contact fields:`, Object.keys(patch.contact));
      scoringRecalc = true;
    }
    
    // Handle metadata updates
    const existingMeta = data.metadata || {};
    const newMetadata = {
      ...existingMeta,
      ...(patch.metadata || {}),
      updated_at: now,
    };
    
    // Recalculate score & category if needed
    if (scoringRecalc) {
      try {
        const scoring = computeScore({
          interested: newContact.selling_interest ? 'yes' : 'no',
          buying: newContact.buying_interest ? 'yes' : 'no',
          timeframe: newContact.timeframe,
        });
        console.log(`🔍 UpdateLead - New scoring result:`, { 
          total_score: scoring.total_score, 
          category: scoring.category 
        });
        newContact.score = scoring.total_score;
        newContact.category = scoring.category;
        console.log(`🔍 UpdateLead - Updated contact with score:`, { 
          score: newContact.score, 
          category: newContact.category 
        });
        
        // Inject scoring metadata into custom_fields
        const existingCF = existingMeta.custom_fields || {};
        newMetadata.custom_fields = {
          ...existingCF,
          ...(patch.metadata?.custom_fields || {}),
          scoring_version: scoring.score_version,
          scoring_factors: scoring.factors,
        };
      } catch (err) {
        console.warn('[leads.update] scoring recalculation failed:', err?.message || err);
      }
    }
    
    // Set final updates
    updates['metadata'] = newMetadata;
    if (patch.contact || scoringRecalc) {
      // Set the entire contact object to maintain proper nested structure
      updates['contact'] = newContact;
      console.log(`🔍 UpdateLead - Setting entire contact object:`, Object.keys(newContact));
    }
    if (patch.status) {
      console.log('[DEBUG] Updating status:', patch.status);
      console.log('[DEBUG] Current data.status:', data.status);
      const history = Array.isArray(data.status?.history) ? data.status.history : [];
      if (patch.status.current && patch.status.current !== data.status?.current) {
        history.push({
          status: patch.status.current,
          changed_at: now,
          changed_by: patch.status.changed_by || "system",
          notes: patch.status.notes || "",
        });
      }
      updates["status"] = {
        current: patch.status.current || data.status?.current || "new",
        history: history
      };
      console.log('[DEBUG] Status updates:', updates["status"]);
    }
    
    // Clean undefined values before saving (for Firestore compatibility)
    const cleanedUpdates = cleanUndefinedValues(updates);
    console.log(`🔍 UpdateLead - Final updates to save:`, updates);
    console.log(`🔍 UpdateLead - Cleaned updates:`, cleanedUpdates);
    tx.set(ref, cleanedUpdates, { merge: true });
  });
  
  const updated = await ref.get();
  const result = { id: updated.id, ...updated.data() };
  console.log(`✅ UpdateLead - Final result contact:`, result.contact);
  
  return result;
}

// ===== SOFT DELETE =====
export async function softDeleteLead(id) {
  const ref = db().collection("leads").doc(id);
  const now = new Date();
  await ref.set({ metadata: { deleted_at: now, updated_at: now } }, { merge: true });
  const snap = await ref.get();
  return { id: snap.id, ...snap.data() };
}