import * as FormHeaderSvc from "../services/form-header.service.js";

// GET /form-header - Get single form header (public endpoint)
export async function getFormHeader(req, res) {
  const data = await FormHeaderSvc.getFormHeader();
  return res.json({ success: true, data });
}

// PATCH /form-header - Update form header (admin endpoint)
export async function updateFormHeader(req, res) {
  const data = await FormHeaderSvc.updateFormHeader(req.body);
  return res.json({ success: true, data });
}