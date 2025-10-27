import { Router } from "express";
import { celebrate, Segments } from "celebrate";
import { asyncHandler } from "../middleware/async-handler.js";
import requireAuth from "../middleware/require-auth.js";
import footerValidators from "../validators/footer.schema.js";
import * as footerController from "../controllers/footer.controller.js";

const router = Router();

// GET /footer - Public route to get footer
router.get("/", asyncHandler(footerController.getFooter));

// PATCH /footer - Admin route to update footer
router.patch(
  "/",
  requireAuth,
  celebrate({ [Segments.BODY]: footerValidators.updateFooterBody }),
  asyncHandler(footerController.updateFooter)
);

export default router;