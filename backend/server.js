const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const seedDatabase = require('./utils/seedData');

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(() => {
    seedDatabase();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/logs', require('./routes/logs'));

// Root route
app.get('/', (req, res) => {
    res.send('Secure Exam System API is running...');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
