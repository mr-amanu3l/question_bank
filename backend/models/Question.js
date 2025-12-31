const mongoose = require('mongoose');

// Question Schema
// Implements: MAC, DAC, ABAC requirements
// Why: Stores exam questions along with access control metadata.
const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // Mandatory Access Control (MAC) - Classification Label
    classification: {
        type: String,
        enum: ['Public', 'Internal', 'Confidential'],
        default: 'Public'
    },
    // Discretionary Access Control (DAC) - List of specific users granted access
    allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Attribute-Based Access Control (ABAC) - Department attribute
    department: {
        type: String,
        required: true
    },
    // Owner of the question (for DAC management)
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
