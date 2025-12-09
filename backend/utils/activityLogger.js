const Site = require('../models/Site');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog'); // Import centralized model
const mongoose = require('mongoose');

class ActivityLogger {
  static async logActivity(targetId, action, performedBy, details, description, targetModel = 'Site') {
    try {
      let target;

      // Dynamic target lookup
      if (targetModel === 'Site') {
        target = await Site.findById(targetId);
      } else if (targetModel === 'Warehouse') {
        const Warehouse = require('../models/Warehouse');
        target = await Warehouse.findById(targetId);
      } else if (targetModel === 'User') {
        const User = require('../models/User');
        target = await User.findById(targetId);
      }

      if (!target && targetModel !== 'User') {
        // It's possible for User to be deleted, but we still want to log if possible.
        // For Site/Warehouse, we generally expect them to exist to append logs, 
        // unless it's a deletion event, in which case targetId might be valid but doc gone.
        // But usually we log BEFORE deletion or we handle deletion separately.
        // For now, if target is missing and we rely on it for companyId, we might have issues.
        console.warn(`Target ${targetModel} not found for ID: ${targetId}, proceeding with caution.`);
      }

      let userId, username, userRole;

      if (!performedBy) {
        userId = null;
        username = 'System';
        userRole = 'system';
      } else if (performedBy.username && (performedBy._id || performedBy.id)) {
        // It's a User object
        userId = performedBy._id || performedBy.id;
        username = performedBy.username || 'Unknown User';
        userRole = performedBy.role || 'admin';
      } else {
        // Assume it's an ID (String or ObjectId)
        // Convert to string to handle ObjectId objects safely
        const identifier = performedBy.toString();

        const user = await User.findOne({
          $or: [
            { username: identifier },
            // Only query by _id if it's a valid ObjectId
            ...(mongoose.isValidObjectId(identifier) ? [{ _id: identifier }] : [])
          ]
        });

        if (user) {
          userId = user._id;
          username = user.username;
          userRole = user.role;
        } else {
          // Fallback if user not found but we have an ID string
          userId = mongoose.isValidObjectId(identifier) ? identifier : null;
          username = identifier; // e.g. "System" or legacy username string
          userRole = 'admin';
        }
      }

      console.log(`🔍 Logging activity for ${targetModel}: ${description}`);

      const logEntry = {
        action,
        performedBy: userId,
        performedByName: username,
        performedByRole: userRole,
        timestamp: new Date(),
        details: {
          ...details,
          // Store currency if it's a pricing-related action
          currency: details && details.currency ? details.currency : '₹'
        },
        description
      };

      if (!userId) {
        delete logEntry.performedBy;
      }

      // Add to target's embedded logs if supported
      if (target && target.activityLogs && Array.isArray(target.activityLogs)) {
        target.activityLogs.push(logEntry);
        await target.save();
      }

      // NEW: Log to centralized ActivityLog model
      try {
        // Attempt to find companyId
        let companyId = null;

        if (target && target.companyId) {
          companyId = target.companyId;
        } else if (userId) {
          // If target doesn't have companyId, maybe the performing user does
          const performer = await User.findById(userId);
          if (performer && performer.companyId) {
            companyId = performer.companyId;
          }
        }

        if (companyId) {
          const centralizedLog = new ActivityLog({
            companyId: companyId,
            action,
            performedBy: userId,
            performedByName: username,
            performedByRole: userRole,
            targetId: targetId,
            targetModel: targetModel,
            details: logEntry.details,
            timestamp: logEntry.timestamp
          });
          await centralizedLog.save();
          console.log('📝 Centralized activity logged');
        } else {
          console.warn('⚠️ Could not determine companyId, skipping centralized log');
        }
      } catch (centralLogErr) {
        console.error('❌ Failed to log centralized activity:', centralLogErr.message);
      }

      console.log(`📝 Activity logged: ${description}`);
      return logEntry;
    } catch (error) {
      console.error('❌ Failed to log activity:', error.message);
      return null;
    }
  }

  static async getActivityLogs(siteId, limit = 50) {
    try {
      const site = await Site.findById(siteId).populate('activityLogs.performedBy', 'username role');
      if (!site) {
        throw new Error('Site not found');
      }

      // Sort by timestamp (newest first) and limit results
      const logs = site.activityLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return logs;
    } catch (error) {
      console.error('❌ Failed to get activity logs:', error.message);
      return [];
    }
  }

  static async getActivityLogsByType(siteId, action, limit = 20) {
    try {
      const site = await Site.findById(siteId);
      if (!site) {
        throw new Error('Site not found');
      }

      const logs = site.activityLogs
        .filter(log => log.action === action)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return logs;
    } catch (error) {
      console.error('❌ Failed to get activity logs by type:', error.message);
      return [];
    }
  }
}

module.exports = ActivityLogger;