import { Router } from "express";
import { celebrate, Segments } from "celebrate";
import { asyncHandler } from "../middleware/async-handler.js";
import requireAuth from "../middleware/require-auth.js";
import formHeaderValidators from "../validators/form-header.schema.js";
import * as formHeaderController from "../controllers/form-header.controller.js";

const router = Router();

// GET /form-header - Public route to get form header
router.get("/", asyncHandler(formHeaderController.getFormHeader));

// PATCH /form-header - Admin route to update form header
router.patch(
  "/",
  requireAuth,
  celebrate({ [Segments.BODY]: formHeaderValidators.updateFormHeaderBody }),
  asyncHandler(formHeaderController.updateFormHeader)
);

export default router;