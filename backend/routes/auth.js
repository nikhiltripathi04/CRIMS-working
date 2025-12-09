const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const sendEmail = require('../utils/email');

// ✅ LOGIN Route
// LOGIN Route - with warehouse support
router.post('/login', async (req, res) => {
  try {
    const { username, password, expectedRole } = req.body;

    // Include population for assignedSites and warehouseId
    const user = await User.findOne({ username })
      .populate('assignedSites', 'siteName location')
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
      extraData.assignedSites = user.assignedSites;
    }

    // Populate company info
    if (user.companyId) {
      const company = await mongoose.model('Company').findById(user.companyId);
      if (company) {
        extraData.companyId = company._id;
        extraData.companyName = company.name;
      }
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        ...extraData
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'An error occurred during login', error: error.message });
  }
});

// ✅ CREATE SUPERVISOR Route (Admin only)
router.post('/create-supervisor', async (req, res) => {
  try {
    const { username, password, adminId } = req.body;

    if (!username || !password || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and adminId are required'
      });
    }

    // Verify admin
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only admins can create supervisors'
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const supervisor = new User({
      username: username.toLowerCase().trim(),
      password,
      role: 'supervisor',
      createdBy: adminId,
      companyId: admin.companyId, // Link to company
      assignedSites: [] // Initially empty
    });

    await supervisor.save();

    res.status(201).json({
      success: true,
      message: 'Supervisor account created successfully',
      data: {
        id: supervisor._id,
        username: supervisor.username,
        role: supervisor.role
      }
    });

  } catch (error) {
    console.error('Create supervisor error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating supervisor',
      error: error.message
    });
  }
});

// ✅ GET All Supervisors (Admin only)
router.get('/supervisors', async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!adminId) {
      return res.status(400).json({ success: false, message: 'Admin ID is required' });
    }

    const admin = await User.findById(adminId);
    let query = { role: 'supervisor', createdBy: adminId };

    if (admin && admin.companyId) {
      query = { role: 'supervisor', companyId: admin.companyId };
    }

    const supervisors = await User.find(query)
      .select('username _id assignedSites')
      .populate('assignedSites', 'siteName');

    res.json({
      success: true,
      count: supervisors.length,
      data: supervisors
    });
  } catch (error) {
    console.error('Error fetching supervisors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch supervisors' });
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

// ✅ DELETE Supervisor (Admin only)
router.delete('/supervisors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.query;

    if (!adminId) {
      return res.status(400).json({ success: false, message: 'Admin ID is required' });
    }

    // Verify admin
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const supervisor = await User.findOneAndDelete({ _id: id, role: 'supervisor', createdBy: adminId });

    if (!supervisor) {
      return res.status(404).json({ success: false, message: 'Supervisor not found or unauthorized' });
    }

    res.json({ success: true, message: 'Supervisor deleted successfully' });

  } catch (error) {
    console.error('Error deleting supervisor:', error);
    res.status(500).json({ success: false, message: 'Failed to delete supervisor' });
  }
});

// ✅ CREATE ADMIN (Company Owner only)
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, phoneNumber, authAdminId } = req.body; // authAdminId from frontend sending user.id

    if (!username || !password || !email || !authAdminId) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, email, and creator ID are required'
      });
    }

    // Verify company owner
    const owner = await User.findOne({ _id: authAdminId, role: 'company_owner' });
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only company owners can create admins'
      });
    }

    // Check if username/email exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    const newAdmin = new User({
      username,
      password,
      email,
      firstName: firstName || 'Admin',
      lastName: lastName || 'User',
      phoneNumber: phoneNumber || '0000000000',
      role: 'admin',
      companyId: owner.companyId,
      createdBy: owner._id
    });

    await newAdmin.save();

    // Send welcome email
    const emailSubject = 'Welcome to CRIMS - Admin Account Created';
    const emailHtml = `
      <h1>Welcome to CRIMS, ${firstName || 'Admin'}!</h1>
      <p>Your admin account has been successfully created.</p>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p>Please login and change your password immediately.</p>
      <br>
      <p>Best regards,<br>CRIMS Team</p>
    `;

    // Don't await email to prevent blocking response, but log error if fails
    sendEmail(email, emailSubject, emailHtml).catch(err => console.error('Failed to send admin welcome email:', err));

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: newAdmin._id,
        username: newAdmin.username,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating admin',
      error: error.message
    });
  }
});

// ✅ GET Company Admins (Company Owner only)
router.get('/company-admins', async (req, res) => {
  try {
    const { ownerId } = req.query;

    if (!ownerId) {
      return res.status(400).json({ success: false, message: 'Owner ID is required' });
    }

    // Verify owner
    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== 'company_owner') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const admins = await User.find({ role: 'admin', companyId: owner.companyId })
      .select('username email firstName lastName phoneNumber _id createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Error fetching company admins:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

// ✅ CHANGE Password (Authenticated User)
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'User ID, old password, and new password are required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing password'
    });
  }
});

module.exports = router;
