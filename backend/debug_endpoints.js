const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
// We need a valid admin ID to test. The server.js creates a default admin.
// Username: admin
// Let's try to login first to get the ID and token.

async function testEndpoints() {
    try {
        console.log('Logging in as admin...');
        const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });

        const { token, user } = loginRes.data;
        console.log('Login successful. User ID:', user.id);

        // 1. Test /api/sites
        try {
            console.log('Testing /api/sites...');
            await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`, {
                // Deliberately omitting header to match AdminDashboard behavior 
                // (Wait, I should replicate exactly what AdminDashboard does)
            });
            console.log('/api/sites WITHOUT header: OK');
        } catch (error) {
            console.log('/api/sites WITHOUT header: FAILED', error.response ? error.response.status : error.message);
        }

        try {
            console.log('Testing /api/sites WITH header...');
            await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('/api/sites WITH header: OK');
        } catch (error) {
            console.log('/api/sites WITH header: FAILED', error.response ? error.response.status : error.message);
        }

        // 2. Test /api/warehouses
        try {
            console.log('Testing /api/warehouses...');
            await axios.get(`${API_BASE_URL}/api/warehouses?adminId=${user.id}`);
            console.log('/api/warehouses: OK');
        } catch (error) {
            console.log('/api/warehouses: FAILED', error.response ? error.response.status : error.message);
        }

        // 3. Test /api/staff
        try {
            console.log('Testing /api/staff...');
            await axios.get(`${API_BASE_URL}/api/staff`, { headers: { Authorization: `Bearer ${token}` } });
            console.log('/api/staff: OK');
        } catch (error) {
            console.log('/api/staff: FAILED', error.response ? error.response.status : error.message);
        }

        // 4. Test /api/auth/supervisors
        try {
            console.log('Testing /api/auth/supervisors...');
            await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
            console.log('/api/auth/supervisors: OK');
        } catch (error) {
            console.log('/api/auth/supervisors: FAILED', error.response ? error.response.status : error.message);
        }

    } catch (error) {
        console.error('Fatal error in test script:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testEndpoints();
