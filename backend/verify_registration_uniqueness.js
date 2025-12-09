const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function verifyUniqueness() {
    const timestamp = Date.now();
    const uniqueSuffix = timestamp.toString().slice(-6);

    // Base company data
    const baseCompany = {
        name: `User${uniqueSuffix}`,
        surname: 'Test',
        mobileNumber: `9${uniqueSuffix}123`, // Unique-ish phone
        companyName: `Company ${uniqueSuffix}`,
        companyRole: 'Owner',
        mail: `user${uniqueSuffix}@example.com`,
        gstin: `GSTIN${uniqueSuffix}`,
        address: '123 Test St'
    };

    console.log('--- Starting Uniqueness Verification ---');

    // 1. Register Base Company (Should Success)
    try {
        console.log(`\n1. Registering Base Company: ${baseCompany.companyName}`);
        const res = await axios.post(`${API_URL}/company/register`, baseCompany);
        if (res.data.success) {
            console.log('✅ Base Company Registered Successfully');
        } else {
            console.error('❌ Failed to register base company:', res.data);
            return;
        }
    } catch (error) {
        console.error('❌ Error registering base company:', error.response?.data || error.message);
        return;
    }

    // 2. Test Duplicate Email
    try {
        console.log('\n2. Testing Duplicate Email...');
        const duplicateEmailData = {
            ...baseCompany,
            companyName: `Company ${uniqueSuffix}_Diff`, // Different name
            mobileNumber: `8${uniqueSuffix}456`, // Different phone
            gstin: `GSTIN${uniqueSuffix}_Diff`, // Different GSTIN
            // mail is same
        };
        await axios.post(`${API_URL}/company/register`, duplicateEmailData);
        console.error('❌ FAILED: Duplicate email should have been rejected');
    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.message.includes('Email is already registered')) {
            console.log('✅ SUCCESS: Duplicate email blocked with correct message');
        } else {
            console.error('❌ FAILED: Unexpected error for duplicate email:', error.response?.data || error.message);
        }
    }

    // 3. Test Duplicate Mobile Number
    try {
        console.log('\n3. Testing Duplicate Mobile Number...');
        const duplicatePhoneData = {
            ...baseCompany,
            companyName: `Company ${uniqueSuffix}_Diff2`,
            mail: `user${uniqueSuffix}_diff@example.com`,
            gstin: `GSTIN${uniqueSuffix}_Diff2`,
            // mobileNumber is same
        };
        await axios.post(`${API_URL}/company/register`, duplicatePhoneData);
        console.error('❌ FAILED: Duplicate mobile number should have been rejected');
    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.message.includes('Mobile Number is already registered')) {
            console.log('✅ SUCCESS: Duplicate mobile number blocked with correct message');
        } else {
            console.error('❌ FAILED: Unexpected error for duplicate mobile:', error.response?.data || error.message);
        }
    }

    // 4. Test Duplicate GSTIN
    try {
        console.log('\n4. Testing Duplicate GSTIN...');
        const duplicateGstinData = {
            ...baseCompany,
            companyName: `Company ${uniqueSuffix}_Diff3`,
            mail: `user${uniqueSuffix}_diff3@example.com`,
            mobileNumber: `7${uniqueSuffix}789`,
            // gstin is same
        };
        await axios.post(`${API_URL}/company/register`, duplicateGstinData);
        console.error('❌ FAILED: Duplicate GSTIN should have been rejected');
    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.message.includes('GSTIN is already registered')) {
            console.log('✅ SUCCESS: Duplicate GSTIN blocked with correct message');
        } else {
            console.error('❌ FAILED: Unexpected error for duplicate GSTIN:', error.response?.data || error.message);
        }
    }

    console.log('\n--- Verification Complete ---');
}

verifyUniqueness();
