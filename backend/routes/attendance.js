const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// Submit attendance (Staff only)
router.post('/', auth, async (req, res) => {
    try {
        // Only staff members can submit attendance
        if (req.user.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Only staff members can submit attendance'
            });
        }

        const { type, photo, location } = req.body;

        // Validate required fields
        if (!type || !photo || !location) {
            return res.status(400).json({
                success: false,
                message: 'Please provide type, photo, and location'
            });
        }

        if (!['login', 'logout'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either "login" or "logout"'
            });
        }

        if (!location.latitude || !location.longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location must include latitude and longitude'
            });
        }

        // Create display text for location
        const displayText = location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;

        // Create attendance record
        const attendance = new Attendance({
            staffId: req.user._id,
            type,
            photo,
            photoUploadedAt: new Date(),
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                displayText
            },
            timestamp: new Date()
        });

        await attendance.save();

        res.status(201).json({
            success: true,
            message: `Attendance marked successfully: ${type === 'login' ? 'Check In' : 'Check Out'}`,
            data: {
                id: attendance._id,
                type: attendance.type,
                location: attendance.location,
                timestamp: attendance.timestamp
            }
        });

    } catch (error) {
        console.error('Submit attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting attendance',
            error: error.message
        });
    }
});

// Get own attendance records (Staff only)
router.get('/my-records', auth, async (req, res) => {
    try {
        if (req.user.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Only staff members can access this endpoint'
            });
        }

        const { startDate, endDate } = req.query;

        // Build query
        const query = { staffId: req.user._id };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const records = await Attendance.find(query)
            .sort({ timestamp: -1 })
            .select('-photo'); // Don't send photo data in list view

        res.json({
            success: true,
            count: records.length,
            data: records
        });

    } catch (error) {
        console.error('Get my records error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance records'
        });
    }
});

// Get attendance records for a specific staff member (Admin only)
router.get('/staff/:staffId', auth, adminOnly, async (req, res) => {
    try {
        const { staffId } = req.params;
        const { startDate, endDate } = req.query;

        // Verify the staff member exists and was created by this admin
        const staff = await User.findOne({
            _id: staffId,
            role: 'staff',
            createdBy: req.user._id
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found or you do not have permission to view their records'
            });
        }

        // Build query
        const query = { staffId };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const records = await Attendance.find(query)
            .sort({ timestamp: -1 })
            .populate('staffId', 'fullName username');

        res.json({
            success: true,
            count: records.length,
            staff: {
                id: staff._id,
                fullName: staff.fullName,
                username: staff.username
            },
            data: records
        });

    } catch (error) {
        console.error('Get staff attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching staff attendance records'
        });
    }
});

// Alias route to match frontend expectation: GET /api/staff/:staffId/attendance
// This is registered in server.js under /api/attendance, so the full path will be:
// /api/attendance/staff/:staffId/attendance (which won't work)
// Instead, we need to add this route to the staff.js routes file OR
// add it here with a different pattern that server.js can route correctly

// Manual cleanup of old photos (Admin only)
router.delete('/cleanup', auth, adminOnly, async (req, res) => {
    try {
        const result = await Attendance.cleanupOldPhotos();

        res.json({
            success: true,
            message: 'Photo cleanup completed',
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during cleanup',
            error: error.message
        });
    }
});

module.exports = router;
