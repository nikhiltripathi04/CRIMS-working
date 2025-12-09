const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testSupervisorPasswordChange() {
    try {
        console.log('🚀 Starting Supervisor Password Change Test...');

        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const adminLogin = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: 'admin', // Assuming 'admin' is a valid admin usage
            password: 'admin' // Replace with actual known password if needed, usually 'admin' in this dev env
        });

        if (!adminLogin.data.success) {
            throw new Error('Admin login failed');
        }

        const adminToken = adminLogin.data.token;
        const adminId = adminLogin.data.user.id;
        console.log('✅ Admin logged in.');

        // 2. Create a temporary supervisor
        console.log('2. Creating temporary supervisor...');
        const tempUsername = `temp_sup_${Date.now()}`;
        const initialPassword = 'initialPassword123';

        const createRes = await axios.post(`${API_BASE_URL}/api/auth/create-supervisor`, {
            username: tempUsername,
            password: initialPassword,
            adminId: adminId
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (!createRes.data.success) {
            throw new Error('Failed to create supervisor');
        }

        const supervisorId = createRes.data.data.id;
        console.log(`✅ Supervisor created: ${tempUsername} (${supervisorId})`);

        // 3. Verify login with initial password
        console.log('3. Verifying login with initial password...');
        const login1 = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: tempUsername,
            password: initialPassword,
            expectedRole: 'supervisor'
        });

        if (!login1.data.success) {
            throw new Error('Initial login failed');
        }
        console.log('✅ Initial login successful.');

        // 4. Change Password via Admin endpoint
        console.log('4. Changing password via Admin endpoint...');
        const newPassword = 'newSecretPassword456';

        const changeRes = await axios.put(`${API_BASE_URL}/api/auth/supervisors/${supervisorId}/password`, {
            adminId: adminId,
            newPassword: newPassword
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (!changeRes.data.success) {
            throw new Error('Password change request failed');
        }
        console.log('✅ Password change request successful.');

        // 5. Verify login with NEW password
        console.log('5. Verifying login with NEW password...');
        const login2 = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: tempUsername,
            password: newPassword,
            expectedRole: 'supervisor'
        });

        if (!login2.data.success) {
            throw new Error('Login with new password failed');
        }
        console.log('✅ Login with new password successful.');

        // 6. Verify login with OLD password fails
        console.log('6. Verifying login with OLD password fails...');
        try {
            await axios.post(`${API_BASE_URL}/api/auth/login`, {
                username: tempUsername,
                password: initialPassword,
                expectedRole: 'supervisor'
            });
            throw new Error('Login with old password SHOUILD fail but succeeded');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Login with old password failed as expected.');
            } else {
                throw error;
            }
        }

        // 7. Cleanup
        console.log('7. Cleaning up (deleting supervisor)...');
        await axios.delete(`${API_BASE_URL}/api/auth/supervisors/${supervisorId}?adminId=${adminId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Cleanup successful.');

        console.log('\n🎉 ALL TESTS PASSED!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testSupervisorPasswordChange();
