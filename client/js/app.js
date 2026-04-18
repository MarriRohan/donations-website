const API_URL = 'http://localhost:3000/api';

// ===== OFFLINE MOCK BACKEND ADAPTER =====
// Since the environment blocks network ports, we intercept fetch calls to simulate the API using localStorage.
(function initOfflineMock() {
    if (!localStorage.getItem('irc_requests')) {
        const needyUser = { id: 'u1', name: 'Ramesh Needy', email: 'needy@irc.com', role: 'needy', password: 'password' };
        const donorUser = { id: 'u2', name: 'Sarah Donor', email: 'donor@irc.com', role: 'donor', password: 'password' };
        const adminUser = { id: 'u3', name: 'Admin', email: 'admin@irc.com', role: 'admin', password: 'password' };
        
        localStorage.setItem('irc_users', JSON.stringify([needyUser, donorUser, adminUser]));
        
        const sampleRequests = [
            { _id: 'r1', user: needyUser, category: 'Medical', title: 'Heart Surgery for Baby Arjun', description: 'Baby Arjun needs urgent open-heart surgery.', requiredAmount: 800000, collectedAmount: 245000, location: { state: 'Tamil Nadu', city: 'Chennai' }, status: 'approved' },
            { _id: 'r2', user: needyUser, category: 'Disaster', title: 'Flood Relief for Kerala Village', description: 'Wayanad families need basic supplies after floods.', requiredAmount: 1000000, collectedAmount: 420000, location: { state: 'Kerala', city: 'Wayanad' }, status: 'approved' },
            { _id: 'r3', user: needyUser, category: 'Food', title: 'Mid-day Meals for Tribal School', description: 'Providing meals for 150 students for 6 months.', requiredAmount: 200000, collectedAmount: 95000, location: { state: 'Jharkhand', city: 'Ranchi' }, status: 'approved' }
        ];
        
        localStorage.setItem('irc_requests', JSON.stringify(sampleRequests));
        
        const sampleDonations = [
            { _id: 'd1', donor: donorUser.id, request: sampleRequests[0], amount: 50000, status: 'success', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('irc_donations', JSON.stringify(sampleDonations));
    }

    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        if (!url.startsWith(API_URL)) return originalFetch(url, options);
        
        const path = url.replace(API_URL, '').split('?')[0];
        const method = options.method || 'GET';
        let body = {};
        if (options.body) body = JSON.parse(options.body);

        const okResponse = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        const errResponse = (msg, status=400) => new Response(JSON.stringify({msg}), { status, headers: { 'Content-Type': 'application/json' } });
        
        await new Promise(r => setTimeout(r, 400)); // Simulate network latency

        let users = JSON.parse(localStorage.getItem('irc_users'));
        let requests = JSON.parse(localStorage.getItem('irc_requests'));
        let donations = JSON.parse(localStorage.getItem('irc_donations'));

        const currentUser = JSON.parse(localStorage.getItem('user'));

        if (path === '/auth/login' && method === 'POST') {
            const user = users.find(u => u.email === body.email && body.password); // Mock weak auth
            if (user) return okResponse({ token: 'mock-jwt-token', user });
            return errResponse('Invalid credentials');
        }

        if (path === '/auth/register' && method === 'POST') {
            const user = { id: 'u' + Date.now(), name: body.name, email: body.email, role: body.role, password: body.password };
            users.push(user);
            localStorage.setItem('irc_users', JSON.stringify(users));
            return okResponse({ token: 'mock-jwt-token', user });
        }

        if (path === '/requests' && method === 'GET') {
            let res = requests.filter(r => r.status === 'approved');
            const urlObj = new URL(url);
            const state = urlObj.searchParams.get('state');
            const cat = urlObj.searchParams.get('category');
            if (state) res = res.filter(r => r.location.state.toLowerCase().includes(state.toLowerCase()));
            if (cat) res = res.filter(r => r.category === cat);
            return okResponse(res);
        }

        if (path === '/requests' && method === 'POST') {
            const req = {
                _id: 'r' + Date.now(),
                user: currentUser, title: body.title, category: body.category, 
                requiredAmount: Number(body.requiredAmount), collectedAmount: 0,
                location: { state: body.state, city: body.city }, description: body.description,
                status: 'pending'
            };
            requests.push(req);
            localStorage.setItem('irc_requests', JSON.stringify(requests));
            return okResponse({ request: req });
        }

        if (path === '/requests/my/requests' && method === 'GET') {
            return okResponse(requests.filter(r => r.user.id === currentUser.id));
        }

        if (path.startsWith('/donations/qr/')) {
            return okResponse({ qrCode: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UVIgQ09ERTwvdGV4dD48L3N2Zz4=' });
        }

        if (path === '/donations/order' && method === 'POST') {
            return okResponse({ mock: true, order: { id: 'order_' + Date.now() } });
        }

        if (path === '/donations/verify' && method === 'POST') {
            const reqIdx = requests.findIndex(r => r._id === body.requestId);
            if (reqIdx > -1) {
                requests[reqIdx].collectedAmount += Number(body.amount);
                localStorage.setItem('irc_requests', JSON.stringify(requests));
            }
            const reqInfo = requests[reqIdx] || { title: 'Unknown', category: 'Other' };
            const don = { _id: 'd' + Date.now(), donor: currentUser.id, request: reqInfo, amount: Number(body.amount), status: body.status, createdAt: new Date().toISOString() };
            donations.push(don);
            localStorage.setItem('irc_donations', JSON.stringify(donations));
            return okResponse({ donation: don });
        }

        if (path === '/donations/my/history' && method === 'GET') {
            return okResponse(donations.filter(d => d.donor === currentUser.id));
        }

        if (path === '/admin/requests/pending' && method === 'GET') {
            return okResponse(requests.filter(r => r.status === 'pending'));
        }

        if (path.match(/\/admin\/requests\/[^/]+\/status/) && method === 'PUT') {
            const id = path.split('/')[3];
            const req = requests.find(r => r._id === id);
            if (req) {
                req.status = body.status;
                localStorage.setItem('irc_requests', JSON.stringify(requests));
                return okResponse({ request: req });
            }
        }

        if (path === '/ai/chat' && method === 'POST') {
            const lowerMsg = body.message.toLowerCase();
            let reply = "I'm a virtual assistant. I can help with tax (80G), payment, or safety queries.";
            if (lowerMsg.includes('tax') || lowerMsg.includes('80g')) reply = "Yes, donations made through verified NGOs on our platform are eligible for 80G tax deductions.";
            else if (lowerMsg.includes('fee')) reply = "We charge a nominal 2% platform fee to maintain server costs.";
            else if (lowerMsg.includes('safe') || lowerMsg.includes('secure')) reply = "All payments are securely processed through our Payment Gateway and all requests are verified by admins.";
            return okResponse({ reply });
        }

        if (path === '/ai/enhance-description' && method === 'POST') {
            return okResponse({ enhancedText: `This is an urgent appeal regarding "${body.title}". ${body.keywords} We urgently need funds to manage this crisis. Your generous donation will go directly towards providing much-needed relief.` });
        }

        return originalFetch(url, options);
    };
})();

// ===== AUTH HELPERS =====
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
        document.querySelectorAll('.auth-hidden').forEach(el => el.style.display = '');
        document.querySelectorAll('.auth-visible').forEach(el => el.style.display = 'none');
        
        const dashboardLink = document.getElementById('dashboard-link');
        if(dashboardLink) {
            const dashUrl = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
            dashboardLink.innerHTML = `<a href="${dashUrl}" class="btn btn-ghost">${user.name}</a>`;
        }
    } else {
        document.querySelectorAll('.auth-hidden').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.auth-visible').forEach(el => el.style.display = '');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'info');
    setTimeout(() => window.location.href = 'index.html', 500);
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== CHATBOT =====
function setupChatbot() {
    const botHtml = `
        <div class="chat-trigger" onclick="toggleChat()">💬</div>
        <div class="chatbot-widget" id="chatbot">
            <div class="chatbot-header">
                🤖 AI Assistant
                <span onclick="toggleChat()">✕</span>
            </div>
            <div class="chatbot-messages" id="chat-messages">
                <div class="chat-bubble chat-bot">Hello! 👋 I'm the India Relief Connect AI assistant. I can help you find causes, answer questions about donations, taxes, and more. How can I help?</div>
            </div>
            <div class="chatbot-input">
                <input type="text" id="chat-input" placeholder="Ask me anything..." onkeypress="handleChat(event)">
                <button onclick="sendChat()" class="btn btn-primary">Send</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', botHtml);
}

function toggleChat() {
    const box = document.getElementById('chatbot');
    const trigger = document.querySelector('.chat-trigger');
    if (box.style.display === 'flex') {
        box.style.display = 'none';
        trigger.style.display = 'flex';
    } else {
        box.style.display = 'flex';
        trigger.style.display = 'none';
    }
}

function handleChat(e) {
    if (e.key === 'Enter') sendChat();
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    appendChat(msg, 'user');
    input.value = '';

    try {
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        appendChat(data.reply, 'bot');
    } catch (err) {
        appendChat('Sorry, I\'m having trouble connecting. Please try again.', 'bot');
    }
}

function appendChat(msg, sender) {
    const div = document.createElement('div');
    div.className = `chat-bubble chat-${sender}`;
    div.innerText = msg;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ===== UTILITY =====
function getCategoryBadge(category) {
    const map = {
        'Medical': 'badge-medical',
        'Accident': 'badge-accident',
        'Disaster': 'badge-disaster',
        'Food': 'badge-food',
        'Water': 'badge-water',
        'Other': 'badge-other'
    };
    return `<span class="badge ${map[category] || 'badge-other'}">${category}</span>`;
}

function getStatusBadge(status) {
    return `<span class="badge badge-status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupChatbot();
});
