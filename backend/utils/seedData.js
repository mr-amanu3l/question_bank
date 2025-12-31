const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const otplib = require('otplib');
const User = require('../models/User');
const Question = require('../models/Question');

const seedDatabase = async () => {
    try {
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('Database already seeded.');
            return;
        }

        console.log('Seeding database...');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);
        const mfaSecret = otplib.authenticator.generateSecret(); // Common secret for simplicity in demo? No, unique is better.
        // Actually, for demo purposes, let's use a fixed secret so we can easily generate tokens if needed, 
        // or just log it. Let's log it.

        const users = [
            {
                username: 'admin',
                email: 'admin@example.com',
                passwordHash,
                role: 'Admin',
                department: 'IT',
                mfaSecret: otplib.authenticator.generateSecret()
            },
            {
                username: 'lecturer',
                email: 'lecturer@example.com',
                passwordHash,
                role: 'Lecturer',
                department: 'CS',
                mfaSecret: otplib.authenticator.generateSecret()
            },
            {
                username: 'student',
                email: 'student@example.com',
                passwordHash,
                role: 'Student',
                department: 'CS',
                mfaSecret: otplib.authenticator.generateSecret()
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log('Users created:');
        createdUsers.forEach(u => {
            console.log(`- ${u.username} (${u.role}): ${u.email} | Pass: password123 | MFA Secret: ${u.mfaSecret}`);
        });

        // Find specific users for references
        const admin = createdUsers.find(u => u.username === 'admin');
        const lecturer = createdUsers.find(u => u.username === 'lecturer');
        const student = createdUsers.find(u => u.username === 'student');

        const questions = [
            {
                title: 'Introduction to Security',
                content: 'What is the difference between Authentication and Authorization?',
                classification: 'Public',
                department: 'CS',
                owner: lecturer._id
            },
            {
                title: 'Advanced Encryption Standard',
                content: 'Explain the AES key expansion algorithm.',
                classification: 'Internal',
                department: 'CS',
                owner: lecturer._id
            },
            {
                title: 'Final Exam Draft',
                content: 'Confidential draft for the upcoming final exam.',
                classification: 'Confidential',
                department: 'CS',
                owner: lecturer._id,
                allowedUsers: [lecturer._id, admin._id] // Only lecturer and admin
            },
            {
                title: 'IT Policy Review',
                content: 'Review of the new IT acceptable use policy.',
                classification: 'Internal',
                department: 'IT',
                owner: admin._id
            }
        ];

        await Question.insertMany(questions);
        console.log('Questions seeded successfully.');

    } catch (error) {
        console.error('Seeding error:', error);
    }
};

module.exports = seedDatabase;
