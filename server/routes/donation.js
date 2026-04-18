const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Razorpay = require('razorpay');
const Donation = require('../models/Donation');
const DonationRequest = require('../models/DonationRequest');
const { authMiddleware } = require('../middleware/authMiddleware');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy'
});

// Generate QR Code for a request
router.get('/qr/:id', async (req, res) => {
    try {
        const url = `http://localhost:5000/api/donations/donate/${req.params.id}`;
        const qrCodeImage = await QRCode.toDataURL(url);
        res.json({ qrCode: qrCodeImage });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Create Razorpay Order
router.post('/order', authMiddleware, async (req, res) => {
    try {
        const { amount, requestId } = req.body;
        
        // Mock order creation for sandbox if keys are not set
        if (process.env.RAZORPAY_KEY_ID === 'YOUR_KEY_ID' || !process.env.RAZORPAY_KEY_ID) {
            return res.json({
                mock: true,
                order: {
                    id: 'order_' + Math.random().toString(36).substring(7),
                    amount: amount * 100,
                    currency: 'INR'
                }
            });
        }

        const options = {
            amount: amount * 100, // amount in smallest currency unit
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json({ mock: false, order });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Verify and record donation
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { requestId, amount, paymentId, status } = req.body;

        const donation = new Donation({
            donor: req.user.id,
            request: requestId,
            amount: amount,
            paymentId: paymentId || 'mock_payment',
            status: status || 'success'
        });

        await donation.save();

        if (status !== 'failed') {
            await DonationRequest.findByIdAndUpdate(requestId, {
                $inc: { collectedAmount: amount }
            });
        }

        res.json({ msg: 'Donation recorded successfully', donation });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get user donations
router.get('/my/history', authMiddleware, async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.user.id }).populate('request', 'title category');
        res.json(donations);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
