// scripts/seed-sample.js
import "dotenv/config";
import { initFirebase, db } from "../src/config/firebase.js";
import { randomUUID } from "crypto";

function ts() {
  return new Date();
}

async function run() {
  initFirebase();

  // ====== agents ======
  const agentId = randomUUID();
  const agentsRef = db().collection("agents").doc(agentId);
  await agentsRef.set({
    agent_id: agentId,
    personal: {
      first_name: "Alex",
      last_name: "Nguyen",
      email: "alex.nguyen@example.com",
      phone: "0412345678",
      license_number: "LIC-NSW-123456",
      profile_photo: "https://example.com/photo.jpg"
    },
    assignment: {
      suburbs: ["Asquith", "Hornsby", "Waitara"],
      max_leads: 20,
      current_leads: 0,
      lead_types: ["HOT", "WARM", "COLD"],
      availability: "available"
    },
    notification_preferences: {
      email_enabled: true,
      sms_enabled: true,
      hot_lead_alert: true,
      daily_summary: true,
      notification_hours: {
        start: "08:00",
        end: "20:00",
        timezone: "Australia/Sydney"
      }
    },
    performance: {
      total_leads: 0,
      conversion_rate: 0,
      average_response_time: 15,
      ratings: 4.8,
      reports_completed: 0,
      average_report_time: 6
    },
    status: {
      active: true,
      last_login: ts(),
      created_at: ts(),
      updated_at: ts()
    }
  });

  // ====== properties ======
  const propertyId = randomUUID();
  const propertiesRef = db().collection("properties").doc(propertyId);
  await propertiesRef.set({
    property_id: propertyId,
    address: {
      street_number: "123",
      street_name: "Pacific",
      street_type: "Highway",
      suburb: "Asquith",
      postcode: "2077",
      state: "NSW",
      country: "Australia"
    },
    details: {
      type: "house",
      bedrooms: 3,
      bathrooms: 2,
      car_spaces: 1,
      land_size: 600,
      building_size: 180,
      year_built: 1995,
      condition: "good"
    },
    features: {
      pool: false,
      garage: true,
      garden: true,
      renovated: false,
      other_features: ["north-facing", "near station"]
    },
    metadata: {
      created_at: ts(),
      updated_at: ts(),
      created_by: agentId
    }
  });

  // ====== leads ======
  const leadId = randomUUID();
  const leadsRef = db().collection("leads").doc(leadId);
  await leadsRef.set({
    lead_id: leadId,
    contact: {
      first_name: "Taylor",
      last_name: "Pham",
      email: "taylor.pham@example.com",
      phone: "0466789123",
      preferred_contact: "both",
      suburb: "Asquith",
      timeframe: "1-3 months",
      score: 82
    },
    status: {
      current: "contacted",
      history: [
        { status: "new", changed_at: ts(), changed_by: agentId, notes: "Lead created from FB form" },
        { status: "contacted", changed_at: ts(), changed_by: agentId, notes: "Called and sent intro email" }
      ]
    },
    metadata: {
      created_at: ts(),
      updated_at: ts(),
      deleted_at: null,
      version: 1,
      tags: ["asquith", "3bed", "hot"],
      custom_fields: {}
    }
  });

  // ====== reports ======
  const reportId = randomUUID();
  const reportsRef = db().collection("reports").doc(reportId);
  await reportsRef.set({
    report_id: reportId,
    lead_id: leadsRef,
    property_id: propertiesRef,
    prepared_by: agentsRef,
    report_type: "valuation",
    status: { current: "draft", history: [{ status: "draft", changed_at: ts(), changed_by: agentId }] },
    valuation: {
      agent_estimate_low: 1400000,
      agent_estimate_high: 1500000,
      agent_recommended_price: 1480000,
      valuation_method: "CMA + recent sales",
      market_conditions: "Tight supply; strong buyer demand.",
      confidence_level: "medium"
    },
    comparables: [
      {
        address: "10 Smith St, Asquith NSW 2077",
        sale_price: 1420000,
        sale_date: "2025-08-10",
        property_type: "house",
        bedrooms: 3,
        bathrooms: 2,
        land_size: 580,
        similarity_score: 8,
        data_source: "RP Data",
        notes: "Similar land size and condition"
      }
    ],
    research: {
      sources_used: ["RP Data", "NSW Planning"],
      market_trends: "Days on market decreasing.",
      suburb_insights: "Families seeking catchment.",
      recent_sales_volume: 27,
      average_days_on_market: 24
    },
    agent_commentary: {
      executive_summary: "Solid family home close to transport.",
      property_highlights: ["North-facing", "Close to station"],
      market_position: "Upper quartile of 3-bed houses in 2077.",
      recommendations: "List at $1.48m.",
      next_steps: "Photos; launch campaign Friday."
    },
    files: { pdf_url: "", pdf_size: 0, template_used: "valuation-v1", attachments: [] },
    timeline: {
      created_at: ts(),
      last_edited_at: ts(),
      approved_at: null,
      sent_at: null,
      opened_at: null,
      preparation_time: 45
    },
    delivery: {
      sent_to: "taylor.pham@example.com",
      sent_via: "email",
      delivery_status: "pending",
      open_count: 0,
      download_count: 0
    }
  });

  // ====== notifications ======
  const notificationId = randomUUID();
  await db().collection("notifications").doc(notificationId).set({
    notification_id: notificationId,
    lead_id: leadsRef,
    recipient: { type: "agent", id: agentId, email: "alex.nguyen@example.com", phone: "0412345678" },
    notification: {
      type: "hot_lead",
      priority: "high",
      subject: "HOT lead assigned: Taylor Pham",
      body: "A new HOT lead has been assigned to you.",
      template_used: "hot-lead-v1"
    },
    delivery: { channel: "email", sent_at: ts(), delivered_at: null, opened_at: null, clicked_at: null, status: "sent" },
    tracking: { attempts: 1, last_attempt: ts(), error_message: "", bounce_reason: "" },
    metadata: { created_at: ts(), created_by: "system", expires_at: null }
  });

  // ====== campaigns ======
  const campaignId = randomUUID();
  await db().collection("campaigns").doc(campaignId).set({
    campaign_id: campaignId,
    campaign_details: {
      name: "Asquith Spring Leads",
      description: "Lead gen for 3-bed houses in Asquith.",
      type: "lead_generation",
      platform: "facebook",
      status: "active"
    },
    targeting: {
      suburbs: ["Asquith", "Hornsby"],
      age_range: { min: 28, max: 60 },
      interests: ["real estate", "home improvement"],
      behaviors: ["likely_to_move"],
      custom_audience: ""
    },
    schedule: {
      start_date: "2025-09-01",
      end_date: "2025-10-15",
      daily_start: "08:00",
      daily_end: "21:00",
      days_of_week: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    },
    budget: { total_budget: 3000, daily_budget: 100, spent_to_date: 450, cost_per_lead_target: 35, actual_cost_per_lead: 30 },
    performance: { impressions: 54000, clicks: 1900, click_through_rate: 3.52, total_leads: 15, qualified_leads: 9, conversion_rate: 60.0, hot_leads: 4 },
    tracking: { utm_source: "facebook", utm_medium: "cpc", utm_campaign: "asquith-spring", landing_page: "https://example.com/asquith", pixel_id: "FB-PIX-123" },
    metadata: { created_at: ts(), created_by: "marketing-user-01", updated_at: ts(), updated_by: "marketing-user-01" }
  });

  console.log("Seeded sample documents into collections: agents, properties, leads, reports, notifications, campaigns");
}

run().catch(err => { console.error(err); process.exit(1); });
