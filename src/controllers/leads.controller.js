import * as LeadsSvc from "../services/leads.service.js";

// POST /leads/public
export async function createPublicLead(req, res) {
  const meta = {
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
    referrer: req.headers["referer"] || req.headers["referrer"] || "",
  };

  const result = await LeadsSvc.createLeadFromPublicForm(req.body, meta);
  return res.status(result?.reused ? 200 : 201).json(result);
}

// GET /leads
export async function listLeads(req, res) {
  const data = await LeadsSvc.listLeads(req.query);
  return res.json(data);
}

// GET /leads/:id
export async function getLeadById(req, res) {
  const data = await LeadsSvc.getLeadById(req.params.id);
  if (!data) return res.status(404).json({ error: "Not Found" });
  return res.json(data);
}

// PATCH /leads/:id/status
export async function updateLeadStatus(req, res) {
  const data = await LeadsSvc.updateLeadStatus(req.params.id, req.body);
  return res.json(data);
}

// DELETE /leads/:id (soft delete)
export async function softDeleteLead(req, res) {
  const data = await LeadsSvc.softDeleteLead(req.params.id);
  return res.json(data);
}

// PATCH /leads/:id (generic update)
export async function updateLead(req, res) {
  const data = await LeadsSvc.updateLead(req.params.id, req.body);
  return res.json(data);
}
