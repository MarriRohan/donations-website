const express = require('express');
const router = express.Router();
const DonationRequest = require('../models/DonationRequest');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Get all approved requests (Public but can be protected)
router.get('/', async (req, res) => {
    try {
        const { category, state } = req.query;
        let query = { status: 'approved' };
        if (category) query.category = category;
        if (state) query['location.state'] = state;

        const requests = await DonationRequest.find(query).populate('user', 'name');
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get single request
router.get('/:id', async (req, res) => {
    try {
        const request = await DonationRequest.findById(req.params.id).populate('user', 'name');
        if (!request) return res.status(404).json({ msg: 'Request not found' });
        res.json(request);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Create a new request (Needy only)
router.post('/', authMiddleware, roleMiddleware(['needy']), async (req, res) => {
    try {
        const { title, description, requiredAmount, state, city, category, proofDocuments } = req.body;

        const newRequest = new DonationRequest({
            user: req.user.id,
            title,
            description,
            requiredAmount,
            location: { state, city },
            category,
            proofDocuments
        });

        await newRequest.save();
        res.json({ msg: 'Request created successfully and is pending admin approval', request: newRequest });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Needy gets their own requests
router.get('/my/requests', authMiddleware, roleMiddleware(['needy']), async (req, res) => {
    try {
        const requests = await DonationRequest.find({ user: req.user.id });
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
