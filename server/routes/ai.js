const express = require('express');
const router = express.Router();

// Mock AI endpoint for generating descriptions
router.post('/enhance-description', (req, res) => {
    const { title, category, keywords } = req.body;
    
    // In a real app, you would call OpenAI API here.
    // We will simulate an AI response.
    const enhancedText = `I am reaching out for urgent support regarding a critical situation. We are currently facing challenges related to ${title} under the ${category} category. We urgently need funds to manage this crisis and support the affected parties. ${keywords ? 'Specifically, this involves: ' + keywords : ''} Your generous donation will go directly towards providing much-needed relief. Thank you for your kindness and support during this difficult time.`;

    res.json({ enhancedText });
});

// Mock Chatbot for FAQs
router.post('/chat', (req, res) => {
    const { message } = req.body;
    const lowerMsg = message.toLowerCase();
    
    let reply = "I'm a virtual assistant. How can I help you with your donations today?";
    
    if (lowerMsg.includes('tax') || lowerMsg.includes('80g')) {
        reply = "Yes, donations made through verified NGOs on our platform are eligible for 80G tax deductions.";
    } else if (lowerMsg.includes('fee') || lowerMsg.includes('charge')) {
        reply = "We charge a nominal 2% platform fee to maintain server costs.";
    } else if (lowerMsg.includes('safe') || lowerMsg.includes('secure')) {
        reply = "All payments are securely processed through our Payment Gateway partners and all needy requests are verified by admins.";
    }

    res.json({ reply });
});

module.exports = router;
