# Donations Web Platform (India Relief Connect)

A final year full stack web application to connect donors directly with people in need of assistance across India.

## Tech Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT & bcrypt
- **Integrations**: Razorpay (Sandbox) & QRCode generator
- **AI Features**: Rule-based mock chatbot & AI description generator

## Folder Structure
```text
Donations Web platform/
├── client/                     # Frontend App
│   ├── css/
│   │   └── styles.css          # Modern UI stylesheet
│   ├── js/
│   │   └── app.js              # Global frontend logic & chatbot
│   ├── index.html              # Main page & Requests feed
│   ├── login.html              # Login page
│   ├── signup.html             # Registration page
│   ├── dashboard.html          # Needy & Donor Dashboards
│   ├── request.html            # Create a request page
│   └── admin.html              # Admin verification panel
└── server/                     # Node.js backend
    ├── middleware/
    │   └── authMiddleware.js
    ├── models/
    │   ├── Donation.js
    │   ├── DonationRequest.js
    │   └── User.js
    ├── routes/
    │   ├── admin.js
    │   ├── ai.js
    │   ├── auth.js
    │   ├── donation.js
    │   └── request.js
    ├── .env                    # Environment variables
    ├── package.json
    └── server.js               # Entry point
```

## Setup Instructions

### Zero-Config Offline Mode (Easiest)
Due to standard system network restrictions during testing, the platform has been configured to run **completely offline in your browser**!
1. Simply open the `client/index.html` file in your preferred web browser.
2. The `client/js/app.js` runs a localStorage-based mock API interceptor, meaning you can test **all** features seamlessly (Registration, Login, Viewing Causes, Creating Requests, Admin Approvals, and Donating) without running the local Node JS server at all!

*(If you want to run the actual backend, see the instructions below).*

### Optional: Run Backend Server
1. Open a terminal to the `server/` folder
2. Run `npm install` to install dependencies
3. Define your environment variables in `.env` (optional, default provided)
4. Start the server using `npm start` or `npm run dev`

## Sample Test Data & Workflow
1. **Signup as Admin**: Open `signup.html`, choose "Admin (For Testing)" role. Login.
2. **Signup as Needy**: Open `signup.html` again, choose "Needy" role. Login as needy.
3. **Create Request**: Navigate to Dashboard as needy, click "Create New Request". Use the "✨ AI Enhance" button to create a good description. Submit.
4. **Approve Request**: Switch back to Admin account, go to `admin.html`, and Approve the request.
5. **Donate**: Signup as "Donor", browse the feed at `index.html`. Click "Donate Now". You can pick QR code or Gateway button.
6. **Chatbot**: Try the Chat widget at the bottom right by asking "Are donations tax exempt?"

Enjoy reviewing the project!
