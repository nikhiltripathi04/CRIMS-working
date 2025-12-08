// models/Warehouse.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'supply_added',
            'supply_updated',
            'supply_deleted',
            "supply_requested",
            'supply_transferred',
            'supply_request_approved',    // Add this
            'supply_request_rejected',
            'manager_added',
            'manager_password_reset',
            'warehouse_created',
            'warehouse_updated'
        ]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    performedByName: {
        type: String,
        required: true
    },
    performedByRole: {
        type: String,
        required: true,
        enum: ['admin', 'warehouse_manager']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });


const warehouseSupplySchema = new mongoose.Schema({
    itemName: String,
    quantity: Number,
    unit: String,
    currency: String,
    entryPrice: Number, // Original price when added
    currentPrice: Number, // Current market price (can be updated)
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });


const warehouseSchema = new mongoose.Schema({
    warehouseName: { type: String, required: true },
    location: String,
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    adminId: { // Add this to track which admin owns this warehouse
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    supplies: [warehouseSupplySchema],
    activityLogs: [activityLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);