import { isCelebrateError } from "celebrate";

export function errorHandler(err, _req, res, _next) {
  // celebrate/Joi validation error
  if (isCelebrateError(err)) {
    const details = {};
    for (const [segment, joiErr] of err.details.entries()) {
      details[segment] = joiErr.details.map(d => d.message);
    }
    return res.status(400).json({ error: "ValidationError", details });
  }

  // app errors
  const status = err.status || 500;
  const payload = {
    error: err.name || "InternalServerError",
    message: err.message || "Unexpected error",
  };

  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack.split("\n").slice(0, 5).join("\n");
  }

  return res.status(status).json(payload);
}
