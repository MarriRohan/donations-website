const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationRequest', required: true },
    amount: { type: Number, required: true },
    paymentId: { type: String },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
