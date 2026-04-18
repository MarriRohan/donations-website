const express = require('express');
const router = express.Router();
const DonationRequest = require('../models/DonationRequest');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Get all pending requests
router.get('/requests/pending', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const requests = await DonationRequest.find({ status: 'pending' }).populate('user', 'name email');
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Approve or reject a request
router.put('/requests/:id/status', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ msg: 'Invalid status' });
        }

        const request = await DonationRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!request) return res.status(404).json({ msg: 'Request not found' });

        res.json({ msg: `Request ${status} successfully`, request });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
