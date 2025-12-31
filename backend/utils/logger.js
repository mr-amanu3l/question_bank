const Log = require('../models/Log');

// Logger Utility
// Implements: Audit Trails & Logging
// Why: Provides a standardized way to record security events.
const logger = async (userId, action, details, req) => {
    try {
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'SYSTEM';
        
        const logEntry = new Log({
            userId,
            action,
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            ipAddress
        });

        await logEntry.save();
        console.log(`[AUDIT] ${new Date().toISOString()} | User: ${userId || 'N/A'} | Action: ${action}`);
    } catch (error) {
        console.error('Logging failed:', error);
    }
};

module.exports = logger;
