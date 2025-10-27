import * as FooterSvc from "../services/footer.service.js";

// GET /footer - Get single footer (public endpoint)
export async function getFooter(req, res) {
  const data = await FooterSvc.getFooter();
  return res.json({ success: true, data });
}

// PATCH /footer - Update footer (admin endpoint) 
export async function updateFooter(req, res) {
  console.log("🔍 Footer Update Request:", req.body);
  const data = await FooterSvc.updateFooter(req.body);
  console.log("✅ Footer Update Result:", data);
  return res.json({ success: true, data });
}