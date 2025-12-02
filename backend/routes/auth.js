const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ LOGIN Route
// LOGIN Route - with warehouse support
router.post('/login', async (req, res) => {
  try {
    const { username, password, expectedRole } = req.body;

    // Include population for assignedSites and warehouseId
    const user = await User.findOne({ username })
      .populate('siteId', 'siteName location')
      .populate('warehouseId', 'warehouseName location');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // New: If expectedRole is provided, restrict more roles!
    if (expectedRole && user.role !== expectedRole) {
      return res.status(401).json({
        success: false,
        message: `No ${expectedRole} account found with this username`
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Include warehouseId/manager info on login when requested
    let extraData = {};
    if (user.role === 'warehouse_manager') {
      extraData.warehouseId = user.warehouseId;
    }
    if (user.role === 'supervisor') {
      extraData.siteId = user.siteId;
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        ...extraData
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'An error occurred during login', error: error.message });
  }
});

// ✅ REGISTER Admin
router.post('/register', async (req, res) => {
  console.log('📝 Register request received:', req.body);
  try {
    const { username, password, email, phoneNumber, firmName } = req.body;

    if (!username || !password || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, password, email, and phone number'
      });
    }

    // Manually check if username or email already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log('❌ Username already exists:', username);
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
        errorType: 'USERNAME_EXISTS'
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
        errorType: 'EMAIL_EXISTS'
      });
    }

    const user = new User({
      username,
      password, // Will be hashed via pre-save hook
      email,
      phoneNumber,
      firmName: firmName || '',
      role: 'admin'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
});

// ✅ VERIFY Admin Identity
router.post('/verify-identity', async (req, res) => {
  try {
    const { username, email, phoneNumber } = req.body;

    if (!username || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and phone number are required'
      });
    }

    const admin = await User.findOne({ username, role: 'admin' });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No matching admin account found. Please check your information.'
      });
    }

    if (admin.email !== email || admin.phoneNumber !== phoneNumber) {
      return res.status(401).json({
        success: false,
        message: 'Email or phone number does not match our records'
      });
    }

    res.json({
      success: true,
      message: 'Identity verified successfully'
    });

  } catch (error) {
    console.error('Verify identity error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during identity verification'
    });
  }
});

// ✅ RESET Admin Password
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username and new password are required'
      });
    }

    const admin = await User.findOne({ username, role: 'admin' });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found'
      });
    }

    admin.password = newPassword; // Will be hashed in pre-save
    await admin.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during password reset'
    });
  }
});

module.exports = router;
