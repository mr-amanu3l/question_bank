const mongoose = require('mongoose');

// Log Schema
// Implements: Audit Trails & Logging
// Why: Centralized logging for tracking security events and user actions.
const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Can be null for failed login with unknown user
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: String
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);
