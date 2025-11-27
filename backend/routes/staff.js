const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const { auth, adminOnly } = require('../middleware/auth');

// Create new staff member
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { fullName, username, password } = req.body;

        if (!fullName || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide full name, username, and password'
            });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        const staff = new User({
            fullName,
            username: username.toLowerCase().trim(),
            password, // Will be hashed by pre-save hook
            role: 'staff',
            createdBy: req.user._id, // req.user is set by auth middleware
            createdAt: new Date()
        });

        await staff.save();

        res.status(201).json({
            success: true,
            message: 'Staff member created successfully',
            data: {
                id: staff._id,
                fullName: staff.fullName,
                username: staff.username,
                role: staff.role,
                createdAt: staff.createdAt
            }
        });

    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating staff member',
            error: error.message
        });
    }
});

// Get all staff members created by this admin
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const staffMembers = await User.find({
            role: 'staff',
            createdBy: req.user._id
        }).select('-password').sort({ createdAt: -1 });

        res.json({
            success: true,
            count: staffMembers.length,
            data: staffMembers
        });

    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching staff members'
        });
    }
});

// Update staff member
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { fullName, password } = req.body;
        const staffId = req.params.id;

        const staff = await User.findOne({
            _id: staffId,
            role: 'staff',
            createdBy: req.user._id
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        if (fullName) staff.fullName = fullName;
        if (password) staff.password = password; // Will be hashed by pre-save hook

        await staff.save();

        res.json({
            success: true,
            message: 'Staff member updated successfully',
            debug_body: req.body, // Debugging: Return received body
            data: {
                id: staff._id,
                fullName: staff.fullName,
                username: staff.username,
                role: staff.role
            }
        });

    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating staff member'
        });
    }
});

// Delete staff member
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const staffId = req.params.id;

        const result = await User.findOneAndDelete({
            _id: staffId,
            role: 'staff',
            createdBy: req.user._id
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        res.json({
            success: true,
            message: 'Staff member deleted successfully'
        });

    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting staff member'
        });
    }
});

// Get attendance records for a staff member (Admin only)
// This route handles: GET /api/staff/:id/attendance
router.get('/:id/attendance', auth, adminOnly, async (req, res) => {
    try {
        const staffId = req.params.id;
        const { startDate, endDate } = req.query;

        const Attendance = require('../models/Attendance');

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

module.exports = router;
