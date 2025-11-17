const Site = require('../models/Site');
const User = require('../models/User');

class ActivityLogger {
  static async logActivity(siteId, action, performedBy, details, description) {
    try {
      const site = await Site.findById(siteId);
      if (!site) {
        throw new Error('Site not found');
      }

      let userId, username, userRole;

      if (!performedBy) {
        userId = null;
        username = 'System';
        userRole = 'system';
      } else if (typeof performedBy === 'string') {
        const user = await User.findOne({
          $or: [
            { username: performedBy },
            { _id: performedBy }
          ]
        });

        if (user) {
          userId = user._id;
          username = user.username;
          userRole = user.role;
        } else {
          userId = null;
          username = performedBy;
          userRole = 'admin';
        }
      } else if (performedBy && (performedBy.id || performedBy._id)) {
        userId = performedBy._id || performedBy.id;
        username = performedBy.username || 'Unknown User';
        userRole = performedBy.role || 'admin';
      } else {
        userId = null;
        username = 'Unknown User';
        userRole = 'admin';
      }

      console.log(`🔍 Logging activity with user: ${username} (${userRole})`);

      const logEntry = {
        action,
        performedBy: userId,
        performedByName: username,
        performedByRole: userRole,
        timestamp: new Date(),
        details: {
          ...details,
          // Store currency if it's a pricing-related action
          currency: details.currency || '₹'
        },
        description
      };

      if (!userId) {
        delete logEntry.performedBy;
      }

      site.activityLogs.push(logEntry);
      await site.save();

      console.log(`📝 Activity logged: ${description}`);
      return logEntry;
    } catch (error) {
      console.error('❌ Failed to log activity:', error.message);
      return null;
    }
  }

  // ... rest of your existing methods ...

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