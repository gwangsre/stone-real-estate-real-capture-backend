import * as FormHeaderSvc from "../services/form-header.service.js";

// GET /form-header - Get single form header (public endpoint)
export async function getFormHeader(req, res) {
  console.log("🌐 Form Header GET Controller - Request received");
  const data = await FormHeaderSvc.getFormHeader();
  console.log("📤 Form Header GET Controller - Sending response:", { success: true, data });
  return res.json({ success: true, data });
}

// PATCH /form-header - Update form header (admin endpoint)
export async function updateFormHeader(req, res) {
  console.log("🔍 Form Header Update Request:", req.body);
  const data = await FormHeaderSvc.updateFormHeader(req.body);
  console.log("✅ Form Header Update Result:", data);
  return res.json({ success: true, data });
}