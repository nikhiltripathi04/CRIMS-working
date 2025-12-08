const mongoose = require('mongoose');

async function testModels() {
    try {
        console.log('Testing Company...');
        require('./models/Company');
        console.log('Company OK');

        console.log('Testing ActivityLog...');
        require('./models/ActivityLog');
        console.log('ActivityLog OK');

        console.log('Testing User...');
        require('./models/User');
        console.log('User OK');

        console.log('Testing Site...');
        require('./models/Site');
        console.log('Site OK');

    } catch (error) {
        console.error('❌ Error in model:', error);
    }
}

testModels();
