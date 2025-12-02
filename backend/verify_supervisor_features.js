const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
const LOG_FILE = path.join(__dirname, 'verify_log.txt');

function log(message) {
    console.log(message);
    fs.appendFileSync(LOG_FILE, message + '\n');
}

async function runTest() {
    try {
        fs.writeFileSync(LOG_FILE, ''); // Clear log file
        log('🚀 Starting Supervisor Features Verification...');

        // 1. Login as Admin
        log('\n1️⃣ Logging in as Admin...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.token;
        const adminId = adminLogin.data.user.id;
        log('✅ Admin logged in');

        // 2. Create a Site with Supervisor
        log('\n2️⃣ Creating Site with Supervisor...');
        const supervisorUsername = `sup_${Date.now()}`;
        const siteRes = await axios.post(`${API_URL}/sites`, {
            siteName: `Test Site ${Date.now()}`,
            location: 'Test Location',
            adminId: adminId,
            supervisorUsername: supervisorUsername,
            supervisorPassword: 'password123'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        const siteId = siteRes.data.data._id;
        // Check if supervisors array exists and has elements
        if (!siteRes.data.data.supervisors || siteRes.data.data.supervisors.length === 0) {
            throw new Error('Supervisor not created or not returned in site response');
        }
        const supervisorId = siteRes.data.data.supervisors[0]._id;
        log(`✅ Site created: ${siteRes.data.data.siteName}`);
        log(`✅ Supervisor created: ${supervisorUsername}`);

        // 3. Login as Supervisor
        log('\n3️⃣ Logging in as Supervisor...');
        const supLogin = await axios.post(`${API_URL}/auth/login`, {
            username: supervisorUsername,
            password: 'password123'
        });
        const supToken = supLogin.data.token;
        log('✅ Supervisor logged in');

        // 4. Test Attendance
        log('\n4️⃣ Testing Attendance...');
        const attendancePayload = {
            type: 'login',
            photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            location: { latitude: 12.9716, longitude: 77.5946, address: 'Bangalore' }
        };
        await axios.post(`${API_URL}/attendance`, attendancePayload, {
            headers: { Authorization: `Bearer ${supToken}` }
        });
        log('✅ Attendance (Check In) marked successfully');

        // 5. Test Messages
        log('\n5️⃣ Testing Messages...');
        await axios.post(`${API_URL}/messages/send`, {
            siteId: siteId,
            content: 'Test message from supervisor',
            videoUrl: 'http://example.com/video.mp4'
        }, { headers: { Authorization: `Bearer ${supToken}` } });
        log('✅ Message sent to Admin');

        // 6. Setup Warehouse for Supplies
        log('\n6️⃣ Setting up Warehouse...');
        const managerUsername = `mgr_${Date.now()}`;
        const whRes = await axios.post(`${API_URL}/warehouses`, {
            warehouseName: `Test Warehouse ${Date.now()}`,
            location: 'Warehouse Loc',
            managerUsername: managerUsername,
            managerPassword: 'password123',
            adminId: adminId // Added adminId for validateUser middleware
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const warehouseId = whRes.data.warehouse._id;

        // Add supplies to warehouse
        await axios.post(`${API_URL}/warehouses/${warehouseId}/supplies`, {
            itemName: 'Cement',
            quantity: 100,
            unit: 'bags',
            currency: 'INR',
            entryPrice: 500,
            adminId: adminId // Added adminId for validateUser middleware
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        log('✅ Warehouse created and supplies added');

        // 7. Test Bulk Supply Request
        log('\n7️⃣ Testing Bulk Supply Request...');
        const requestPayload = {
            warehouseId: warehouseId,
            items: [
                { itemName: 'Cement', quantity: 50, unit: 'bags' }
            ]
        };
        const reqRes = await axios.post(`${API_URL}/sites/${siteId}/supply-requests/bulk`, requestPayload, {
            headers: { Authorization: `Bearer ${supToken}` }
        });
        const batchId = reqRes.data.batchId;
        log(`✅ Bulk request sent. Batch ID: ${batchId}`);

        // 8. Verify Request Status
        log('\n8️⃣ Verifying Request Status...');
        const statusRes = await axios.get(`${API_URL}/sites/${siteId}/supply-requests?batchId=${batchId}`, {
            headers: { Authorization: `Bearer ${supToken}` }
        });
        if (statusRes.data.data.length > 0 && statusRes.data.data[0].status === 'pending') {
            log('✅ Request found and status is PENDING');
        } else {
            throw new Error('Request not found or status mismatch');
        }

        log('\n🎉 ALL SUPERVISOR FEATURES VERIFIED SUCCESSFULLY!');

    } catch (error) {
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        log('❌ Test Failed: ' + errMsg);
        console.error(error);
    }
}

runTest();
