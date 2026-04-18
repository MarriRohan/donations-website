const path = require('path');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { URL } = require('url');

// ===== INLINE MINI-FRAMEWORK (no external dependencies) =====

// Simple .env parser
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
}

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwttoken';
const MONGO_URI = process.env.MONGO_URI || '';

// ===== IN-MEMORY DATABASE (works without MongoDB) =====
const DB = {
    users: [],
    requests: [],
    donations: [],
    _id: 0,
    nextId() { return (++this._id).toString(36) + Date.now().toString(36); }
};

// Seed admin user
DB.users.push({
    _id: DB.nextId(),
    name: 'Admin',
    email: 'admin@irc.com',
    password: hashPassword('admin123'),
    role: 'admin',
    createdAt: new Date()
});

// Seed sample data
const sampleRequests = [
    {
        title: 'Cancer Surgery Help for 6-year-old Priya',
        description: 'Little Priya from a small village in Maharashtra has been diagnosed with leukemia. Her family of daily wage workers cannot afford the critical surgery and chemotherapy needed. The surgery is scheduled for next month and they need urgent financial support.',
        requiredAmount: 500000,
        collectedAmount: 185000,
        location: { state: 'Maharashtra', city: 'Pune' },
        category: 'Medical',
        status: 'approved'
    },
    {
        title: 'Flood Relief for Kerala Village',
        description: 'The recent floods in Wayanad district have displaced over 200 families, destroying homes and crops. We need funds for temporary shelters, food supplies, clean drinking water, and medical aid for the affected families.',
        requiredAmount: 1000000,
        collectedAmount: 420000,
        location: { state: 'Kerala', city: 'Wayanad' },
        category: 'Disaster',
        status: 'approved'
    },
    {
        title: 'Road Accident Recovery Fund',
        description: 'Ramesh Kumar, a 35-year-old auto driver and sole breadwinner of his family, suffered severe injuries in a truck collision on NH-48. He needs multiple surgeries including spinal reconstruction. His wife and two children depend entirely on him.',
        requiredAmount: 300000,
        collectedAmount: 67000,
        location: { state: 'Karnataka', city: 'Bangalore' },
        category: 'Accident',
        status: 'approved'
    },
    {
        title: 'Mid-day Meals for Tribal School Children',
        description: 'A rural tribal school in Jharkhand with 150 students lacks proper nutrition. Many children walk 5km daily on empty stomachs. We aim to provide nutritious mid-day meals for 6 months to help these children focus on their education.',
        requiredAmount: 200000,
        collectedAmount: 95000,
        location: { state: 'Jharkhand', city: 'Ranchi' },
        category: 'Food',
        status: 'approved'
    },
    {
        title: 'Clean Water Project for Rajasthan Villages',
        description: "Three villages in the Thar Desert region face acute water scarcity. Women and children walk over 3km daily to fetch contaminated water. This project will install two borewells and a solar-powered purification system to serve 500 families.",
        requiredAmount: 750000,
        collectedAmount: 310000,
        location: { state: 'Rajasthan', city: 'Jodhpur' },
        category: 'Water',
        status: 'approved'
    },
    {
        title: 'Heart Surgery for Baby Arjun',
        description: 'Baby Arjun, just 8 months old, was born with a congenital heart defect. His parents, a young couple from rural Tamil Nadu, have exhausted all their savings on initial treatments. An urgent open-heart surgery at CMC Vellore is the only option.',
        requiredAmount: 800000,
        collectedAmount: 245000,
        location: { state: 'Tamil Nadu', city: 'Chennai' },
        category: 'Medical',
        status: 'approved'
    },
    {
        title: 'Earthquake Relief - Assam Families',
        description: 'The devastating earthquake in Assam has left hundreds of families homeless. We are raising funds to provide emergency supplies including tents, blankets, food packets, and basic medicines for the worst-affected communities.',
        requiredAmount: 600000,
        collectedAmount: 128000,
        location: { state: 'Assam', city: 'Guwahati' },
        category: 'Disaster',
        status: 'approved'
    },
    {
        title: 'Dialysis Treatment for Daily-Wage Worker',
        description: 'Suresh, a 50-year-old construction worker from Hyderabad, needs regular dialysis sessions three times a week due to kidney failure. Without financial support, he cannot continue treatment and support his dependent family of four.',
        requiredAmount: 400000,
        collectedAmount: 52000,
        location: { state: 'Telangana', city: 'Hyderabad' },
        category: 'Medical',
        status: 'approved'
    }
];

const needyUser = {
    _id: DB.nextId(),
    name: 'Sample Needy User',
    email: 'needy@irc.com',
    password: hashPassword('needy123'),
    role: 'needy',
    createdAt: new Date()
};
DB.users.push(needyUser);

const donorUser = {
    _id: DB.nextId(),
    name: 'Generous Donor',
    email: 'donor@irc.com',
    password: hashPassword('donor123'),
    role: 'donor',
    createdAt: new Date()
};
DB.users.push(donorUser);

sampleRequests.forEach(r => {
    DB.requests.push({
        _id: DB.nextId(),
        user: needyUser._id,
        userName: needyUser.name,
        ...r,
        proofDocuments: [],
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000)
    });
});

// Add some sample donations
DB.requests.forEach(req => {
    if (req.collectedAmount > 0) {
        const numDonations = Math.floor(Math.random() * 5) + 1;
        let remaining = req.collectedAmount;
        for (let i = 0; i < numDonations && remaining > 0; i++) {
            const amt = i === numDonations - 1 ? remaining : Math.floor(remaining * Math.random() * 0.6) + 100;
            remaining -= amt;
            DB.donations.push({
                _id: DB.nextId(),
                donor: donorUser._id,
                donorName: donorUser.name,
                request: req._id,
                requestTitle: req.title,
                amount: amt,
                paymentId: 'pay_' + DB.nextId(),
                status: 'success',
                createdAt: new Date(Date.now() - Math.random() * 3 * 86400000)
            });
        }
    }
});

// ===== CRYPTO HELPERS =====
function hashPassword(pass) {
    return crypto.createHash('sha256').update(pass + 'salt_irc').digest('hex');
}

function comparePassword(pass, hash) {
    return hashPassword(pass) === hash;
}

function createJWT(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86400000 })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
    try {
        const [header, body, sig] = token.split('.');
        const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Date.now()) return null;
        return payload;
    } catch { return null; }
}

// ===== QR CODE GENERATION (Pure SVG) =====
function generateQRCodeSVG(text) {
    // Simple QR-like SVG data URI (not a real QR, but visually works for demo)
    const size = 200;
    const cellSize = 8;
    const cells = Math.floor(size / cellSize);
    let svgRects = '';
    
    // Generate deterministic pattern from text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    
    // Create finder patterns (corners)
    const drawFinderPattern = (x, y) => {
        for (let dy = 0; dy < 7; dy++) {
            for (let dx = 0; dx < 7; dx++) {
                if (dy === 0 || dy === 6 || dx === 0 || dx === 6 ||
                    (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4)) {
                    svgRects += `<rect x="${(x+dx)*cellSize}" y="${(y+dy)*cellSize}" width="${cellSize}" height="${cellSize}" fill="#333"/>`;
                }
            }
        }
    };

    drawFinderPattern(1, 1);
    drawFinderPattern(cells - 9, 1);
    drawFinderPattern(1, cells - 9);

    // Fill data area
    const seed = Math.abs(hash);
    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            if ((x < 9 && y < 9) || (x > cells - 10 && y < 9) || (x < 9 && y > cells - 10)) continue;
            const v = ((seed * (x + 1) * (y + 1) + x * 7 + y * 13) % 5);
            if (v < 2) {
                svgRects += `<rect x="${x*cellSize}" y="${y*cellSize}" width="${cellSize}" height="${cellSize}" fill="#333"/>`;
            }
        }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="white"/>
        ${svgRects}
        <text x="${size/2}" y="${size - 4}" text-anchor="middle" font-size="6" fill="#666">Scan to Donate</text>
    </svg>`;
    
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// ===== AI CHATBOT =====
const FAQ_RESPONSES = {
    'tax': 'Yes, donations made through verified NGOs on our platform are eligible for 80G tax deductions under the Income Tax Act. You will receive a tax receipt for every donation.',
    '80g': 'Section 80G of the Income Tax Act allows donors to claim deductions on donations made to approved charitable organizations. We provide 80G receipts for all eligible donations.',
    'fee': 'We charge a nominal 2% platform fee to cover payment gateway charges and server maintenance costs. 98% of your donation goes directly to the beneficiary.',
    'charge': 'We charge a nominal 2% platform fee to cover payment gateway charges and server maintenance costs. 98% of your donation goes directly to the beneficiary.',
    'safe': 'Absolutely! All payments are processed through secure, PCI-DSS compliant payment gateways. We use 256-bit SSL encryption and all requests are verified by our admin team before they go live.',
    'secure': 'Your data and payments are fully secured with bank-grade encryption. We never store your card details. All transactions go through Razorpay\'s secure payment infrastructure.',
    'refund': 'We process refunds within 5-7 business days if a request is found to be fraudulent or if the target amount has already been met. Contact support@indiareliefconnect.org for refund requests.',
    'verify': 'Our admin team manually verifies every request before it appears on the public feed. We check proof documents, contact details, and cross-verify with local authorities when possible.',
    'fraud': 'We take fraud very seriously. Every request goes through multi-level verification. Our AI monitors for suspicious patterns. If you spot something odd, report it and we\'ll investigate within 24 hours.',
    'upi': 'Yes! We support UPI payments. You can pay via any UPI app (GPay, PhonePe, Paytm) by scanning the QR code generated for each cause.',
    'card': 'We accept Visa, MasterCard, and RuPay debit/credit cards. All card transactions are processed through Razorpay\'s PCI-compliant gateway.',
    'anonymous': 'Yes, you can choose to donate anonymously. Your name will not be displayed to the beneficiary or other users if you select the anonymous option.',
    'receipt': 'A donation receipt is automatically sent to your registered email after every successful transaction. You can also download receipts from your dashboard.',
    'help': 'I can help you with: tax benefits, payment methods, security info, refund policies, verification process, and suggest causes to donate to. Just ask!',
    'hi': 'Hello! 👋 Welcome to India Relief Connect. I\'m your AI assistant. I can help you find causes to donate to, answer questions about donations, taxes, and security. How can I help you today?',
    'hello': 'Hi there! 👋 I\'m the India Relief Connect AI assistant. Ask me about donation causes, tax benefits, payment methods, or anything else!',
    'suggest': 'Based on current urgent needs, I\'d recommend looking at our Medical and Disaster relief categories. Many children and accident victims need immediate help. Check the "Medical" filter on the home page!',
    'donate': 'To donate, simply browse the causes on our home page, click "Donate Now" on any verified request, enter the amount, and choose your payment method. It takes less than 2 minutes!',
    'how': 'To get started: 1) Sign up as a Donor 2) Browse verified causes on the home page 3) Click "Donate Now" 4) Choose your amount and payment method. That\'s it!'
};

function getAIChatReply(message) {
    if (!message) return "I'm here to help! Ask me about donations, tax benefits, payment methods, or request suggestions.";
    
    const lowerMsg = message.toLowerCase();
    
    for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
        if (lowerMsg.includes(keyword)) return response;
    }
    
    if (lowerMsg.includes('thank')) return "You're welcome! 😊 Every donation makes a difference. Is there anything else I can help you with?";
    if (lowerMsg.includes('who') || lowerMsg.includes('what is')) return "India Relief Connect is a platform that connects donors with verified people in need across India. We cover medical emergencies, disaster relief, food, and water access.";
    
    return "I'm here to assist! You can ask me about:\n• 💰 Tax benefits (80G)\n• 🔒 Payment security\n• 💳 Payment methods (UPI, Card, Net Banking)\n• ✅ Verification process\n• 📋 How to donate\n• 🎯 Cause suggestions\n\nJust type your question!";
}

function enhanceDescription(title, category, keywords) {
    const intros = {
        'Medical': 'This is an urgent medical appeal',
        'Accident': 'This is an emergency fund for accident recovery',
        'Disaster': 'This is a critical disaster relief effort',
        'Food': 'This urgent food security initiative',
        'Water': 'This life-saving clean water project',
        'Other': 'This important community support initiative'
    };
    
    const intro = intros[category] || intros['Other'];
    
    return `${intro} regarding "${title}". ${keywords ? keywords + ' ' : ''}Every contribution, no matter how small, will bring hope and relief to those affected. Your generosity can make the difference between despair and recovery. The funds will be directly used for the cause with full transparency and regular updates. We urge you to support this cause and share it with your network. Together, we can make a meaningful impact.`;
}

// ===== HTTP SERVER =====
function parseBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(data)); } catch { resolve({}); }
        });
    });
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

function getAuthUser(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    return verifyJWT(token);
}

const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);

    try {
        // ===== AUTH ROUTES =====
        if (pathname === '/api/auth/register' && req.method === 'POST') {
            const { name, email, password, role } = await parseBody(req);
            if (!name || !email || !password) return sendJSON(res, 400, { msg: 'All fields are required' });
            
            if (DB.users.find(u => u.email === email)) return sendJSON(res, 400, { msg: 'User already exists' });
            
            const user = {
                _id: DB.nextId(),
                name, email,
                password: hashPassword(password),
                role: role || 'donor',
                createdAt: new Date()
            };
            DB.users.push(user);
            
            const token = createJWT({ id: user._id, role: user.role });
            return sendJSON(res, 200, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
        }

        if (pathname === '/api/auth/login' && req.method === 'POST') {
            const { email, password } = await parseBody(req);
            const user = DB.users.find(u => u.email === email);
            if (!user || !comparePassword(password, user.password)) return sendJSON(res, 400, { msg: 'Invalid Credentials' });
            
            const token = createJWT({ id: user._id, role: user.role });
            return sendJSON(res, 200, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
        }

        // ===== REQUEST ROUTES =====
        if (pathname === '/api/requests' && req.method === 'GET') {
            let results = DB.requests.filter(r => r.status === 'approved');
            if (query.category) results = results.filter(r => r.category === query.category);
            if (query.state) results = results.filter(r => r.location.state.toLowerCase().includes(query.state.toLowerCase()));
            
            const enriched = results.map(r => ({
                ...r,
                user: { name: r.userName || DB.users.find(u => u._id === r.user)?.name || 'Anonymous' }
            }));
            return sendJSON(res, 200, enriched);
        }

        if (pathname === '/api/requests/my/requests' && req.method === 'GET') {
            const authUser = getAuthUser(req);
            if (!authUser) return sendJSON(res, 401, { msg: 'Not authorized' });
            
            const results = DB.requests.filter(r => r.user === authUser.id);
            return sendJSON(res, 200, results);
        }

        if (pathname.match(/^\/api\/requests\/[^/]+$/) && req.method === 'GET') {
            const id = pathname.split('/').pop();
            const request = DB.requests.find(r => r._id === id);
            if (!request) return sendJSON(res, 404, { msg: 'Request not found' });
            
            const donors = DB.donations
                .filter(d => d.request === id && d.status === 'success')
                .map(d => ({ name: d.donorName || 'Anonymous', amount: d.amount, date: d.createdAt }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return sendJSON(res, 200, {
                ...request,
                user: { name: DB.users.find(u => u._id === request.user)?.name || 'Anonymous' },
                recentDonors: donors.slice(0, 10)
            });
        }

        if (pathname === '/api/requests' && req.method === 'POST') {
            const authUser = getAuthUser(req);
            if (!authUser) return sendJSON(res, 401, { msg: 'Not authorized' });
            if (authUser.role !== 'needy') return sendJSON(res, 403, { msg: 'Only needy users can create requests' });
            
            const { title, description, requiredAmount, state, city, category, proofDocuments } = await parseBody(req);
            const user = DB.users.find(u => u._id === authUser.id);
            
            const newRequest = {
                _id: DB.nextId(),
                user: authUser.id,
                userName: user?.name || 'Unknown',
                title, description,
                requiredAmount: Number(requiredAmount),
                collectedAmount: 0,
                location: { state, city },
                category,
                proofDocuments: proofDocuments || [],
                status: 'pending',
                createdAt: new Date()
            };
            DB.requests.push(newRequest);
            return sendJSON(res, 200, { msg: 'Request created and is pending admin approval', request: newRequest });
        }

        // ===== DONATION ROUTES =====
        if (pathname.match(/^\/api\/donations\/qr\//) && req.method === 'GET') {
            const id = pathname.split('/').pop();
            const qrCode = generateQRCodeSVG(`upi://pay?pa=indiareliefconnect@upi&pn=IndiaReliefConnect&am=0&cu=INR&tn=Donation_${id}`);
            return sendJSON(res, 200, { qrCode });
        }

        if (pathname === '/api/donations/order' && req.method === 'POST') {
            const authUser = getAuthUser(req);
            if (!authUser) return sendJSON(res, 401, { msg: 'Not authorized' });
            
            const { amount } = await parseBody(req);
            return sendJSON(res, 200, {
                mock: true,
                order: {
                    id: 'order_' + DB.nextId(),
                    amount: Number(amount) * 100,
                    currency: 'INR'
                }
            });
        }

        if (pathname === '/api/donations/verify' && req.method === 'POST') {
            const authUser = getAuthUser(req);
            if (!authUser) return sendJSON(res, 401, { msg: 'Not authorized' });
            
            const { requestId, amount, paymentId, status } = await parseBody(req);
            const user = DB.users.find(u => u._id === authUser.id);
            
            const donation = {
                _id: DB.nextId(),
                donor: authUser.id,
                donorName: user?.name || 'Anonymous',
                request: requestId,
                requestTitle: DB.requests.find(r => r._id === requestId)?.title || 'Unknown',
                amount: Number(amount),
                paymentId: paymentId || 'mock_' + DB.nextId(),
                status: status || 'success',
                createdAt: new Date()
            };
            DB.donations.push(donation);
            
            if (status !== 'failed') {
                const req = DB.requests.find(r => r._id === requestId);
                if (req) req.collectedAmount += Number(amount);
            }
            
            return sendJSON(res, 200, { msg: 'Donation recorded successfully!', donation });
        }

        if (pathname === '/api/donations/my/history' && req.method === 'GET') {
            const authUser = getAuthUser(req);
            if (!authUser) return sendJSON(res, 401, { msg: 'Not authorized' });
            
            const donations = DB.donations
                .filter(d => d.donor === authUser.id)
                .map(d => ({
                    ...d,
                    request: { title: d.requestTitle || DB.requests.find(r => r._id === d.request)?.title || 'Unknown', category: DB.requests.find(r => r._id === d.request)?.category || 'Other' }
                }));
            return sendJSON(res, 200, donations);
        }

        // ===== ADMIN ROUTES =====
        if (pathname === '/api/admin/requests/pending' && req.method === 'GET') {
            const authUser = getAuthUser(req);
            if (!authUser || authUser.role !== 'admin') return sendJSON(res, 403, { msg: 'Admin access required' });
            
            const pending = DB.requests
                .filter(r => r.status === 'pending')
                .map(r => ({
                    ...r,
                    user: { name: r.userName, email: DB.users.find(u => u._id === r.user)?.email || '' }
                }));
            return sendJSON(res, 200, pending);
        }

        if (pathname.match(/^\/api\/admin\/requests\/[^/]+\/status$/) && req.method === 'PUT') {
            const authUser = getAuthUser(req);
            if (!authUser || authUser.role !== 'admin') return sendJSON(res, 403, { msg: 'Admin access required' });
            
            const id = pathname.split('/')[4];
            const { status } = await parseBody(req);
            
            if (!['approved', 'rejected'].includes(status)) return sendJSON(res, 400, { msg: 'Invalid status' });
            
            const request = DB.requests.find(r => r._id === id);
            if (!request) return sendJSON(res, 404, { msg: 'Request not found' });
            
            request.status = status;
            return sendJSON(res, 200, { msg: `Request ${status} successfully`, request });
        }

        // ===== AI ROUTES =====
        if (pathname === '/api/ai/chat' && req.method === 'POST') {
            const { message } = await parseBody(req);
            return sendJSON(res, 200, { reply: getAIChatReply(message) });
        }

        if (pathname === '/api/ai/enhance-description' && req.method === 'POST') {
            const { title, category, keywords } = await parseBody(req);
            return sendJSON(res, 200, { enhancedText: enhanceDescription(title, category, keywords) });
        }

        // ===== STATIC FILE SERVING (Client) =====
        const clientDir = path.join(__dirname, '..', 'client');
        let filePath = pathname === '/' ? '/index.html' : pathname;
        const fullPath = path.join(clientDir, filePath);
        
        // Security: prevent directory traversal
        if (!fullPath.startsWith(clientDir)) return sendJSON(res, 403, { msg: 'Forbidden' });
        
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const ext = path.extname(fullPath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
            };
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
            return fs.createReadStream(fullPath).pipe(res);
        }

        // Root API check
        if (pathname === '/api' || pathname === '/api/') {
            return sendJSON(res, 200, { msg: 'India Relief Connect API is running' });
        }

        sendJSON(res, 404, { msg: 'Not found' });
    } catch (err) {
        console.error('Server Error:', err);
        sendJSON(res, 500, { msg: 'Internal Server Error' });
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║       🇮🇳  INDIA RELIEF CONNECT  🇮🇳                  ║');
    console.log('║       Donations Web Platform Server                 ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Server running at: http://localhost:${PORT}            ║`);
    console.log(`║  Open browser at:   http://localhost:${PORT}            ║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Sample Accounts (pre-loaded):                      ║');
    console.log('║    Admin:  admin@irc.com / admin123                 ║');
    console.log('║    Needy:  needy@irc.com / needy123                 ║');
    console.log('║    Donor:  donor@irc.com / donor123                 ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  ${DB.requests.length} sample requests loaded                        ║`);
    console.log(`║  ${DB.donations.length} sample donations loaded                      ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
});
