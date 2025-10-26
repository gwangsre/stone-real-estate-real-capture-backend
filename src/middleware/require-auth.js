import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';

export default function requireAuth(req, res, next) {
  // Temporary bypass for local/testing or staged environments
  if (process.env.AUTH_DISABLED === 'true') return next();

  // Extract JWT token from Authorization header
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authorization token required' });
  }

  // Verify the token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired token' });
  }

  // Attach user info to request for use in controllers
  req.user = decoded;
  next();
}
