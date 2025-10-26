import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import v1Router from "./routes/index.js";
import authRoutes from "./routes/auth.routes.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createServer() {
  const app = express();

  // security & basics
  app.use(helmet());
  const authDisabled = process.env.AUTH_DISABLED === 'true';
    console.log('CORS_ORIGIN env:', process.env.CORS_ORIGIN);
  if (authDisabled) {
    // Testing mode: allow all origins
    app.use(cors({ origin: '*' }));
  } else {
    const corsOriginEnv = process.env.CORS_ORIGIN; // comma-separated list supported
    const allowed = (corsOriginEnv || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    app.use(
      cors({
        origin: (origin, cb) => {
          // Allow non-browser or same-origin requests with no Origin header
          if (!origin) return cb(null, true);
          if (allowed.includes(origin)) return cb(null, true);
          return cb(new Error('Not allowed by CORS'), false);
        },
        // No need for credentials with JWT tokens
      })
    );
  }
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  app.set("trust proxy", 1);
  // JWT authentication - no session cookies needed

  // JWT authentication - no debug endpoint needed

  // health
  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  // api v1
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1", v1Router);

  // 404 & error
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
