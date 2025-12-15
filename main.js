// ============================================
// AI HUB - Main JavaScript
// ============================================

// AI Configuration Database
const AI_CONFIG = {
    chatgpt: {
        name: 'ChatGPT',
        fullName: 'ChatGPT (OpenAI)',
        url: 'https://chat.openai.com/',
        icon: 'fas fa-comments',
        gradient: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
        description: 'Modelo de linguagem da OpenAI, excelente para conversas naturais e programação.',
        features: ['Conversação Natural', 'Programação', 'Escrita Criativa', 'Análise de Texto'],
        status: 'online'
    },
    gemini: {
        name: 'Gemini',
        fullName: 'Gemini (Google)',
        url: 'https://gemini.google.com/',
        icon: 'fas fa-gem',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        description: 'IA multimodal do Google, ideal para análise de dados e pesquisa.',
        features: ['Multimodal', 'Análise de Dados', 'Pesquisa Web', 'Raciocínio'],
        status: 'online'
    },
    genspark: {
        name: 'Genspark',
        fullName: 'Genspark AI',
        url: 'https://www.genspark.ai/',
        icon: 'fas fa-lightbulb',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        description: 'Plataforma de IA para criatividade e ideação inovadora.',
        features: ['Brainstorming', 'Criatividade', 'Ideação', 'Inovação'],
        status: 'online'
    },
    manus: {
        name: 'Manus',
        fullName: 'Manus AI',
        url: 'https://www.manus.app/',
        icon: 'fas fa-hand-sparkles',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
        description: 'Assistente versátil para automação e produtividade.',
        features: ['Automação', 'Produtividade', 'Tarefas', 'Eficiência'],
        status: 'online'
    },
    claude: {
        name: 'Claude',
        fullName: 'Claude (Anthropic)',
        url: 'https://claude.ai/',
        icon: 'fas fa-user-astronaut',
        gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
        description: 'IA da Anthropic, especializada em análise detalhada e escrita técnica.',
        features: ['Análise Profunda', 'Escrita Técnica', 'Contextualização', 'Segurança'],
        status: 'online'
    },
    copilot: {
        name: 'Copilot',
        fullName: 'Microsoft Copilot',
        url: 'https://copilot.microsoft.com/',
        icon: 'fas fa-plane',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        description: 'Assistente AI da Microsoft, integrado com ferramentas Office.',
        features: ['Microsoft 365', 'Produtividade', 'Integração', 'Colaboração'],
        status: 'online'
    },
    perplexity: {
        name: 'Perplexity',
        fullName: 'Perplexity AI',
        url: 'https://www.perplexity.ai/',
        icon: 'fas fa-compass',
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        description: 'Motor de busca com IA, fornece informações com fontes verificadas.',
        features: ['Busca Avançada', 'Citações', 'Pesquisa', 'Fontes Verificadas'],
        status: 'online'
    },
    deepseek: {
        name: 'DeepSeek',
        fullName: 'DeepSeek AI',
        url: 'https://www.deepseek.com/',
        icon: 'fas fa-atom',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        description: 'IA especializada em programação e análise científica.',
        features: ['Código Avançado', 'Ciência', 'Matemática', 'Engenharia'],
        status: 'online'
    }
};

// Global State
let currentAI = null;
let chatHistory = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Hub Initialized');
    loadChatHistory();
    setupEventListeners();
    setupScrollAnimations();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Textarea auto-resize
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', autoResizeTextarea);
        chatInput.addEventListener('keydown', handleKeyDown);
    }

    // Smooth scroll for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Update active link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // AI card hover effects
    document.querySelectorAll('.ai-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// ============================================
// AI SELECTION
// ============================================
function selectAI(aiId) {
    if (!AI_CONFIG[aiId]) {
        console.error('AI not found:', aiId);
        return;
    }

    currentAI = aiId;
    const aiInfo = AI_CONFIG[aiId];

    // Update chat interface
    const chatSection = document.getElementById('chat-interface');
    const chatAiName = document.getElementById('current-ai-name');
    const chatAiStatus = document.getElementById('current-ai-status');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');

    // Show chat interface
    chatSection.classList.add('active');
    
    // Update AI info
    chatAiName.textContent = aiInfo.fullName;
    chatAiStatus.textContent = 'Pronto para conversar';

    // Update icon
    const iconElement = document.querySelector('.chat-ai-icon');
    iconElement.style.background = aiInfo.gradient;
    iconElement.innerHTML = `<i class="${aiInfo.icon}"></i>`;

    // Enable input
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.placeholder = `Digite sua mensagem para ${aiInfo.name}...`;

    // Clear welcome message and show system message
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    addSystemMessage(`Você está agora conversando com ${aiInfo.fullName}. ${aiInfo.description}`);
    addInfoMessage(aiInfo);

    // Scroll to chat
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Focus input
    setTimeout(() => chatInput.focus(), 300);

    // Highlight selected card
    document.querySelectorAll('.ai-card').forEach(card => {
        card.style.borderColor = 'var(--border-color)';
    });
    const selectedCard = document.querySelector(`[data-ai="${aiId}"]`);
    if (selectedCard) {
        selectedCard.style.borderColor = 'var(--primary-color)';
        selectedCard.style.boxShadow = 'var(--shadow-glow)';
    }

    // Show notification
    showNotification(`Conectado ao ${aiInfo.name}!`, 'success');
}

// ============================================
// MESSAGE HANDLING
// ============================================
function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const messageText = chatInput.value.trim();

    if (!messageText || !currentAI) return;

    // Add user message
    addMessage(messageText, 'user');

    // Clear input
    chatInput.value = '';
    autoResizeTextarea({ target: chatInput });

    // Simulate AI response
    setTimeout(() => {
        generateAIResponse(messageText);
    }, 1000);

    // Save to history
    saveChatHistory();
}

function addMessage(text, type = 'user') {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const avatarIcon = type === 'user' ? 'fas fa-user' : AI_CONFIG[currentAI]?.icon || 'fas fa-robot';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
            <span class="message-time">${timeString}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add to history
    chatHistory.push({
        ai: currentAI,
        type: type,
        text: text,
        timestamp: now.toISOString()
    });
}

function addSystemMessage(text) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.style.cssText = `
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        padding: 1rem;
        margin: 1rem 0;
        text-align: center;
        color: var(--text-secondary);
        max-width: 100%;
        align-self: center;
    `;

    messageDiv.innerHTML = `
        <i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 8px;"></i>
        ${escapeHtml(text)}
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addInfoMessage(aiInfo) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-info-card';
    messageDiv.style.cssText = `
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1rem 0;
        max-width: 100%;
    `;

    const featuresHTML = aiInfo.features.map(feature => 
        `<span class="stat-badge" style="margin: 4px;">${feature}</span>`
    ).join('');

    messageDiv.innerHTML = `
        <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">
            <i class="${aiInfo.icon}" style="color: var(--primary-color); margin-right: 8px;"></i>
            Recursos Principais
        </h4>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
            ${featuresHTML}
        </div>
        <div style="margin-top: 1rem;">
            <a href="${aiInfo.url}" target="_blank" rel="noopener noreferrer" 
               style="color: var(--primary-color); text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-external-link-alt"></i> Acessar ${aiInfo.name} Diretamente
            </a>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateAIResponse(userMessage) {
    const aiInfo = AI_CONFIG[currentAI];
    
    // Simulated AI responses based on keywords
    let response = '';
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('hello')) {
        response = `Olá! Sou o ${aiInfo.name}. Como posso ajudá-lo hoje? Estou aqui para responder suas perguntas e ajudar com suas tarefas.`;
    } else if (lowerMessage.includes('como') && lowerMessage.includes('funciona')) {
        response = `O ${aiInfo.name} é uma inteligência artificial que pode ajudá-lo com diversas tarefas. ${aiInfo.description} Para usar a versão completa com todas as funcionalidades, clique no link acima para acessar a plataforma oficial.`;
    } else if (lowerMessage.includes('recurso') || lowerMessage.includes('features')) {
        response = `Meus principais recursos incluem: ${aiInfo.features.join(', ')}. Para experimentar todas essas funcionalidades, acesse a plataforma oficial através do link acima!`;
    } else if (lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
        response = `Estou aqui para ajudar! Esta é uma interface demonstrativa. Para utilizar todo o potencial do ${aiInfo.name}, acesse a plataforma oficial clicando no link acima. Lá você terá acesso completo a todos os recursos e funcionalidades.`;
    } else if (lowerMessage.includes('programação') || lowerMessage.includes('código') || lowerMessage.includes('code')) {
        response = `Posso ajudar com programação! Sou especializado em várias linguagens e frameworks. Para obter ajuda completa com código e debugging, acesse a plataforma oficial do ${aiInfo.name} através do link acima.`;
    } else if (lowerMessage.includes('diferença') || lowerMessage.includes('comparar')) {
        response = `Cada IA tem suas especialidades únicas. O ${aiInfo.name} se destaca em: ${aiInfo.features.slice(0, 2).join(' e ')}. Experimente diferentes IAs do hub para encontrar a melhor para sua necessidade!`;
    } else {
        response = `Interessante pergunta! Esta é uma demonstração do hub de IAs. Para obter respostas completas e detalhadas, recomendo acessar a plataforma oficial do ${aiInfo.name} clicando no link acima. Lá você terá acesso a todas as funcionalidades avançadas!`;
    }

    addMessage(response, 'ai');
    saveChatHistory();
}

// ============================================
// CHAT CONTROLS
// ============================================
function closeChat() {
    const chatSection = document.getElementById('chat-interface');
    chatSection.classList.remove('active');
    
    // Reset selected card border
    document.querySelectorAll('.ai-card').forEach(card => {
        card.style.borderColor = 'var(--border-color)';
        card.style.boxShadow = '';
    });

    showNotification('Chat fechado', 'info');
}

function clearChat() {
    if (!confirm('Tem certeza que deseja limpar a conversa atual?')) {
        return;
    }

    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    if (currentAI) {
        const aiInfo = AI_CONFIG[currentAI];
        addSystemMessage(`Conversa com ${aiInfo.fullName} limpa.`);
        addInfoMessage(aiInfo);
    }

    // Clear only current AI history
    chatHistory = chatHistory.filter(msg => msg.ai !== currentAI);
    saveChatHistory();

    showNotification('Conversa limpa!', 'success');
}

function exportChat() {
    if (chatHistory.length === 0) {
        showNotification('Nenhuma conversa para exportar', 'warning');
        return;
    }

    const currentAIHistory = chatHistory.filter(msg => msg.ai === currentAI);
    
    if (currentAIHistory.length === 0) {
        showNotification('Nenhuma mensagem nesta conversa', 'warning');
        return;
    }

    const aiInfo = AI_CONFIG[currentAI];
    let exportText = `=================================\n`;
    exportText += `AI HUB - Conversa com ${aiInfo.fullName}\n`;
    exportText += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
    exportText += `=================================\n\n`;

    currentAIHistory.forEach(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
        const sender = msg.type === 'user' ? 'Você' : aiInfo.name;
        exportText += `[${time}] ${sender}:\n${msg.text}\n\n`;
    });

    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentAI}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Conversa exportada!', 'success');
}

// ============================================
// CHAT HISTORY
// ============================================
function saveChatHistory() {
    try {
        localStorage.setItem('ai_hub_chat_history', JSON.stringify(chatHistory));
    } catch (e) {
        console.error('Error saving chat history:', e);
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('ai_hub_chat_history');
        if (saved) {
            chatHistory = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading chat history:', e);
        chatHistory = [];
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function autoResizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#00d4ff'
    };

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--bg-secondary);
        border: 1px solid ${colors[type]};
        border-radius: 12px;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    notification.innerHTML = `
        <i class="${icons[type]}" style="color: ${colors[type]}; font-size: 1.5rem;"></i>
        <span style="color: var(--text-primary);">${escapeHtml(message)}</span>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    document.querySelectorAll('.ai-card, .feature-card, .stat-item').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

// ============================================
// ADDITIONAL ANIMATIONS
// ============================================

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// CONSOLE WELCOME MESSAGE
// ============================================
console.log('%c🤖 AI Hub Loaded! ', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 20px; padding: 10px; border-radius: 5px;');
console.log('%cMultiple AI Interfaces in One Place', 'color: #00d4ff; font-size: 14px;');
