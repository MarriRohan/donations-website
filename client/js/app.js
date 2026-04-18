const API_URL = 'https://india-relief-backend.onrender.com/api';

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
