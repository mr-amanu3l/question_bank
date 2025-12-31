const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const User = require('../models/User');
const logger = require('../utils/logger');
const { protect } = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbac');

// Configure otplib
otplib.authenticator.options = { 
    window: 6, // Increase window to +/- 6 steps (approx 3 mins) to handle manual entry delay
    step: 30 
};

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, email, password, role, department } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate MFA Secret
        const mfaSecret = otplib.authenticator.generateSecret();

        const user = await User.create({
            username,
            email,
            passwordHash,
            role,
            department,
            mfaSecret
        });

        if (user) {
            await logger(user._id, 'REGISTER', 'User registered successfully', req);
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                mfaSecret: user.mfaSecret, // Send secret to user to setup authenticator (or just for console MFA)
                message: 'User registered. Please use the MFA secret to generate tokens.'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        await logger(null, 'REGISTER_ERROR', error.message, req);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & step 1 of MFA
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        // Check if user exists
        if (!user) {
            await logger(null, 'LOGIN_FAILED', `Failed login attempt for email: ${email}`, req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            await logger(user._id, 'LOGIN_LOCKED', 'Attempt to login to locked account', req);
            return res.status(403).json({ 
                message: `Account is locked. Try again after ${user.lockedUntil}` 
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            user.failedAttempts += 1;
            
            // Lock account if 5 failed attempts
            if (user.failedAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
                await logger(user._id, 'ACCOUNT_LOCKED', 'Account locked due to 5 failed attempts', req);
            }
            
            await user.save();
            await logger(user._id, 'LOGIN_FAILED', 'Invalid password', req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Reset failed attempts on success (partial success, still need MFA)
        user.failedAttempts = 0;
        await user.save();

        // Generate OTP for console-based MFA
        const token = otplib.authenticator.generate(user.mfaSecret);
        console.log(`==================================================`);
        console.log(`[MFA] OTP for user ${user.username}: ${token}`);
        console.log(`==================================================`);

        res.json({
            message: 'MFA required. Check console for OTP.',
            userId: user._id,
            mfaRequired: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/verify-mfa
// @desc    Verify OTP and issue JWT
// @access  Public
router.post('/verify-mfa', async (req, res) => {
    const { userId, otp } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify OTP
        // Note: In production, verify against the secret. 
        // Since we generated the token in login using the secret, we can verify it here.
        // otplib handles window/time drift.
        const isValid = otplib.authenticator.verify({
            token: otp,
            secret: user.mfaSecret
        });
        
        if (!isValid) {
            // Debugging: Log what was expected vs received (CAUTION: Don't do this in real Prod logs)
            const currentToken = otplib.authenticator.generate(user.mfaSecret);
            console.log(`[MFA DEBUG] User: ${user.username} | Received: ${otp} | Current Valid: ${currentToken}`);
            
            await logger(user._id, 'MFA_FAILED', 'Invalid OTP provided', req);
            return res.status(401).json({ message: 'Invalid OTP' });
        }

        await logger(user._id, 'LOGIN_SUCCESS', 'User logged in successfully', req);

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            department: user.department,
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/users', protect, rbac('Admin'), async (req, res) => {
    try {
        const users = await User.find({}, 'username email role department createdAt');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/users/:id/role', protect, rbac('Admin'), async (req, res) => {
    const { role } = req.body;
    try {
        if (!['Admin', 'Lecturer', 'Student'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.role = role;
        await user.save();
        await logger(req.user._id, 'ROLE_UPDATE', `Changed role of ${user.email} to ${role}`, req);
        res.json({ message: 'Role updated', user: { _id: user._id, username: user.username, email: user.email, role: user.role, department: user.department } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
