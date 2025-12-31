const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Connect to MongoDB
const connectDB = async () => {
    try {
        console.log('Attempting to connect to Local MongoDB...');
        // Try local connection with short timeout (5s)
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secure_exam_system', {
            serverSelectionTimeoutMS: 10000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        if (process.env.USE_MEMORY_DB === 'true') {
            console.log('Local MongoDB connection failed (or timed out). Starting In-Memory MongoDB...');
            try {
                const mongod = await MongoMemoryServer.create({
                    binary: {
                        version: process.env.MONGOMS_VERSION || '4.4.10'
                    }
                });
                const uri = mongod.getUri();
                console.log(`In-Memory MongoDB started at ${uri}`);
                
                const conn = await mongoose.connect(uri);
                console.log(`Fallback: Connected to In-Memory MongoDB`);
            } catch (memError) {
                console.error(`Error starting In-Memory DB: ${memError.message}`);
                process.exit(1);
            }
        } else {
            console.error('Local MongoDB connection failed and In-Memory DB is disabled. Provide MONGO_URI or enable USE_MEMORY_DB=true.');
            process.exit(1);
        }
    }
};

module.exports = connectDB;
