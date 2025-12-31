// Rule-Based Access Control (RuBAC) Middleware
// Implements: RuBAC
// Why: Denies access outside working hours (08:00–18:00), allowing Admin bypass.
const ruleBased = (req, res, next) => {
    // Admin bypass
    if (req.user && req.user.role === 'Admin') {
        return next();
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Working hours: 08:00 to 18:00 (6 PM)
    if (currentHour < 8 || currentHour >= 18) {
        return res.status(403).json({ 
            message: 'Access denied. System is only available during working hours (08:00 - 18:00).' 
        });
    }

    next();
};

module.exports = ruleBased;
