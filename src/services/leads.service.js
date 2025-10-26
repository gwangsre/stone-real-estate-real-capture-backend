import { db } from "../config/firebase.js";
import crypto from "crypto";
import { computeScore } from "./scoring.service.js";
import { sendMail } from "../utils/mailer.js";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// ===== HELPER: SEND DUPLICATE NOTIFICATION =====
async function sendDuplicateNotification({ form, existingLeadId, sellingInterestBool, buyingInterestBool, score }) {
  const brand = process.env.BRAND_NAME || 'Stone Real Estate';
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_OWNER_EMAIL || 'gwang.sre@gmail.com';
  const adminFrom = process.env.SENDER_EMAIL || adminEmail;

  const adminSubject = `🔄 Duplicate lead submission: ${form.first_name} ${form.last_name} (Original: ${existingLeadId})`;
  const adminText = `A duplicate lead submission was detected.\n\n` +
    `⚠️ This is a DUPLICATE submission from the same person today.\n` +
    `Original Lead ID: ${existingLeadId}\n\n` +
    `Submitted Information:\n` +
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
    `The original lead can be found with ID: ${existingLeadId}\n` +
    `No new lead was created to avoid duplicates.`;

  const adminHtml = `
    <div style="border-left: 4px solid #f59e0b; padding-left: 16px; margin: 16px 0;">
      <h3 style="color: #f59e0b; margin: 0;">🔄 Duplicate Lead Submission</h3>
      <p style="margin: 8px 0; color: #6b7280;">This is a duplicate submission from the same person today.</p>
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
    
    <p style="color: #6b7280; font-size: 14px;">
      💡 <strong>Note:</strong> No new lead was created to avoid duplicates. 
      You can find the original lead with ID: <strong>${existingLeadId}</strong>
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
    
    // For duplicate submissions, send notification but don't create new lead
    await sendDuplicateNotification({
      form,
      existingLeadId: lead_id,
      sellingInterestBool,
      buyingInterestBool,
      score
    });
    
    return { reused: true, lead_id };
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

  // write using a generated doc (so id is known)
  const ref = db().collection("leads").doc();
  await ref.set(leadDoc);
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

    // Build updates
    const updates = { "metadata.updated_at": now };
    let newContact = data.contact || {};
    let scoringRecalc = false;
    if (patch.contact) {
      newContact = { ...newContact, ...patch.contact };
      // Detect if scoring inputs changed
      if (['timeframe','selling_interest','buying_interest'].some(k => Object.prototype.hasOwnProperty.call(patch.contact, k))) {
        scoringRecalc = true;
      }
    }
    // Recalculate score & category if needed
    if (scoringRecalc) {
      try {
        const scoring = computeScore({
          interested: newContact.selling_interest ? 'yes' : 'no',
          buying: newContact.buying_interest ? 'yes' : 'no',
          timeframe: newContact.timeframe,
        });
        newContact.score = scoring.total_score;
        newContact.category = scoring.category;
        // Inject scoring metadata into metadata.custom_fields
        const existingMeta = data.metadata || {};
        const existingCF = existingMeta.custom_fields || {};
        updates['metadata'] = {
          ...existingMeta,
          ...(patch.metadata || {}),
          updated_at: now,
          custom_fields: {
            ...existingCF,
            ...(patch.metadata?.custom_fields || {}),
            scoring_version: scoring.score_version,
            scoring_factors: scoring.factors,
          },
        };
      } catch (err) {
        console.warn('[leads.update] scoring recalculation failed:', err?.message || err);
      }
    }
    if (patch.metadata && !scoringRecalc) {
      updates['metadata'] = { ...(data.metadata || {}), ...patch.metadata, updated_at: now };
    }
    if (patch.contact || scoringRecalc) {
      updates['contact'] = newContact;
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
    tx.set(ref, updates, { merge: true });
  });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

// ===== SOFT DELETE =====
export async function softDeleteLead(id) {
  const ref = db().collection("leads").doc(id);
  const now = new Date();
  await ref.set({ metadata: { deleted_at: now, updated_at: now } }, { merge: true });
  const snap = await ref.get();
  return { id: snap.id, ...snap.data() };
}