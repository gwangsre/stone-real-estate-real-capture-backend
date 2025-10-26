import { Router } from "express";
import { celebrate, Segments, Joi } from "celebrate";
import * as LeadsCtrl from "../controllers/leads.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import leadValidators from "../validators/lead.schema.js";
import requireAuth from "../middleware/require-auth.js";

const r = Router();

/**
 * POST /api/v1/leads/public
 */
r.post(
  "/public",
  celebrate({ [Segments.BODY]: leadValidators.createPublicBody }),
  asyncHandler(LeadsCtrl.createPublicLead)
);

/**
 * GET /api/v1/leads
 * List/filter leads (basic)
 */
r.get(
  "/",
  requireAuth,
  celebrate({
    [Segments.QUERY]: Joi.object({
      status: Joi.string(),
      suburb: Joi.string(),
      category: Joi.string().valid("HOT","WARM","COLD"),
      limit: Joi.number().integer().min(1).max(100).default(20),
      offset: Joi.number().integer().min(0).default(0),
      q: Joi.string().allow(""), // search basic
    }),
  }),
  asyncHandler(LeadsCtrl.listLeads)
);

/**
 * GET /api/v1/leads/:id
 */
r.get(
  "/:id",
  requireAuth,
  celebrate({ [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }) }),
  asyncHandler(LeadsCtrl.getLeadById)
);

/**
 * PATCH /api/v1/leads/:id/status
 * Update status
 */
r.patch(
  "/:id/status",
  requireAuth,
  celebrate({
    [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
    [Segments.BODY]: leadValidators.statusBody,
  }),
  asyncHandler(LeadsCtrl.updateLeadStatus)
);

// PATCH /api/v1/leads/:id (generic update: contact/status/metadata)
r.patch(
  "/:id",
  requireAuth,
  celebrate({
    [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
    [Segments.BODY]: leadValidators.updateLeadBody,
  }),
  asyncHandler(LeadsCtrl.updateLead)
);

/**
 * DELETE /api/v1/leads/:id
 * Soft delete -> metadata.deleted_at
 */
r.delete(
  "/:id",
  requireAuth,
  celebrate({ [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }) }),
  asyncHandler(LeadsCtrl.softDeleteLead)
);

export default r;
