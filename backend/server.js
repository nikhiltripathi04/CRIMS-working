const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const warehouseRoutes = require('./routes/warehouses');
const staffRoutes = require('./routes/staff');
const attendanceRoutes = require('./routes/attendance');
const messageRoutes = require('./routes/messages');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/messages', messageRoutes);

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

        // Schedule daily cleanup of old attendance photos (runs at 2 AM every day)
        const Attendance = require('./models/Attendance');

        // Run cleanup on startup as well (in case server was down at 2 AM)
        const runCleanup = async () => {
            console.log('🧹 Running startup attendance photo cleanup...');
            try {
                const result = await Attendance.cleanupOldPhotos();
                console.log(`✅ Cleaned up ${result.modifiedCount} old photos`);
            } catch (error) {
                console.error('❌ Error during startup cleanup:', error);
            }
        };
        runCleanup();

        cron.schedule('0 2 * * *', async () => {
            console.log('🧹 Running scheduled attendance photo cleanup...');
            try {
                const result = await Attendance.cleanupOldPhotos();
                console.log(`✅ Cleaned up ${result.modifiedCount} old photos`);
            } catch (error) {
                console.error('❌ Error during scheduled cleanup:', error);
            }
        });
        console.log('⏰ Scheduled daily photo cleanup job (2 AM)');

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
            console.log('   POST http://localhost:' + PORT + '/api/staff');
            console.log('   POST http://localhost:' + PORT + '/api/attendance');
            console.log('💾 Body parser limit: 50mb (for attendance photos)');
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