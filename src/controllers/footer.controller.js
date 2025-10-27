import * as FooterSvc from "../services/footer.service.js";

// GET /footer - Get single footer (public endpoint)
export async function getFooter(req, res) {
  console.log("🌐 Footer GET Controller - Request received");
  const data = await FooterSvc.getFooter();
  console.log("📤 Footer GET Controller - Sending response:", { success: true, data });
  return res.json({ success: true, data });
}

// PATCH /footer - Update footer (admin endpoint) 
export async function updateFooter(req, res) {
  console.log("🔍 Footer Update Request:", req.body);
  const data = await FooterSvc.updateFooter(req.body);
  console.log("✅ Footer Update Result:", data);
  return res.json({ success: true, data });
}