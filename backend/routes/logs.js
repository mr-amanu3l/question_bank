const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { protect } = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbac');
 
// @route   GET /api/logs
// @desc    List audit logs
// @access  Private (Admin)
router.get('/', protect, rbac('Admin'), async (req, res) => {
    try {
        const { userId, action, limit = 100 } = req.query;
        const query = {};
        if (userId) query.userId = userId;
        if (action) query.action = action;
        const logs = await Log.find(query)
            .sort({ timestamp: -1 })
            .limit(Number(limit))
            .populate('userId', 'username email role department');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
 
module.exports = router;
