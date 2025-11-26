const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const warehouseRoutes = require('./routes/warehouses');
const staffRoutes = require('./routes/staff');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// IMPORTANT: Increase the body parser limit for OCR images


// Add request logging middleware (optional but helpful)

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/staff', staffRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({
        message: 'Construction Management API is running!',
        endpoints: {
            auth: '/api/auth',
            sites: '/api/sites',
            warehouse: '/api/warehouses'
        }
    });
});

// Create default users
const createDefaultUsers = async () => {
    try {
        const User = require('./models/User');

        // Check if admin exists
        const adminExists = await User.findOne({ username: 'admin' });

        if (!adminExists) {
            // Let the pre-save hook handle password hashing
            const admin = new User({
                username: 'admin',
                password: 'admin123',  // Don't hash here - let the pre-save hook do it
                role: 'admin',
                email: 'admin@example.com',
                phoneNumber: '1234567890'
            });
            await admin.save();
            console.log('✅ Default admin created: username=admin, password=admin123');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

    } catch (error) {
        console.error('❌ Error creating default users:', error);
    }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-management')
    .then(() => {
        console.log('✅ Connected to MongoDB');

        // Create default admin user
        createDefaultUsers();

        // Start server only after DB connection
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 API URL: http://localhost:${PORT}`);
            console.log('📋 Available endpoints:');
            console.log('   GET  http://localhost:' + PORT + '/');
            console.log('   POST http://localhost:' + PORT + '/api/auth/login');
            console.log('   GET  http://localhost:' + PORT + '/api/sites');
            console.log('   POST http://localhost:' + PORT + '/api/warehouses');
            console.log('💾 Body parser limit: 50mb (for OCR images)');
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Handle unhandled routes
app.use('*', (req, res) => {
    console.log("404 handler called for:", req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Server Error:', err.message);
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});