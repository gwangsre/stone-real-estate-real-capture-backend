import { Router } from 'express';
import { login, logout, me, register, changePassword } from '../controllers/auth.controller.js';
import requireAuth from '../middleware/require-auth.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes (require JWT token)
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changePassword);

export default router;
