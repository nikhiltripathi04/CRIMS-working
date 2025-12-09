const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const { expect } = require('chai');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3000/api';

async function verifySupervisorCreation() {
    console.log('🚀 Starting Supervisor Creation Verification...');

    let adminId;
    let createdSupervisorId;

    // 1. Determine Admin ID
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-management';
        console.log('Using MongoDB URI:', mongoURI.includes('@') ? 'Remote DB' : mongoURI);

        await mongoose.connect(mongoURI);
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.error('❌ No admin user found in database. Please seed an admin user first.');
            process.exit(1);
        }
        adminId = admin._id.toString();
        console.log(`✅ Using Admin ID: ${adminId}`);
    } catch (err) {
        console.error('❌ Database connection/query failed:', err);
        process.exit(1);
    }

    const testSupervisor = {
        username: `test_sup_${Date.now()}`,
        password: 'password123',
        fullName: 'Test Supervisor Name',
        adminId: adminId
    };

    try {
        // 2. Create Supervisor via API
        console.log('Attemping to create supervisor with:', testSupervisor);
        const res = await axios.post(`${API_BASE_URL}/auth/create-supervisor`, testSupervisor);

        if (res.data.success) {
            console.log('✅ Supervisor creation API call successful');
            createdSupervisorId = res.data.data.id;
        } else {
            console.error('❌ API returned failure:', res.data);
            process.exit(1);
        }

        // 3. Verify in Database
        const savedSupervisor = await User.findById(createdSupervisorId);

        expect(savedSupervisor).to.not.be.null;
        expect(savedSupervisor.username).to.equal(testSupervisor.username);
        expect(savedSupervisor.fullName).to.equal(testSupervisor.fullName);

        console.log('✅ Verified supervisor in database:');
        console.log(`   - Username: ${savedSupervisor.username}`);
        console.log(`   - Full Name: ${savedSupervisor.fullName}`);

        // Cleanup
        await User.findByIdAndDelete(createdSupervisorId);
        console.log('✅ Cleanup: Test supervisor deleted');

        console.log('🎉 Verification PASSED!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Verification FAILED:', err.message);
        if (err.response) {
            console.error('   API Response:', err.response.data);
        }
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

verifySupervisorCreation();
