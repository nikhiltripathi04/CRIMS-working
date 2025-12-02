const mongoose = require('mongoose');
const axios = require('axios');
const { expect } = require('chai');

const API_URL = 'http://localhost:3000/api';
let adminToken, supervisorToken, adminId, supervisorId, siteId, warehouseId, supplyRequestId;

// Helper to print colored status
const printStatus = (message, status) => {
    if (status === 'PASS') console.log(`✅ ${message}`);
    else if (status === 'FAIL') console.error(`❌ ${message}`);
    else console.log(`ℹ️ ${message}`);
};

async function runTests() {
    try {
        console.log('🚀 Starting Supervisor Backend Verification...');

        // 1. Register Admin
        printStatus('Registering Admin...', 'INFO');
        const adminUser = {
            username: `admin_test_${Date.now()}`,
            password: 'password123',
            email: `admin_${Date.now()}@test.com`,
            phoneNumber: '1234567890',
            firmName: 'Test Firm'
        };

        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, adminUser);
            adminId = regRes.data.data.id;
            printStatus('Admin Registered', 'PASS');
        } catch (error) {
            printStatus(`Admin Registration Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
            return;
        }

        // 2. Login Admin
        printStatus('Logging in Admin...', 'INFO');
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: adminUser.username,
                password: adminUser.password
            });
            adminToken = loginRes.data.token;
            printStatus('Admin Logged In', 'PASS');
        } catch (error) {
            printStatus(`Admin Login Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
            return;
        }

        // 3. Create Site
        printStatus('Creating Site...', 'INFO');
        try {
            const siteRes = await axios.post(`${API_URL}/sites`, {
                siteName: `Test Site ${Date.now()}`,
                location: '123 Test St',
                adminId: adminId
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            siteId = siteRes.data.data._id;
            printStatus('Site Created', 'PASS');
        } catch (error) {
            printStatus(`Site Creation Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
            return;
        }

        // 4. Create Warehouse
        printStatus('Creating Warehouse...', 'INFO');
        try {
            const warehouseRes = await axios.post(`${API_URL}/warehouses`, {
                warehouseName: `Test Warehouse ${Date.now()}`,
                location: 'Test Location',
                managerUsername: `manager_${Date.now()}`,
                managerPassword: 'password123',
                adminId: adminId
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            warehouseId = warehouseRes.data.warehouse._id;
            printStatus('Warehouse Created', 'PASS');
        } catch (error) {
            printStatus(`Warehouse Creation Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
            return;
        }

        // 5. Add Supplies to Warehouse
        printStatus('Adding Supplies to Warehouse...', 'INFO');
        try {
            await axios.post(`${API_URL}/warehouses/${warehouseId}/supplies`, {
                itemName: 'Cement',
                quantity: 1000,
                unit: 'bags',
                currency: 'INR',
                entryPrice: 350,
                adminId: adminId
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            await axios.post(`${API_URL}/warehouses/${warehouseId}/supplies`, {
                itemName: 'Bricks',
                quantity: 5000,
                unit: 'pcs',
                currency: 'INR',
                entryPrice: 10,
                adminId: adminId
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            printStatus('Supplies Added to Warehouse', 'PASS');
        } catch (error) {
            printStatus(`Adding Supplies Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 6. Create Supervisor
        printStatus('Creating Supervisor...', 'INFO');
        const supervisorUser = {
            username: `sup_${Date.now()}`,
            password: 'password123',
            adminId: adminId
        };
        try {
            const supRes = await axios.post(`${API_URL}/sites/${siteId}/supervisors`, supervisorUser, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            supervisorId = supRes.data.data.id;
            printStatus('Supervisor Created', 'PASS');
        } catch (error) {
            printStatus(`Supervisor Creation Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
            return;
        }

        // 7. Login Supervisor
        printStatus('Logging in Supervisor...', 'INFO');
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: supervisorUser.username,
                password: supervisorUser.password,
                expectedRole: 'supervisor'
            });
            supervisorToken = loginRes.data.token;

            // Verify assignedSites
            if (loginRes.data.user.assignedSites && loginRes.data.user.assignedSites.length > 0) {
                printStatus('Supervisor Logged In & Assigned Sites Verified', 'PASS');
            } else {
                printStatus('Supervisor Logged In but Assigned Sites Missing', 'FAIL');
            }

        } catch (error) {
            printStatus(`Supervisor Login Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
            return;
        }

        // 8. Test Attendance (Login)
        printStatus('Testing Attendance (Check In)...', 'INFO');
        try {
            await axios.post(`${API_URL}/attendance`, {
                type: 'login',
                photo: 'base64_placeholder_string',
                location: {
                    latitude: 12.9716,
                    longitude: 77.5946,
                    address: 'Test Site Location'
                }
            }, { headers: { Authorization: `Bearer ${supervisorToken}` } });
            printStatus('Attendance Check In Successful', 'PASS');
        } catch (error) {
            printStatus(`Attendance Check In Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 9. Test Messages (Text)
        printStatus('Testing Messages (Text)...', 'INFO');
        try {
            await axios.post(`${API_URL}/messages/send`, {
                siteId: siteId,
                content: 'Hello Admin, this is a test message.'
            }, { headers: { Authorization: `Bearer ${supervisorToken}` } });
            printStatus('Text Message Sent', 'PASS');
        } catch (error) {
            printStatus(`Text Message Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 10. Test Messages (Video)
        printStatus('Testing Messages (Video)...', 'INFO');
        try {
            await axios.post(`${API_URL}/messages/send`, {
                siteId: siteId,
                videoUrl: 'http://example.com/video.mp4'
            }, { headers: { Authorization: `Bearer ${supervisorToken}` } });
            printStatus('Video Message Sent', 'PASS');
        } catch (error) {
            printStatus(`Video Message Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 11. Test Bulk Supply Request
        printStatus('Testing Bulk Supply Request...', 'INFO');
        try {
            const bulkRes = await axios.post(`${API_URL}/sites/${siteId}/supply-requests/bulk`, {
                warehouseId: warehouseId,
                items: [
                    { itemName: 'Cement', quantity: 50, unit: 'bags' },
                    { itemName: 'Bricks', quantity: 200, unit: 'pcs' }
                ],
                supervisorId: supervisorId
            }, { headers: { Authorization: `Bearer ${supervisorToken}` } });

            if (bulkRes.data.data.length === 2 && bulkRes.data.batchId) {
                printStatus('Bulk Supply Request Successful', 'PASS');
                supplyRequestId = bulkRes.data.data[0]._id; // Save one for approval test
            } else {
                printStatus('Bulk Supply Request Failed (Invalid Response)', 'FAIL');
            }
        } catch (error) {
            console.error('Bulk Request Error Details:', error.response?.data);
            printStatus(`Bulk Supply Request Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 12. Test Supply Request Status (Supervisor View)
        printStatus('Testing Supply Request Status...', 'INFO');
        try {
            const statusRes = await axios.get(`${API_URL}/sites/${siteId}/supply-requests?supervisorId=${supervisorId}`, {
                headers: { Authorization: `Bearer ${supervisorToken}` }
            });

            const pendingRequests = statusRes.data.data.filter(r => r.status === 'pending');
            if (pendingRequests.length >= 2) {
                printStatus('Supply Request Status Verified (Pending)', 'PASS');
            } else {
                printStatus('Supply Request Status Verification Failed', 'FAIL');
            }
        } catch (error) {
            printStatus(`Supply Request Status Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 13. Approve Supply Request (Admin/Manager Action)
        printStatus('Testing Supply Request Approval...', 'INFO');
        try {
            await axios.post(`${API_URL}/warehouses/supply-requests/${supplyRequestId}/approve`, {
                transferQuantity: 50,
                adminId: adminId
            }, { headers: { Authorization: `Bearer ${adminToken}` } }); // Using admin token for simplicity
            printStatus('Supply Request Approved', 'PASS');
        } catch (error) {
            printStatus(`Supply Request Approval Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        // 14. Verify Status Update (Approved)
        printStatus('Verifying Approved Status...', 'INFO');
        try {
            const statusRes = await axios.get(`${API_URL}/sites/${siteId}/supply-requests?supervisorId=${supervisorId}`, {
                headers: { Authorization: `Bearer ${supervisorToken}` }
            });

            const approvedRequest = statusRes.data.data.find(r => r._id === supplyRequestId);
            if (approvedRequest && approvedRequest.status === 'approved') {
                printStatus('Status Updated to Approved', 'PASS');
            } else {
                printStatus(`Status Update Verification Failed. Status is: ${approvedRequest?.status}`, 'FAIL');
            }
        } catch (error) {
            printStatus(`Status Verification Failed: ${error.response?.data?.message || error.message}`, 'FAIL');
        }

        console.log('\n✨ Verification Complete!');

    } catch (error) {
        console.error('Unexpected Error:', error);
    }
}

runTests();
