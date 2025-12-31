const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Backup Utility
// Implements: Backup System
// Why: Exports critical data (Users, Questions) to a JSON file for disaster recovery.
const backup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secure_exam_system');
        console.log('Connected to DB for backup...');

        const users = await User.find({});
        const questions = await Question.find({});

        const backupData = {
            timestamp: new Date().toISOString(),
            users,
            questions
        };

        const backupPath = path.join(__dirname, '../backup_data.json');
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

        console.log(`Backup successful! Saved to ${backupPath}`);
        process.exit(0);
    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    }
};

if (require.main === module) {
    backup();
}

module.exports = backup;
