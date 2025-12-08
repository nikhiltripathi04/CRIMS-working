const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// models/User.js
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: function () { return this.role === 'admin' || this.role === 'company_owner'; }, // Required for admin & owner
        unique: true,
        sparse: true
    },
    phoneNumber: {
        type: String,
        required: function () { return this.role === 'admin' || this.role === 'company_owner'; }
    },
    firmName: {
        type: String,
        required: false
    },
    firstName: {
        type: String,
        required: function () { return this.role === 'admin' || this.role === 'company_owner'; }
    },
    lastName: {
        type: String,
        required: function () { return this.role === 'admin' || this.role === 'company_owner'; }
    },
    fullName: {
        type: String,
        required: function () { return this.role === 'staff'; }
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: function () { return this.role !== 'superadmin'; }
    },
    role: {
        type: String,
        enum: ['admin', 'supervisor', 'warehouse_manager', 'staff', 'company_owner'],
        required: true
    },
    assignedSites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site'
    }],
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: function () { return this.role === 'warehouse_manager'; }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash the password if it's modified (or new)
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
