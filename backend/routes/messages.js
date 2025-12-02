const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Site = require('../models/Site');
const User = require('../models/User'); // Admin
const { auth } = require('../middleware/auth');

// Send a message (Supervisor -> Admin)
router.post('/send', auth, async (req, res) => {
    try {
        if (req.user.role !== 'supervisor') {
            return res.status(403).json({ message: 'Only supervisors can send messages' });
        }

        const { siteId, content, videoUrl } = req.body;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        if (!content && !videoUrl) {
            return res.status(400).json({ message: 'Message must contain text or video' });
        }

        // Find the Site to get the Admin ID
        const site = await Site.findById(siteId);
        if (!site) {
            return res.status(404).json({ message: 'Site not found' });
        }

        // The recipient is the Admin of the site
        const adminId = site.adminId;

        const message = new Message({
            sender: req.user._id,
            senderName: req.user.username,
            senderRole: 'supervisor',
            recipient: adminId,
            siteId: site._id,
            siteName: site.siteName,
            content: content || '',
            videoUrl: videoUrl || null
        });

        await message.save();

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: message
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get messages sent by a specific user (Supervisor)
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;

        const messages = await Message.find({ sender: userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get messages for a specific Site (For Admin or Supervisor)
router.get('/site/:siteId', auth, async (req, res) => {
    try {
        const { siteId } = req.params;

        // Simple query: Get all messages related to this site
        // You might want to add pagination here later
        const messages = await Message.find({ siteId })
            .sort({ createdAt: -1 }); // Newest first

        res.json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;