import { Router } from "express";
import leadsRouter from "./leads.routes.js";
import adminsRouter from "./admins.routes.js";
import messagesRouter from "./messages.routes.js";
import authRouter from "./auth.routes.js";
import requireAuth from "../middleware/require-auth.js";
// sau này có thể thêm: agentsRouter, reportsRouter, ...

const r = Router();

r.get("/", (_req, res) => {
  res.json({ name: "wmhsl-real-estate-backend", version: "v1" });
});

// Authentication routes (public + protected)
r.use("/auth", authRouter);
// Keep public form open under /leads/public; protect other operations
r.use("/leads", leadsRouter);
r.use("/admins", requireAuth, adminsRouter);
// /messages: allow public-first endpoint without auth, protect others
const messagesGate = (req, res, next) => {
  if (req.path === '/public-first') return next();
  return requireAuth(req, res, next);
};
r.use("/messages", messagesGate, messagesRouter);

export default r;
