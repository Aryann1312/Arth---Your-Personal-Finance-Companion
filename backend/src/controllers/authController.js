/**
 * @file authController.js
 * @description Authentication controller managing signup, login, token refresh, and logout
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { ENV } from '../config/env.js';

// Helper to generate access and refresh tokens
function generateTokens(user) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN
  });

  const refreshToken = jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN
  });

  return { accessToken, refreshToken };
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, confirmPassword, acceptTerms, sessionId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    if (acceptTerms === false) {
      return res.status(400).json({ success: false, error: 'You must accept the Terms and Privacy Notice.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'user', // Public signups always receive standard user role
      lastLoginAt: new Date()
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Asynchronously log signup event without blocking response
    ActivityEvent.create({
      userId: user._id,
      sessionId: sessionId || `sess_${Date.now()}`,
      module: 'auth',
      action: 'signup',
      screen: 'SignUpScreen',
      inputs: { name: user.name, email: user.email },
      resultSummary: { role: user.role, registered: true }
    }).catch(err => console.error('[Event Log Error] Signup event failed:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, sessionId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    // Generic error message to prevent account enumeration
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    // Asynchronously log login event
    ActivityEvent.create({
      userId: user._id,
      sessionId: sessionId || `sess_${Date.now()}`,
      module: 'auth',
      action: 'login',
      screen: 'LoginScreen',
      inputs: { email: user.email },
      resultSummary: { role: user.role, status: 'success' }
    }).catch(err => console.error('[Event Log Error] Login event failed:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Refresh token is invalid or expired.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    const tokens = generateTokens(user);

    return res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (req.user) {
      ActivityEvent.create({
        userId: req.user.id,
        sessionId: sessionId || `sess_${Date.now()}`,
        module: 'auth',
        action: 'logout',
        screen: 'ProfileScreen',
        inputs: {},
        resultSummary: { status: 'logged_out' }
      }).catch(err => console.error('[Event Log Error] Logout event failed:', err.message));
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (err) {
    next(err);
  }
}
