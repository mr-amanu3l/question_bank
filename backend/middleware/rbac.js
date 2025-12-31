// Role-Based Access Control (RBAC) Middleware
// Implements: RBAC
// Why: Restricts access to routes based on the user's role (Admin, Lecturer, Student).
const rbac = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Role '${req.user ? req.user.role : 'Unknown'}' is not authorized.` 
            });
        }
        next();
    };
};

module.exports = rbac;
