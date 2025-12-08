const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Warehouse = require('../models/Warehouse');
const User = require('../models/User');
const SupplyRequest = require('../models/SupplyRequest');
const Site = require('../models/Site'); // Make sure to import Site model



// Simplified auth middleware that just validates the user exists
// Updated validateUser middleware
const validateUser = async (req, res, next) => {
    // Check for userId in query params, body, or any other way you're sending it
    const userId = req.query.userId ||
        req.body.userId ||
        req.query.adminId ||
        req.body.adminId ||
        req.query.managerId ||
        req.body.managerId ||
        req.query.supervisorId ||  // Add this
        req.body.supervisorId;      // Add this

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid user' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// Routes using the simplified auth
router.get('/', validateUser, adminOnly, async (req, res) => {
    try {
        let query = { adminId: req.user._id };

        if (req.user.companyId) {
            query = { companyId: req.user.companyId };
        }

        // Admin sees warehouses for their company or created by them
        const warehouses = await Warehouse.find(query)
            .populate('managers', 'username');
        res.json({ success: true, data: warehouses });
    } catch (e) {
        console.error('Error fetching warehouses:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});



router.get('/supply-requests', validateUser, async (req, res) => {
    try {
        const { warehouseId, managerId } = req.query;

        console.log('Supply requests endpoint called with:', {
            warehouseId,
            managerId,
            userRole: req.user?.role,
            userId: req.user?._id
        });

        if (!warehouseId) {
            return res.status(400).json({ success: false, message: 'warehouseId is required' });
        }

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // Check authorization based on role
        if (req.user.role === 'admin') {
            // Admins can only see supply requests for their warehouses
            if (warehouse.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized for this warehouse' });
            }
        } else if (req.user.role === 'warehouse_manager') {
            // Warehouse managers can only see their assigned warehouse
            if (!warehouse.managers.includes(req.user._id)) {
                console.log('Authorization failed: Manager not in warehouse managers list');
                return res.status(403).json({ success: false, message: 'Not authorized for this warehouse' });
            }
        }

        const supplyRequests = await SupplyRequest.find({ warehouseId })
            .populate('warehouseId', 'warehouseName')
            .populate('siteId', 'siteName')
            .sort({ createdAt: -1 });

        console.log('Returning supply requests:', supplyRequests);
        res.json({ success: true, data: supplyRequests });
    } catch (e) {
        console.error('Supply requests endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Handle supply request approval
// Handle supply request approval
// Handle supply request approval - COMPLETE FIXED VERSION
// Handle supply request approval - WORKING VERSION
// Handle supply request approval - WITH PROPER PRICING
router.post('/supply-requests/:requestId/approve', validateUser, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { managerId, transferQuantity } = req.body;

        console.log('[APPROVE] Starting approval process...');
        console.log('[APPROVE] Request ID:', requestId);
        console.log('[APPROVE] Transfer Quantity:', transferQuantity);

        // Validate transferQuantity
        if (!transferQuantity || isNaN(transferQuantity) || Number(transferQuantity) <= 0) {
            return res.status(400).json({ success: false, message: 'A valid transferQuantity is required' });
        }

        // Find the supply request
        const supplyRequest = await SupplyRequest.findById(requestId);
        if (!supplyRequest) {
            return res.status(404).json({ success: false, message: 'Supply request not found' });
        }

        console.log('[APPROVE] Found supply request:', supplyRequest.itemName, supplyRequest.status);

        // Check if already processed
        if (supplyRequest.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Supply request already processed' });
        }

        // Find the warehouse
        const warehouse = await Warehouse.findById(supplyRequest.warehouseId);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        console.log('[APPROVE] Found warehouse:', warehouse.warehouseName);

        // Find the supply item in warehouse
        const supplyIndex = warehouse.supplies.findIndex(supply =>
            supply.itemName.toLowerCase().trim() === supplyRequest.itemName.toLowerCase().trim()
        );

        if (supplyIndex === -1) {
            console.log('[APPROVE] Item not found in warehouse:', supplyRequest.itemName);
            return res.status(404).json({ success: false, message: 'Item not found in warehouse' });
        }

        const warehouseSupply = warehouse.supplies[supplyIndex];
        console.log('[APPROVE] Found supply:', warehouseSupply.itemName, 'Available:', warehouseSupply.quantity);

        // Check if enough quantity is available
        if (warehouseSupply.quantity < Number(transferQuantity)) {
            return res.status(400).json({
                success: false,
                message: `Insufficient quantity. Available: ${warehouseSupply.quantity} ${warehouseSupply.unit}`
            });
        }

        // Update warehouse supply quantity
        const oldQuantity = warehouse.supplies[supplyIndex].quantity;
        warehouse.supplies[supplyIndex].quantity = Number(warehouse.supplies[supplyIndex].quantity) - Number(transferQuantity);

        console.log('[APPROVE] Updating warehouse quantity:', {
            oldQuantity,
            transferQuantity: Number(transferQuantity),
            newQuantity: warehouse.supplies[supplyIndex].quantity
        });

        // Find the site and add supply to it
        const site = await Site.findById(supplyRequest.siteId);
        if (!site) {
            console.log('[APPROVE] Site not found:', supplyRequest.siteId);
            return res.status(404).json({ success: false, message: 'Site not found' });
        }

        console.log('[APPROVE] Found site:', site.siteName);

        // Add or update supply in site WITH PROPER PRICING
        if (!site.supplies) site.supplies = [];

        const existingSiteSupplyIndex = site.supplies.findIndex(supply =>
            supply.itemName.toLowerCase().trim() === supplyRequest.itemName.toLowerCase().trim()
        );

        const warehousePrice = warehouseSupply.currentPrice || warehouseSupply.entryPrice || 0;

        if (existingSiteSupplyIndex >= 0) {
            // Update existing supply
            const existingSupply = site.supplies[existingSiteSupplyIndex];
            const oldSiteQuantity = existingSupply.quantity;
            existingSupply.quantity = Number(existingSupply.quantity) + Number(transferQuantity);

            // Update pricing if not already set or if warehouse price is different
            if (!existingSupply.cost || !existingSupply.isPriced || existingSupply.cost !== warehousePrice) {
                existingSupply.cost = warehousePrice;
                existingSupply.currentPrice = warehousePrice;
                existingSupply.isPriced = true;
                existingSupply.pricedBy = req.user._id;
                existingSupply.pricedByName = req.user.username;
                existingSupply.pricedAt = new Date();
            }

            console.log('[APPROVE] Updated existing site supply with pricing:', {
                item: supplyRequest.itemName,
                oldQuantity: oldSiteQuantity,
                addedQuantity: Number(transferQuantity),
                newQuantity: existingSupply.quantity,
                cost: existingSupply.cost,
                isPriced: existingSupply.isPriced
            });
        } else {
            // Add new supply to site with proper pricing
            const newSiteSupply = {
                itemName: supplyRequest.itemName,
                quantity: Number(transferQuantity),
                unit: supplyRequest.unit,
                // Set proper pricing from warehouse
                entryPrice: warehouseSupply.entryPrice || 0,
                currentPrice: warehousePrice,
                cost: warehousePrice, // This marks it as priced
                currency: warehouseSupply.currency || '₹',
                addedBy: req.user._id,
                addedAt: new Date(),
                // Mark as already priced
                isPriced: true,
                pricedBy: req.user._id,
                pricedByName: req.user.username,
                pricedAt: new Date()
            };

            site.supplies.push(newSiteSupply);

            console.log('[APPROVE] Added new supply to site with pricing:', {
                item: supplyRequest.itemName,
                quantity: Number(transferQuantity),
                unit: supplyRequest.unit,
                cost: warehousePrice,
                isPriced: true
            });
        }

        // Update supply request
        supplyRequest.status = 'approved';
        supplyRequest.transferredQuantity = Number(transferQuantity);
        supplyRequest.handledBy = req.user._id;
        supplyRequest.handledByName = req.user.username;
        supplyRequest.handledAt = new Date();

        if (!site.activityLogs) site.activityLogs = [];
        site.activityLogs.push({
            action: 'supply_request_approved',
            performedBy: req.user._id,
            performedByName: req.user.username,
            performedByRole: req.user.role,
            timestamp: new Date(),
            details: {
                itemName: supplyRequest.itemName,
                requestedQuantity: supplyRequest.requestedQuantity,
                transferredQuantity: Number(transferQuantity),
                unit: supplyRequest.unit,
                fromWarehouse: warehouse.warehouseName,
                handledBy: req.user.username,
                transferPrice: warehousePrice
            },
            description: `Supply request for ${transferQuantity} ${supplyRequest.unit} of "${supplyRequest.itemName}" approved by ${req.user.username}`
        });
        // Add activity log to warehouse
        if (!warehouse.activityLogs) warehouse.activityLogs = [];
        warehouse.activityLogs.push({
            action: 'supply_updated',
            performedBy: req.user._id,
            performedByName: req.user.username,
            performedByRole: req.user.role,
            timestamp: new Date(),
            details: {
                actionType: 'supply_request_approved',
                itemName: supplyRequest.itemName,
                requestedQuantity: supplyRequest.requestedQuantity,
                transferredQuantity: Number(transferQuantity),
                unit: supplyRequest.unit,
                requestedBySite: supplyRequest.siteName,
                remainingQuantity: warehouse.supplies[supplyIndex].quantity,
                transferPrice: warehousePrice
            },
            description: `${req.user.username} approved and transferred ${transferQuantity} ${supplyRequest.unit} of "${supplyRequest.itemName}" to ${supplyRequest.siteName} at ₹${warehousePrice} per ${supplyRequest.unit}`
        });

        // Save all documents
        console.log('[APPROVE] Saving all documents...');
        await Promise.all([
            supplyRequest.save(),
            warehouse.save(),
            site.save()
        ]);

        console.log('[APPROVE] Successfully completed transfer with pricing');

        res.json({
            success: true,
            message: `Successfully transferred ${transferQuantity} ${supplyRequest.unit} of ${supplyRequest.itemName} to ${site.siteName} at ₹${warehousePrice} per ${supplyRequest.unit}`,
            data: {
                transferredQuantity: Number(transferQuantity),
                remainingWarehouseQuantity: warehouse.supplies[supplyIndex].quantity,
                newSiteQuantity: existingSiteSupplyIndex >= 0 ?
                    site.supplies[existingSiteSupplyIndex].quantity :
                    Number(transferQuantity),
                transferPrice: warehousePrice
            }
        });

    } catch (error) {
        console.error('[APPROVE] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Handle supply request rejection
// Handle supply request rejection
router.post('/supply-requests/:requestId/reject', validateUser, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { managerId, reason } = req.body;

        // Find the supply request
        const supplyRequest = await SupplyRequest.findById(requestId);
        if (!supplyRequest) {
            return res.status(404).json({ success: false, message: 'Supply request not found' });
        }

        // Verify manager has access to this warehouse
        if (req.user.role === 'warehouse_manager' && req.user.warehouseId?.toString() !== supplyRequest.warehouseId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized for this warehouse' });
        }

        // Update supply request status
        supplyRequest.status = 'rejected';
        supplyRequest.handledBy = req.user._id;
        supplyRequest.handledByName = req.user.username;
        supplyRequest.handledAt = new Date();
        supplyRequest.reason = reason || 'No reason provided';

        await supplyRequest.save();

        // Add activity log to warehouse
        const warehouse = await Warehouse.findById(supplyRequest.warehouseId);
        if (warehouse) {
            if (!warehouse.activityLogs) warehouse.activityLogs = [];
            warehouse.activityLogs.push({
                action: 'supply_request_rejected',
                performedBy: req.user._id,
                performedByName: req.user.username,
                performedByRole: req.user.role,
                timestamp: new Date(),
                details: {
                    itemName: supplyRequest.itemName,
                    requestedQuantity: supplyRequest.requestedQuantity,
                    unit: supplyRequest.unit,
                    requestedBySite: supplyRequest.siteName,
                    reason: reason || 'No reason provided'
                },
                description: `${req.user.username} rejected supply request for ${supplyRequest.requestedQuantity} ${supplyRequest.unit} of "${supplyRequest.itemName}" from ${supplyRequest.siteName}`
            });
            await warehouse.save();
        }

        // Add activity log to site (for rejection)
        const site = await Site.findById(supplyRequest.siteId);
        if (site) {
            if (!site.activityLogs) site.activityLogs = [];
            site.activityLogs.push({
                action: 'supply_request_rejected',
                performedBy: req.user._id,
                performedByName: req.user.username,
                performedByRole: req.user.role,
                timestamp: new Date(),
                details: {
                    itemName: supplyRequest.itemName,
                    requestedQuantity: supplyRequest.requestedQuantity,
                    unit: supplyRequest.unit,
                    fromWarehouse: supplyRequest.warehouseName,
                    reason: reason || 'No reason provided',
                    rejectedBy: req.user.username
                },
                description: `Supply request for ${supplyRequest.requestedQuantity} ${supplyRequest.unit} of "${supplyRequest.itemName}" rejected by ${req.user.username}`
            });
            await site.save();
        }

        res.json({
            success: true,
            message: 'Supply request rejected successfully'
        });
    } catch (e) {
        console.error('Reject supply request error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/for-requests', validateUser, async (req, res) => {
    try {
        console.log('Warehouses for requests called by user:', req.user.role, req.user._id);

        // Only supervisors and admins can access this endpoint
        if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        let query = {};

        // For supervisors, show only warehouses created by their site's admin
        if (req.user.role === 'supervisor') {
            // Find the site this supervisor belongs to
            const site = await Site.findById(req.user.siteId);

            if (!site) {
                console.log('Supervisor site not found:', req.user.siteId);
                return res.status(403).json({
                    success: false,
                    message: 'Supervisor not properly linked to a site'
                });
            }

            // Supervisor sees warehouses where adminId matches their site's admin
            query.adminId = site.adminId;
            console.log('Supervisor accessing warehouses for admin:', site.adminId);
        }
        // For admins, show only their own warehouses
        else if (req.user.role === 'admin') {
            query.adminId = req.user._id;
        }

        const warehouses = await Warehouse.find(query)
            .select('warehouseName location supplies adminId');

        console.log(`Found ${warehouses.length} total warehouses for admin: ${query.adminId}`);

        // DON'T FILTER - Return ALL warehouses, even those with no supplies
        res.json({
            success: true,
            data: warehouses, // Return all warehouses directly
            message: `Found ${warehouses.length} warehouses`
        });

    } catch (error) {
        console.error('Warehouses for requests error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// In your GET /:warehouseId route, remove the .populate('manager', 'username') line
router.get('/:warehouseId', validateUser, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId)
            .populate('managers', 'username');

        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        // Authorization check based on role
        if (req.user.role === 'admin') {
            // Admins can only access their own warehouses
            if (warehouse.adminId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to access this warehouse' });
            }
        } else if (req.user.role === 'warehouse_manager') {
            // Warehouse managers can access their assigned warehouse
            if (!warehouse.managers.some(m => m._id.toString() === req.user._id.toString())) {
                return res.status(403).json({ success: false, message: 'Not authorized to access this warehouse' });
            }
        } else if (req.user.role === 'supervisor') {
            // For supervisors, find their site to get the adminId
            const Site = require('../models/Site');
            const supervisorSite = await Site.findOne({ supervisors: req.user._id });

            if (!supervisorSite) {
                return res.status(403).json({ success: false, message: 'Supervisor not assigned to any site' });
            }

            // Check if warehouse belongs to the same admin as the supervisor's site
            if (warehouse.adminId.toString() !== supervisorSite.adminId.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to access this warehouse' });
            }
        } else {
            return res.status(403).json({ success: false, message: 'Unauthorized role' });
        }

        res.json({ success: true, data: warehouse });
    } catch (e) {
        console.error('Error fetching warehouse:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/', validateUser, adminOnly, async (req, res) => {
    try {
        const { warehouseName, location, managerUsername, managerPassword } = req.body;

        if (!warehouseName || !managerUsername || !managerPassword)
            return res.status(400).json({ success: false, message: 'warehouseName, managerUsername, and managerPassword required' });

        const existing = await User.findOne({ username: managerUsername.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Manager username already exists' });

        // Create warehouse with adminId
        const warehouse = new Warehouse({
            warehouseName,
            location,
            managers: [],
            adminId: req.user._id, // This admin owns the warehouse
            companyId: req.user.companyId, // Add company association
            supplies: []
        });
        await warehouse.save();

        // Create the manager user with createdBy pointing to the admin
        const manager = new User({
            username: managerUsername.toLowerCase().trim(),
            password: managerPassword,
            role: 'warehouse_manager',
            warehouseId: warehouse._id,
            createdBy: req.user._id, // This admin created the manager
            companyId: req.user.companyId // Link manager to company
        });
        await manager.save();

        // Add manager to the managers array
        warehouse.managers.push(manager._id);
        await warehouse.save();

        res.status(201).json({ success: true, warehouse, manager });
    } catch (e) {
        console.error('Error creating warehouse:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/:warehouseId/supplies', validateUser, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        if (req.user.role !== 'admin' &&
            !(req.user.role === 'warehouse_manager' && req.user.warehouseId?.toString() === warehouse._id.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { itemName, quantity, unit, currency, entryPrice } = req.body;
        if (!itemName || !quantity || !unit || !currency || !entryPrice)
            return res.status(400).json({ success: false, message: 'itemName, quantity, unit, currency, entryPrice required' });

        warehouse.supplies.push({
            itemName, quantity, unit, currency, entryPrice,
            addedBy: req.user._id
        });
        await warehouse.save();

        res.status(201).json({ success: true, supplies: warehouse.supplies });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Keep your other routes with the same pattern...
router.get('/:warehouseId/managers', validateUser, adminOnly, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId).populate('managers', 'username');
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        res.json({ success: true, data: warehouse.managers });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.put('/:warehouseId/managers/:managerId/reset-password', validateUser, adminOnly, async (req, res) => {
    try {
        const { warehouseId, managerId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'newPassword is required' });
        }

        const manager = await User.findById(managerId);
        if (!manager || manager.role !== 'warehouse_manager' || manager.warehouseId.toString() !== warehouseId) {
            return res.status(404).json({ success: false, message: 'Manager not found' });
        }

        manager.password = newPassword;
        await manager.save();

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Add this route to your warehouse routes file
router.post('/:warehouseId/supplies/bulk-import', validateUser, async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { supplies, currency } = req.body;

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' &&
            !(req.user.role === 'warehouse_manager' && req.user.warehouseId?.toString() === warehouse._id.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Validate supplies array
        if (!supplies || !Array.isArray(supplies) || supplies.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid supplies data' });
        }

        // Additional validation: Check maximum import size to prevent abuse
        const MAX_IMPORT_SIZE = 1000;
        if (supplies.length > MAX_IMPORT_SIZE) {
            return res.status(400).json({
                success: false,
                message: `Too many items. Maximum ${MAX_IMPORT_SIZE} items allowed per import.`
            });
        }

        // Normalize item name function
        const normalizeItemName = (name) => {
            if (!name) return '';

            // Convert to lowercase and trim
            let normalized = name.toLowerCase().trim();

            // Remove common plural endings
            if (normalized.endsWith('oes')) {
                // handles: tomatoes -> tomat, potatoes -> potat, mangoes -> mang
                normalized = normalized.slice(0, -3) + 'o';
            } else if (normalized.endsWith('ies')) {
                // handles: strawberries -> strawberry, cherries -> cherry
                normalized = normalized.slice(0, -3) + 'y';
            } else if (normalized.endsWith('ves')) {
                // handles: leaves -> leaf, loaves -> loaf
                normalized = normalized.slice(0, -3) + 'f';
            } else if (normalized.endsWith('es') && !normalized.endsWith('oes')) {
                // handles: oranges -> orange, boxes -> box
                // but not: tomatoes (already handled)
                normalized = normalized.slice(0, -2);
            } else if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('us')) {
                // handles: apples -> apple, bananas -> banana
                // but not: grass, citrus
                normalized = normalized.slice(0, -1);
            }

            // Remove common variations
            normalized = normalized
                .replace(/\s+/g, ' ') // multiple spaces to single space
                .replace(/[-_]/g, ' ') // hyphens and underscores to spaces
                .replace(/['"]/g, ''); // remove quotes

            return normalized;
        };

        const results = {
            created: [],
            updated: [],
            errors: [],
            needsPricing: 0,
            duplicatesInFile: 0
        };

        const activityLogs = [];

        // Build map of existing supplies with normalized names
        const existingSuppliesMap = new Map();
        warehouse.supplies.forEach(supply => {
            const normalizedName = normalizeItemName(supply.itemName);
            existingSuppliesMap.set(normalizedName, supply);
        });

        // Track items already processed in this import to handle duplicates
        const processedInImport = new Map();

        // First pass: validate and deduplicate within the import
        for (const [index, importedSupply] of supplies.entries()) {
            try {
                // Enhanced validation
                if (!importedSupply.itemName || importedSupply.itemName.trim() === '') {
                    results.errors.push({
                        row: index + 2, // +2 for header and 1-based indexing
                        itemName: 'Unknown',
                        error: 'Missing item name'
                    });
                    continue;
                }

                if (importedSupply.quantity === undefined ||
                    importedSupply.quantity === null ||
                    importedSupply.quantity === '') {
                    results.errors.push({
                        row: index + 2,
                        itemName: importedSupply.itemName,
                        error: 'Missing quantity'
                    });
                    continue;
                }

                const quantity = parseFloat(importedSupply.quantity);
                if (isNaN(quantity) || quantity <= 0) {
                    results.errors.push({
                        row: index + 2,
                        itemName: importedSupply.itemName,
                        error: 'Invalid quantity: must be a positive number'
                    });
                    continue;
                }

                // Since frontend now requires price, validate it
                if (importedSupply.currentPrice === undefined ||
                    importedSupply.currentPrice === null ||
                    importedSupply.currentPrice === '') {
                    results.errors.push({
                        row: index + 2,
                        itemName: importedSupply.itemName,
                        error: 'Missing price'
                    });
                    continue;
                }

                const price = parseFloat(importedSupply.currentPrice);
                if (isNaN(price) || price < 0) {
                    results.errors.push({
                        row: index + 2,
                        itemName: importedSupply.itemName,
                        error: 'Invalid price: must be 0 or positive number'
                    });
                    continue;
                }

                const normalizedName = normalizeItemName(importedSupply.itemName);

                // Check for duplicates within the import file
                if (processedInImport.has(normalizedName)) {
                    // Aggregate quantities for duplicates in the same import
                    const existing = processedInImport.get(normalizedName);
                    existing.quantity += quantity;
                    if (price > existing.currentPrice) {
                        existing.currentPrice = price;
                    }
                    results.duplicatesInFile++;
                } else {
                    processedInImport.set(normalizedName, {
                        itemName: importedSupply.itemName.trim(),
                        quantity: quantity,
                        unit: importedSupply.unit || 'pcs',
                        currentPrice: price
                    });
                }
            } catch (error) {
                console.error(`Error validating supply at row ${index + 2}:`, error);
                results.errors.push({
                    row: index + 2,
                    itemName: importedSupply.itemName || 'Unknown',
                    error: error.message
                });
            }
        }

        // Second pass: process the deduplicated items
        for (const [normalizedName, importData] of processedInImport) {
            try {
                const existingSupply = existingSuppliesMap.get(normalizedName);

                if (existingSupply) {
                    // Update existing supply
                    const oldQuantity = existingSupply.quantity;
                    const addedQuantity = importData.quantity;
                    const wasNameDifferent = existingSupply.itemName !== importData.itemName;

                    existingSupply.quantity = oldQuantity + addedQuantity;
                    existingSupply.currentPrice = importData.currentPrice;
                    existingSupply.currency = currency || existingSupply.currency;

                    results.updated.push({
                        itemName: existingSupply.itemName,
                        importedName: importData.itemName,
                        wasNameDifferent: wasNameDifferent,
                        oldQuantity: oldQuantity,
                        addedQuantity: addedQuantity,
                        newQuantity: existingSupply.quantity,
                        unit: existingSupply.unit,
                        priceUpdated: true,
                        newPrice: importData.currentPrice
                    });

                    activityLogs.push({
                        action: 'supply_updated',
                        performedBy: req.user._id,
                        performedByName: req.user.username,
                        performedByRole: req.user.role,
                        timestamp: new Date(),
                        details: {
                            supplyId: existingSupply._id,
                            itemName: existingSupply.itemName,
                            importedName: wasNameDifferent ? importData.itemName : null,
                            oldQuantity: oldQuantity,
                            addedQuantity: addedQuantity,
                            newQuantity: existingSupply.quantity,
                            unit: existingSupply.unit,
                            updateMethod: 'bulk_import',
                            priceUpdated: true,
                            newPrice: importData.currentPrice
                        },
                        description: `${req.user.username} updated "${existingSupply.itemName}" via bulk import: quantity ${oldQuantity} → ${existingSupply.quantity} ${existingSupply.unit}, price updated to ${currency || existingSupply.currency}${importData.currentPrice}${wasNameDifferent ? ` (imported as "${importData.itemName}")` : ''}`
                    });
                } else {
                    // Create new supply
                    const newSupply = {
                        itemName: importData.itemName,
                        quantity: importData.quantity,
                        unit: importData.unit,
                        currency: currency || '₹',
                        entryPrice: importData.currentPrice,
                        currentPrice: importData.currentPrice,
                        addedBy: req.user._id,
                        createdAt: new Date()
                    };

                    warehouse.supplies.push(newSupply);

                    if (importData.currentPrice === 0) {
                        results.needsPricing++;
                    }

                    results.created.push({
                        itemName: newSupply.itemName,
                        quantity: newSupply.quantity,
                        unit: newSupply.unit,
                        hasPrice: importData.currentPrice > 0,
                        price: importData.currentPrice
                    });

                    activityLogs.push({
                        action: 'supply_added',
                        performedBy: req.user._id,
                        performedByName: req.user.username,
                        performedByRole: req.user.role,
                        timestamp: new Date(),
                        details: {
                            itemName: newSupply.itemName,
                            quantity: newSupply.quantity,
                            unit: newSupply.unit,
                            price: newSupply.entryPrice,
                            currency: newSupply.currency,
                            addMethod: 'bulk_import'
                        },
                        description: `${req.user.username} added "${newSupply.itemName}" via bulk import: ${newSupply.quantity} ${newSupply.unit} at ${newSupply.currency}${newSupply.entryPrice}`
                    });
                }
            } catch (error) {
                console.error(`Error processing supply ${importData.itemName}:`, error);
                results.errors.push({
                    itemName: importData.itemName,
                    error: error.message
                });
            }
        }

        // Add activity logs
        if (activityLogs.length > 0) {
            if (!warehouse.activityLogs) warehouse.activityLogs = [];
            warehouse.activityLogs.push(...activityLogs);

            // Add summary log
            const summaryMessage = results.duplicatesInFile > 0
                ? `${req.user.username} bulk imported ${supplies.length} supplies (${results.duplicatesInFile} duplicates merged): ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors${results.needsPricing > 0 ? `, ${results.needsPricing} items with zero price` : ''}`
                : `${req.user.username} bulk imported ${supplies.length} supplies: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors${results.needsPricing > 0 ? `, ${results.needsPricing} items with zero price` : ''}`;

            warehouse.activityLogs.push({
                action: 'supply_added',
                performedBy: req.user._id,
                performedByName: req.user.username,
                performedByRole: req.user.role,
                timestamp: new Date(),
                details: {
                    isBulkImport: true,
                    totalImported: supplies.length,
                    created: results.created.length,
                    updated: results.updated.length,
                    errors: results.errors.length,
                    duplicatesInFile: results.duplicatesInFile,
                    needsPricing: results.needsPricing,
                    importSummary: {
                        createdItems: results.created,
                        updatedItems: results.updated,
                        failedItems: results.errors
                    }
                },
                description: summaryMessage
            });
        }

        // Save warehouse
        await warehouse.save();

        res.status(200).json({
            success: true,
            message: `Import completed: ${results.created.length} created, ${results.updated.length} updated${results.duplicatesInFile > 0 ? `, ${results.duplicatesInFile} duplicates merged` : ''}, ${results.errors.length} errors`,
            data: warehouse,
            importResults: results
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import supplies',
            error: error.message
        });
    }
});

router.delete('/:warehouseId/managers/:managerId', validateUser, adminOnly, async (req, res) => {
    try {
        const { warehouseId, managerId } = req.params;

        // Remove manager from warehouse managers array
        const warehouse = await Warehouse.findByIdAndUpdate(
            warehouseId,
            { $pull: { managers: managerId } },
            { new: true }
        );

        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // Delete the user document
        await User.deleteOne({ _id: managerId, role: 'warehouse_manager', warehouseId });

        res.json({ success: true, message: 'Manager removed successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Add this route BEFORE the /:warehouseId route in your warehouse routes file

// Replace your existing DELETE /:warehouseId route with this safe version
router.delete('/:warehouseId', validateUser, adminOnly, async (req, res) => {
    try {
        const { warehouseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            return res.status(400).json({ success: false, message: 'Invalid warehouse id' });
        }

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // LOG the full warehouse object so you can inspect fields present in DB
        console.log('DELETE /warehouses/:warehouseId - warehouse object:', JSON.stringify(warehouse, null, 2));

        // Try multiple possible owner fields safely
        const ownerCandidate = (
            (warehouse.createdBy && typeof warehouse.createdBy.toString === 'function' && warehouse.createdBy.toString()) ||
            (warehouse.adminId && typeof warehouse.adminId.toString === 'function' && warehouse.adminId.toString()) ||
            (warehouse.admin && typeof warehouse.admin.toString === 'function' && warehouse.admin.toString()) ||
            null
        );

        if (!ownerCandidate) {
            console.warn(`Warehouse ${warehouseId} is missing owner metadata (createdBy/adminId/admin)`);
            return res.status(500).json({
                success: false,
                message: 'Warehouse owner metadata missing. Contact support.'
            });
        }

        const requesterId = req.user && req.user._id ? req.user._id.toString() : null;
        if (!requesterId) {
            return res.status(401).json({ success: false, message: 'Requester not authenticated' });
        }

        if (ownerCandidate !== requesterId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this warehouse' });
        }

        // Delete warehouse managers and the warehouse
        await User.deleteMany({
            role: 'warehouse_manager',
            warehouseId: warehouseId
        });

        await Warehouse.findByIdAndDelete(warehouseId);

        return res.json({ success: true, message: 'Warehouse and all its managers deleted successfully' });
    } catch (e) {
        console.error('Delete warehouse error:', e);
        return res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
});

router.delete('/:warehouseId', validateUser, adminOnly, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // Verify the admin owns this warehouse
        if (warehouse.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this warehouse' });
        }

        // Delete all managers of this warehouse
        await User.deleteMany({
            role: 'warehouse_manager',
            warehouseId: req.params.warehouseId
        });

        // Delete the warehouse
        await Warehouse.findByIdAndDelete(req.params.warehouseId);

        res.json({ success: true, message: 'Warehouse and all its managers deleted successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Add these to your warehouse routes file

// Update supply details (warehouse manager only)
router.put('/:warehouseId/supplies/:supplyId', validateUser, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        if (req.user.role !== 'admin' &&
            !(req.user.role === 'warehouse_manager' && req.user.warehouseId?.toString() === warehouse._id.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const supply = warehouse.supplies.id(req.params.supplyId);
        if (!supply) {
            return res.status(404).json({ success: false, message: 'Supply not found' });
        }

        // Update supply details
        if (req.body.itemName) supply.itemName = req.body.itemName;
        if (req.body.quantity) supply.quantity = req.body.quantity;
        if (req.body.unit) supply.unit = req.body.unit;
        if (req.body.currency) supply.currency = req.body.currency;

        // Entry price can only be set once
        if (req.body.entryPrice && !supply.entryPrice) {
            supply.entryPrice = req.body.entryPrice;
        }

        await warehouse.save();

        res.json({ success: true, supplies: warehouse.supplies });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Add a new manager to an existing warehouse
router.post('/:warehouseId/managers', validateUser, adminOnly, async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'username and password are required' });
        }

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        const existing = await User.findOne({ username: username.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Manager username already exists' });
        }

        const manager = new User({
            username: username.toLowerCase().trim(),
            password,
            role: 'warehouse_manager',
            warehouseId: warehouse._id
        });
        await manager.save();

        // Push new manager into the managers array
        warehouse.managers.push(manager._id);
        await warehouse.save();

        res.status(201).json({
            success: true,
            message: 'Warehouse manager created successfully',
            data: { id: manager._id, username: manager.username }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update current price (warehouse manager only)
router.put('/:warehouseId/supplies/:supplyId/price', validateUser, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        if (req.user.role !== 'admin' &&
            !(req.user.role === 'warehouse_manager' && req.user.warehouseId?.toString() === warehouse._id.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const supply = warehouse.supplies.id(req.params.supplyId);
        if (!supply) {
            return res.status(404).json({ success: false, message: 'Supply not found' });
        }

        supply.currentPrice = req.body.currentPrice;
        if (req.body.currency) supply.currency = req.body.currency;

        await warehouse.save();

        res.json({ success: true, supplies: warehouse.supplies });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete supply
router.delete('/:warehouseId/supplies/:supplyId', validateUser, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        if (req.user.role !== 'admin' &&
            !(req.user.role === 'warehouse_manager' && req.user.warehouseId?.toString() === warehouse._id.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        warehouse.supplies.pull(req.params.supplyId);
        await warehouse.save();

        res.json({ success: true, supplies: warehouse.supplies });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get warehouse reports
router.get('/:warehouseId/reports', validateUser, async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.warehouseId);
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

        // Get recent approved transfers (supply requests)
        const recentTransfers = await SupplyRequest.find({
            warehouseId: req.params.warehouseId,
            status: 'approved',
            transferredQuantity: { $gt: 0 }
        })
            .sort({ handledAt: -1 })
            .limit(10);

        // Get total approved transfers count
        const totalTransfers = await SupplyRequest.countDocuments({
            warehouseId: req.params.warehouseId,
            status: 'approved',
            transferredQuantity: { $gt: 0 }
        });

        // Get monthly transfer statistics for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTransfers = await SupplyRequest.aggregate([
            {
                $match: {
                    warehouseId: new mongoose.Types.ObjectId(req.params.warehouseId),
                    status: 'approved',
                    transferredQuantity: { $gt: 0 },
                    handledAt: { $gte: sixMonthsAgo, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$handledAt" },
                        month: { $month: "$handledAt" }
                    },
                    transfers: { $sum: 1 },
                    totalQuantity: { $sum: "$transferredQuantity" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        // Format monthly transfers data
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedMonthlyTransfers = monthlyTransfers.map(item => ({
            month: monthNames[item._id.month - 1],
            year: item._id.year,
            transfers: item.transfers,
            value: item.totalQuantity
        }));

        // Fill in missing months with zero values
        const allMonths = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = monthNames[date.getMonth()];
            const year = date.getFullYear();

            const monthData = formattedMonthlyTransfers.find(
                m => m.month === monthName && m.year === year
            );

            allMonths.push(monthData || {
                month: monthName,
                transfers: 0,
                value: 0
            });
        }

        // Calculate transfer values for recent transfers
        const recentTransfersWithValue = recentTransfers.map(transfer => {
            // Find the supply item to get its price
            const supply = warehouse.supplies.find(s => s.itemName === transfer.itemName);
            const unitPrice = supply ? (supply.currentPrice || supply.entryPrice || 0) : 0;
            const value = transfer.transferredQuantity * unitPrice;

            return {
                id: transfer._id,
                itemName: transfer.itemName,
                quantity: transfer.transferredQuantity,
                unit: transfer.unit,
                transferredTo: transfer.siteName,
                date: transfer.handledAt || transfer.createdAt,
                value: value,
                requestedBy: transfer.requestedByName,
                handledBy: transfer.handledByName || 'N/A'
            };
        });

        // Calculate total value of warehouse supplies
        const totalValue = warehouse.supplies.reduce((sum, s) =>
            sum + (s.quantity * (s.currentPrice || s.entryPrice || 0)), 0
        );

        // Get top transferred items (optional - for additional insights)
        const topTransferredItems = await SupplyRequest.aggregate([
            {
                $match: {
                    warehouseId: new mongoose.Types.ObjectId(req.params.warehouseId),
                    status: 'approved',
                    transferredQuantity: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: "$itemName",
                    totalTransferred: { $sum: "$transferredQuantity" },
                    transferCount: { $sum: 1 },
                    unit: { $first: "$unit" }
                }
            },
            {
                $sort: { totalTransferred: -1 }
            },
            {
                $limit: 5
            }
        ]);

        // Prepare the final reports data
        const reports = {
            totalSupplies: warehouse.supplies.length,
            totalValue: totalValue,
            totalTransfers: totalTransfers,
            recentTransfers: recentTransfersWithValue,
            supplySummary: warehouse.supplies.map(supply => ({
                _id: supply._id,
                itemName: supply.itemName,
                quantity: supply.quantity,
                unit: supply.unit,
                currentPrice: supply.currentPrice || supply.entryPrice || 0,
                totalValue: supply.quantity * (supply.currentPrice || supply.entryPrice || 0)
            })),
            monthlyTransfers: allMonths,
            topTransferredItems: topTransferredItems // Optional additional data
        };

        res.json({ success: true, data: reports });
    } catch (e) {
        console.error('Reports error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;