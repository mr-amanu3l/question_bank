const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { protect } = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbac');
const ruleBased = require('../middleware/ruleBased');
const abac = require('../middleware/abac');
const logger = require('../utils/logger');

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private (Lecturer, Admin)
// Security: RBAC (Lecturer/Admin), RuBAC (Working Hours), ABAC (Department)
router.post('/', protect, rbac('Lecturer', 'Admin'), ruleBased, abac('upload_question'), async (req, res) => {
    const { title, content, classification, allowedUsers, department } = req.body;

    try {
        const question = new Question({
            title,
            content,
            classification,
            allowedUsers, // For DAC
            department: department || req.user.department,
            owner: req.user._id
        });

        const createdQuestion = await question.save();
        await logger(req.user._id, 'CREATE_QUESTION', `Created question ${createdQuestion._id}`, req);
        
        res.status(201).json(createdQuestion);
    } catch (error) {
        await logger(req.user._id, 'CREATE_QUESTION_ERROR', error.message, req);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/questions
// @desc    Get all questions (filtered by access)
// @access  Private
// Security: MAC (Confidentiality), DAC (Allowed Users)
router.get('/', protect, async (req, res) => {
    try {
        let query = {};

        // MAC: Students cannot see 'Confidential'
        if (req.user.role === 'Student') {
            query.classification = { $ne: 'Confidential' };
        }

        const questions = await Question.find(query)
            .populate('owner', 'username department')
            .populate('allowedUsers', 'username email department');

        // DAC Filter: If question is private/internal or has specific allowedUsers, check if user is allowed.
        // For this assignment, let's assume if 'allowedUsers' is not empty, only those users (plus owner/admin) can see it.
        // Or if the prompt implies DAC is strictly for granting access to specific people.
        
        const filteredQuestions = questions.reduce((acc, q) => {
            const isAdmin = req.user.role === 'Admin';
            const isOwner = q.owner._id.toString() === req.user._id.toString();
            const isAllowedDAC = Array.isArray(q.allowedUsers) && q.allowedUsers.some(u => (u._id || u).toString() === req.user._id.toString());
            const sameDepartment = q.department && req.user.department && q.department === req.user.department;

            const canViewFull =
                isAdmin ||
                isOwner ||
                isAllowedDAC ||
                (q.classification === 'Public') ||
                (q.classification === 'Internal' && sameDepartment);

            if (canViewFull) {
                acc.push(q);
            } else {
                // For Confidential not allowed, keep fully hidden
                if (q.classification === 'Confidential') {
                    return acc;
                }
                // Outline-only response for unauthorized
                acc.push({
                    _id: q._id,
                    title: q.title,
                    classification: q.classification,
                    department: q.department,
                    owner: q.owner,
                    accessDenied: true,
                    content: 'Restricted'
                });
            }
            return acc;
        }, []);

        await logger(req.user._id, 'VIEW_QUESTIONS', 'Retrieved question list', req);
        res.json(filteredQuestions);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/questions/:id
// @desc    Update question
// @access  Private (Owner or Admin)
// Security: DAC (Owner only), MAC (Admin only can change classification)
router.put('/:id', protect, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // DAC: Only Owner or Admin can update
        if (question.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            await logger(req.user._id, 'UPDATE_DENIED', `Tried to update question ${req.params.id} owned by ${question.owner}`, req);
            return res.status(403).json({ message: 'Not authorized to update this question' });
        }

        // MAC: Only Admin can modify classification
        if (req.body.classification && req.body.classification !== question.classification && req.user.role !== 'Admin') {
             return res.status(403).json({ message: 'Only Admin can change classification' });
        }

        question.title = req.body.title || question.title;
        question.content = req.body.content || question.content;
        if (req.user.role === 'Admin' && req.body.classification) {
            question.classification = req.body.classification;
        }
        if (req.body.allowedUsers) {
            question.allowedUsers = req.body.allowedUsers;
        }

        const updatedQuestion = await question.save();
        await logger(req.user._id, 'UPDATE_QUESTION', `Updated question ${question._id}`, req);
        res.json(updatedQuestion);

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/questions/:id
// @desc    Delete question
// @access  Private (Owner or Admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        if (question.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to delete this question' });
        }

        await question.deleteOne();
        await logger(req.user._id, 'DELETE_QUESTION', `Deleted question ${req.params.id}`, req);
        res.json({ message: 'Question removed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:id/acl/grant', protect, async (req, res) => {
    try {
        const { userId, email } = req.body;
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        if (question.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        let targetId = userId;
        if (!targetId && email) {
            const User = require('../models/User');
            const targetUser = await User.findOne({ email });
            if (!targetUser) return res.status(404).json({ message: 'User not found' });
            targetId = targetUser._id.toString();
        }
        if (!targetId) return res.status(400).json({ message: 'userId or email required' });
        const exists = question.allowedUsers.some(u => u.toString() === targetId);
        if (!exists) {
            question.allowedUsers.push(targetId);
            await question.save();
        }
        await logger(req.user._id, 'DAC_GRANT', `Granted access to ${targetId} on ${question._id}`, req);
        res.json({ message: 'Access granted', allowedUsers: question.allowedUsers });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:id/acl/revoke', protect, async (req, res) => {
    try {
        const { userId, email } = req.body;
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        if (question.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        let targetId = userId;
        if (!targetId && email) {
            const User = require('../models/User');
            const targetUser = await User.findOne({ email });
            if (!targetUser) return res.status(404).json({ message: 'User not found' });
            targetId = targetUser._id.toString();
        }
        if (!targetId) return res.status(400).json({ message: 'userId or email required' });
        question.allowedUsers = question.allowedUsers.filter(u => u.toString() !== targetId);
        await question.save();
        await logger(req.user._id, 'DAC_REVOKE', `Revoked access from ${targetId} on ${question._id}`, req);
        res.json({ message: 'Access revoked', allowedUsers: question.allowedUsers });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
