import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, findUserById, createUser } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_lost_and_found_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      photoUrl: user.photo_url || user.photoUrl,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        uid: user.id,
        displayName: user.username,
        email: user.email,
        photoURL: user.photo_url,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user.id,
        uid: user.id,
        displayName: user.username,
        email: user.email,
        photoURL: user.photo_url,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during login.' });
  }
});

// POST /api/auth/google (Google Authentication endpoint)
router.post('/google', async (req, res) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required.' });
    }

    let user = await findUserByEmail(email);
    if (!user) {
      // Auto-register user for Google sign-in
      const randomPassword = Math.random().toString(36).slice(-10) + Date.now();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await createUser({
        username: displayName || email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash,
        photoUrl: photoURL,
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Google login successful!',
      token,
      user: {
        id: user.id,
        uid: user.id,
        displayName: user.username,
        email: user.email,
        photoURL: user.photo_url || photoURL,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during Google auth.' });
  }
});

// GET /api/auth/me (Get logged in user profile from JWT)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        uid: user.id,
        displayName: user.username,
        email: user.email,
        photoURL: user.photo_url,
      },
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error.' });
  }
});

export default router;
