const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Site = require('./models/Site');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3000';

async function verifySupervisorRemoval() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create a new test admin
        const admin = new User({
            username: `testadmin_rem_${Date.now()}`,
            password: 'password123',
            role: 'admin',
            email: `admin_rem_${Date.now()}@test.com`
        });
        await admin.save();
        console.log('Admin ID:', admin._id);

        // 2. Create a test site
        const site = new Site({
            siteName: 'Test Removal Site',
            location: 'Test Location',
            adminId: admin._id,
            companyId: admin.companyId,
            supervisors: []
        });
        await site.save();
        console.log('Created test site:', site._id);

        // 3. Create a supervisor assigned to this site
        const supervisor = new User({
            username: `sup_to_remove_${Date.now()}`,
            password: 'password123',
            role: 'supervisor',
            email: `sup_rem_${Date.now()}@test.com`,
            assignedSites: [site._id],
            companyId: admin.companyId || new mongoose.Types.ObjectId()
        });
        await supervisor.save();
        console.log('Created supervisor:', supervisor._id);

        // Assign supervisor to site
        site.supervisors.push(supervisor._id);
        await site.save();
        console.log('Assigned supervisor to site');

        // 4. Perform DELETE request to remove supervisor from site
        // Note: We need a valid token normally, but if we run this locally against the DB we can skip auth if we modified the route? 
        // Wait, the route uses 'checkSiteOwnership' which checks auth.
        // We will need to login as admin first to get a token, or mock the request if we were using supertest.
        // Since we are running a script against a running server, we should login.

        // Login as admin
        try {
            const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                username: admin.username,
                password: 'password123' // hope this is the password, otherwise we might fail if we just found an existing admin
            });
            // If login fails (wrong password for existing admin), we might need to create a fresh admin
        } catch (e) {
            // If login fails, create a NEW admin for sure
            console.log('Login failed, creating fresh admin');
            const freshAdmin = new User({
                username: 'admin_fresh_' + Date.now(),
                password: 'password123',
                role: 'admin'
            });
            await freshAdmin.save();
            admin = freshAdmin;

            // Update site adminId
            site.siteName = 'Test Removal Site Fresh'; // prevent collision if needed?
            site.adminId = admin._id;
            await site.save();
        }

        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: admin.username,
            password: 'password123'
        });
        const token = loginResponse.data.token;
        console.log('Logged in as admin');

        // 5. Call the DELETE endpoint
        console.log(`Calling DELETE ${API_BASE_URL}/api/sites/${site._id}/supervisors/${supervisor._id}`);
        const deleteResponse = await axios.delete(
            `${API_BASE_URL}/api/sites/${site._id}/supervisors/${supervisor._id}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                data: { adminId: admin._id } // Pass adminId if required by middleware logic fallback
            }
        );

        console.log('DELETE response:', deleteResponse.data);

        // 6. Verify Supervisor still exists
        const supervisorCheck = await User.findById(supervisor._id);
        if (supervisorCheck) {
            console.log('SUCCESS: Supervisor user still exists in DB.');
            // Verify assignedSites
            const isAssigned = supervisorCheck.assignedSites.some(id => id.toString() === site._id.toString());
            if (!isAssigned) {
                console.log('SUCCESS: Supervisor is no longer assigned to the site.');
            } else {
                console.error('FAILURE: Supervisor is still assigned to the site in User model.');
            }
        } else {
            console.error('FAILURE: Supervisor user was DELETED!');
        }

        // 7. Verify Site supervisor list
        const siteCheck = await Site.findById(site._id);
        const isSupervisorInSite = siteCheck.supervisors.some(id => id.toString() === supervisor._id.toString());
        if (!isSupervisorInSite) {
            console.log('SUCCESS: Supervisor removed from Site model.');
        } else {
            console.error('FAILURE: Supervisor still in Site model.');
        }

        // Cleanup
        await User.findByIdAndDelete(supervisor._id);
        await Site.findByIdAndDelete(site._id);
        if (admin.username.startsWith('admin_fresh_')) await User.findByIdAndDelete(admin._id);

        await mongoose.disconnect();

    } catch (error) {
        console.error('Verification failed:', error.message);
        if (error.response) console.error('Response data:', error.response.data);
    }
}

verifySupervisorRemoval();
