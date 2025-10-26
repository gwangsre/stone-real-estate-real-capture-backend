import { loginBody, registerBody, changePasswordBody } from '../validators/auth.schema.js';
import { verifyAdminCredentials, hashPassword, findAdminByUsername, findAdminById, updateAdminPassword } from '../services/auth.service.js';
import { generateToken, verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { db } from '../config/firebase.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res, next) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY', details: parsed.error.flatten() });
    }
  const { username, password } = parsed.data;
    const admin = await verifyAdminCredentials(username, password);
    if (!admin) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });    // Generate JWT token instead of using session
    const token = generateToken(admin);
    
    return res.json({ 
      user: admin,
      token: token,
      tokenType: 'Bearer'
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // Server-side logout would require token blacklisting (not implemented)
  return res.json({ 
    ok: true, 
    message: 'Logout successful. Please remove token from client storage.' 
  });
};

export const me = async (req, res) => {
  // User info is now available from the JWT token (attached by requireAuth middleware)
  if (!req.user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  return res.json({ user: req.user });
};

// Optional: register a new admin locally (guarded behind env)
export const register = async (req, res, next) => {
  try {
    if (process.env.ALLOW_ADMIN_REGISTER !== 'true') {
      return res.status(403).json({ error: 'REGISTRATION_DISABLED' });
    }
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_BODY', details: parsed.error.flatten() });
    const { username, email, password, name, role } = parsed.data;
    // enforce lowercase username canonical form
    const uname = username.toLowerCase();
    const exists = await findAdminByUsername(uname);
    if (exists) return res.status(409).json({ error: 'USERNAME_EXISTS', message: 'This username is already used' });
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();
    const doc = {
      username: uname,
      email: email || '',
      name: name || '',
      role: role || 'admin',
      password_hash,
      metadata: { created_at: now, updated_at: now, deleted_at: null },
    };
    try {
      const ref = await db().collection('admins').add(doc);
      return res.status(201).json({ id: ref.id, ...doc });
    } catch (e) {
      return res.status(500).json({ error: 'CREATE_ADMIN_FAILED' });
    }
  } catch (err) {
    next(err);
  }
};

// Change password for authenticated admin
export const changePassword = async (req, res, next) => {
  try {
    // Ensure admin is authenticated
    if (!req.user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required' });
    
    const parsed = changePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY', details: parsed.error.flatten() });
    }
    
    const { currentPassword, newPassword } = parsed.data;
    const adminId = req.user.id;
    
    // Get current admin data from database
    const admin = await findAdminById(adminId);
    if (!admin || admin?.metadata?.deleted_at) {
      return res.status(404).json({ error: 'ADMIN_NOT_FOUND', message: 'Admin account not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' });
    }
    
    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, admin.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'NEW_PASSWORD_SAME_AS_CURRENT', message: 'New password must be different from current password' });
    }
    
    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    await updateAdminPassword(adminId, newPasswordHash);
    
    return res.json({ 
      ok: true, 
      message: 'Password changed successfully' 
    });
  } catch (err) {
    next(err);
  }
};
