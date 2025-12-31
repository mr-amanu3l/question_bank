const mongoose = require('mongoose');

// User Schema
// Implements: Authentication & Identification requirements
// Why: Defines the structure for user data, including security-critical fields like passwordHash, role, and lock status.
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Lecturer', 'Student'],
        default: 'Student'
    },
    department: {
        type: String,
        required: true
    },
    // Account Locking Mechanism
    failedAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    // MFA Secret (for Time-based One-Time Password)
    mfaSecret: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
