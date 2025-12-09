const express = require('express');
const router = express.Router();
console.log('Company routes file loaded');
const Company = require('../models/Company');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');

const sendEmail = require('../utils/email');

// Register Company
router.post('/register', async (req, res) => {
    try {
        const {
            name, surname, mobileNumber, companyName, companyRole, mail, gstin, address
        } = req.body;

        // Check if company exists
        const orConditions = [
            { email: mail },
            { name: companyName },
            { phoneNumber: mobileNumber }
        ];
        if (gstin) {
            orConditions.push({ gstin: gstin });
        }

        const existingCompany = await Company.findOne({ $or: orConditions });

        if (existingCompany) {
            let duplicateField = 'Details';
            if (existingCompany.email === mail) duplicateField = 'Email';
            else if (existingCompany.name === companyName) duplicateField = 'Company Name';
            else if (existingCompany.phoneNumber === mobileNumber) duplicateField = 'Mobile Number';
            else if (existingCompany.gstin === gstin) duplicateField = 'GSTIN';

            console.log(`⚠️ Blocked duplicate registration attempt for: ${duplicateField}`);
            return res.status(400).json({ success: false, message: `${duplicateField} is already registered.` });
        }

        // Create Company
        const company = new Company({
            name: companyName,
            email: mail,
            phoneNumber: mobileNumber,
            gstin,
            address
        });
        await company.save();

        // Generate Admin Credentials
        const adminUsername = `admin_${companyName.replace(/\s+/g, '').toLowerCase()}_${crypto.randomBytes(2).toString('hex')}`;
        const adminPassword = crypto.randomBytes(4).toString('hex'); // Simple password for now

        // Create Admin User
        const adminUser = new User({
            username: adminUsername,
            password: adminPassword,
            email: mail,
            phoneNumber: mobileNumber,
            firstName: name,
            lastName: surname,
            role: 'company_owner',
            companyId: company._id,
            firmName: companyName
        });
        await adminUser.save();

        // Send Email
        const emailHtml = `
            <h2>Welcome to CRIMS!</h2>
            <p>Your company "<strong>${companyName}</strong>" has been registered successfully.</p>
            <p>Here are your admin credentials:</p>
            <ul>
                <li><strong>Username:</strong> ${adminUsername}</li>
                <li><strong>Password:</strong> ${adminPassword}</li>
            </ul>
            <p>Please login and change your password immediately.</p>
        `;

        await sendEmail(mail, 'Your Company Credentials', emailHtml);

        res.status(201).json({
            success: true,
            message: 'Company registered successfully. Credentials sent to email.',
            companyId: company._id,
            credentials: { username: adminUsername, password: adminPassword } // FOR TESTING ONLY
        });

    } catch (error) {
        console.error('Company registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// Get Company Logs
router.get('/logs', auth, async (req, res) => {
    try {
        const { companyId } = req.user; // Assuming auth middleware attaches user with companyId

        // If user is admin, they can see all logs for their company
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const logs = await ActivityLog.find({ companyId })
            .sort({ timestamp: -1 })
            .limit(100); // Limit to last 100 logs

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
});

module.exports = router;
