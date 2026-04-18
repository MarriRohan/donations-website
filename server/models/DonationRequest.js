const mongoose = require('mongoose');

const DonationRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requiredAmount: { type: Number, required: true },
    collectedAmount: { type: Number, default: 0 },
    location: {
        state: { type: String, required: true },
        city: { type: String, required: true }
    },
    category: { type: String, enum: ['Accident', 'Medical', 'Disaster', 'Food', 'Water', 'Other'], required: true },
    proofDocuments: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DonationRequest', DonationRequestSchema);
