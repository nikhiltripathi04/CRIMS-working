const express = require('express'); // Trigger restart
const router = express.Router();
const Message = require('../models/Message');
const Site = require('../models/Site');
const User = require('../models/User'); // Admin
const { auth } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinaryConfig');
// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'crims_videos') => {
    return new Promise((resolve, reject) => {
        // resource_type: "auto" handles both images and videos
        const stream = cloudinary.uploader.upload_stream(
            { folder: folder, resource_type: "auto" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
};

// Send a message (Supervisor -> Admin)
router.post('/send', auth, upload.single('video'), async (req, res) => {
    try {
        if (req.user.role !== 'supervisor') {
            return res.status(403).json({ message: 'Only supervisors can send messages' });
        }

        const { siteId, content } = req.body;
        let videoUrl = req.body.videoUrl;

        // Manual upload if file is present
        if (req.file) {
            console.log('File detected. Starting manual upload to Cloudinary...');
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                console.log('Upload successful:', result.secure_url);
                videoUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error details:', uploadError);
                return res.status(500).json({ message: 'Video upload failed', error: uploadError.message });
            }
        } else {
            console.log('No file received in request.');
        }

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

// Get ALL messages for an Admin (from all their sites)
router.get('/admin/all', auth, async (req, res) => {
    try {
        // 1. Find all sites managed by this admin
        const sites = await Site.find({ adminId: req.user._id });
        const siteIds = sites.map(site => site._id);

        // 2. Find all messages linked to these sites
        const messages = await Message.find({ siteId: { $in: siteIds } })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        console.error('Fetch all messages error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;