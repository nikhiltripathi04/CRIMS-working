const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const verifyScoping = async () => {
    const uniqueId = Date.now();
    const companyData = {
        name: 'Scope CEO',
        surname: 'Owner',
        mobileNumber: `9${uniqueId.toString().slice(-9)}`,
        companyName: `Scope Test Co ${uniqueId}`,
        companyRole: 'Director',
        mail: `ceo.scope${uniqueId}@test.com`,
        gstin: `22SCOPA${uniqueId.toString().slice(-7)}Z5`,
        address: 'Test Scope Address'
    };

    let ownerId = '';
    let adminA_Token = '';
    let adminB_Token = '';

    // 1. Register Company (Owner)
    try {
        console.log('--- Step 1: Register Company ---');
        const res = await axios.post(`${API_URL}/company/register`, companyData);
        const creds = res.data.credentials;

        // Login Owner
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: creds.username,
            password: creds.password
        });
        ownerId = loginRes.data.user.id;
        console.log('✅ Owner Registered & Logged In');
    } catch (error) {
        console.error('❌ Registration Failed:', error.response?.data || error.message);
        process.exit(1);
    }

    let adminA_Id = '';
    let adminB_Id = '';

    // 2. Create Admin A & Admin B
    try {
        console.log('\n--- Step 2: Create Two Admins ---');

        // Create Admin A
        const adminA = {
            username: `adminA_${uniqueId}`,
            password: 'password123',
            email: `adminA${uniqueId}@test.com`,
            authAdminId: ownerId
        };
        const createResA = await axios.post(`${API_URL}/auth/create-admin`, adminA);
        adminA_Id = createResA.data.data.id;

        // Login Admin A
        const resA = await axios.post(`${API_URL}/auth/login`, { username: adminA.username, password: adminA.password });
        adminA_Token = resA.data.token;
        console.log('✅ Admin A Created & Logged In');

        // Create Admin B
        const adminB = {
            username: `adminB_${uniqueId}`,
            password: 'password123',
            email: `adminB${uniqueId}@test.com`,
            authAdminId: ownerId
        };
        const createResB = await axios.post(`${API_URL}/auth/create-admin`, adminB);
        adminB_Id = createResB.data.data.id;

        // Login Admin B
        const resB = await axios.post(`${API_URL}/auth/login`, { username: adminB.username, password: adminB.password });
        adminB_Token = resB.data.token;
        console.log('✅ Admin B Created & Logged In');

    } catch (error) {
        console.error('❌ Admin Creation Failed:', error.response?.data || error.message);
        process.exit(1);
    }

    // 3. Admin A Creates Resources
    try {
        console.log('\n--- Step 3: Admin A Creates Resources ---');
        const configA = { headers: { Authorization: `Bearer ${adminA_Token}` } };

        // Create Site
        await axios.post(`${API_URL}/sites`, {
            siteName: `Site A ${uniqueId}`,
            location: 'Loc A'
        }, configA);
        console.log('✅ Site created by Admin A');

        // Create Warehouse (Needs adminId param due to custom middleware)
        await axios.post(`${API_URL}/warehouses`, {
            warehouseName: `Warehouse A ${uniqueId}`,
            location: 'Loc WA',
            managerUsername: `mgr${uniqueId}`,
            managerPassword: 'password123',
            adminId: adminA_Id
        }, configA);
        console.log('✅ Warehouse created by Admin A');

        // Create Staff
        await axios.post(`${API_URL}/staff`, {
            fullName: 'Staff A',
            username: `staff${uniqueId}`,
            password: 'password123'
        }, configA);
        console.log('✅ Staff created by Admin A');

    } catch (error) {
        console.error('❌ Resource Creation Failed:', error.response?.data || error.message);
        process.exit(1);
    }

    // 4. Admin B Verifies Visibility
    try {
        console.log('\n--- Step 4: Admin B Checks Visibility ---');
        const configB = { headers: { Authorization: `Bearer ${adminB_Token}` } };

        // Check Sites
        const sitesRes = await axios.get(`${API_URL}/sites`, configB);
        const hasSite = sitesRes.data.data.some(s => s.siteName === `Site A ${uniqueId}`);
        if (!hasSite) throw new Error('Admin B cannot see Site A');
        console.log('✅ Admin B sees Site A');

        // Check Warehouses (Needs adminId param due to custom middleware)
        const whRes = await axios.get(`${API_URL}/warehouses?adminId=${adminB_Id}`, configB);
        const hasWh = whRes.data.data.some(w => w.warehouseName === `Warehouse A ${uniqueId}`);
        if (!hasWh) throw new Error('Admin B cannot see Warehouse A');
        console.log('✅ Admin B sees Warehouse A');

        // Check Staff
        const staffRes = await axios.get(`${API_URL}/staff`, configB);
        const hasStaff = staffRes.data.data.some(s => s.username === `staff${uniqueId}`);
        if (!hasStaff) throw new Error('Admin B cannot see Staff A');
        console.log('✅ Admin B sees Staff A');

    } catch (error) {
        console.error('❌ Visibility Check Failed:', error.message);
        process.exit(1);
    }

    console.log('\n✅✅ SCOPING VERIFIED SUCCESSFULLY ✅✅');
};

verifyScoping();
