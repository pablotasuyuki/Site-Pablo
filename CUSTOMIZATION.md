# 🎨 Guia de Customização - AI Hub

Este guia mostra como personalizar o **AI Hub** de acordo com suas preferências.

---

## 🌈 Alterando Cores

### Paleta de Cores Principal

Edite o arquivo `css/style.css` e modifique as variáveis CSS em `:root`:

```css
:root {
    /* Suas cores personalizadas */
    --primary-color: #00d4ff;      /* Cor principal (ciano) */
    --secondary-color: #8b5cf6;    /* Cor secundária (roxo) */
    --accent-color: #f59e0b;       /* Cor de destaque (laranja) */
    
    /* Backgrounds */
    --bg-primary: #0a0e27;         /* Fundo principal */
    --bg-secondary: #111827;       /* Fundo secundário */
    --bg-tertiary: #1f2937;        /* Fundo terciário */
}
```

### Temas Populares

#### 🌊 Tema Oceano
```css
--primary-color: #06b6d4;
--secondary-color: #0891b2;
--accent-color: #22d3ee;
```

#### 🔥 Tema Fogo
```css
--primary-color: #f97316;
--secondary-color: #ea580c;
--accent-color: #fb923c;
```

#### 🌿 Tema Natureza
```css
--primary-color: #10b981;
--secondary-color: #059669;
--accent-color: #34d399;
```

#### 💜 Tema Cyberpunk
```css
--primary-color: #ec4899;
--secondary-color: #d946ef;
--accent-color: #f0abfc;
```

---

## 🖼️ Alterando Fontes

### Trocar Fonte Display (Títulos)

No arquivo `index.html`, substitua no `<head>`:

```html
<!-- Fonte atual: Orbitron -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&display=swap" rel="stylesheet">

<!-- Alternativas populares: -->
<!-- Roboto Mono -->
<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Space Grotesk -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Chakra Petch -->
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Depois, no `css/style.css`:

```css
:root {
    --font-display: 'Orbitron', sans-serif; /* Altere aqui */
}
```

---

## 🤖 Adicionando Novas IAs

### 1. Atualizar Configuração JavaScript

No arquivo `js/main.js`, adicione à constante `AI_CONFIG`:

```javascript
sua_ia: {
    name: 'Nome Curto',
    fullName: 'Nome Completo da IA',
    url: 'https://url-da-ia.com/',
    icon: 'fas fa-robot', // Ícone Font Awesome
    gradient: 'linear-gradient(135deg, #cor1 0%, #cor2 100%)',
    description: 'Descrição da IA e suas especialidades.',
    features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
    status: 'online'
}
```

### 2. Adicionar Card no HTML

No arquivo `index.html`, adicione dentro de `<div class="ai-cards">`:

```html
<!-- Sua Nova IA -->
<div class="ai-card" data-ai="sua_ia">
    <div class="ai-card-icon sua_ia">
        <i class="fas fa-robot"></i>
    </div>
    <h3 class="ai-card-title">Nome da IA</h3>
    <p class="ai-card-description">
        Descrição breve da IA e o que ela faz melhor.
    </p>
    <div class="ai-card-stats">
        <span class="stat-badge">
            <i class="fas fa-star"></i> Feature 1
        </span>
        <span class="stat-badge">
            <i class="fas fa-code"></i> Feature 2
        </span>
    </div>
    <button class="ai-card-button" onclick="selectAI('sua_ia')">
        <i class="fas fa-rocket"></i> Acessar
    </button>
</div>
```

### 3. Adicionar Estilo (Opcional)

No `css/style.css`, adicione o gradiente personalizado:

```css
.ai-card-icon.sua_ia {
    background: linear-gradient(135deg, #sua-cor-1 0%, #sua-cor-2 100%);
}
```

---

## 🎭 Efeitos Visuais

### Desabilitar Animações

Se preferir um site mais estático, comente no `css/style.css`:

```css
/* Desabilitar grid animado */
/* 
@keyframes gridMove {
    0% { transform: translate(0, 0); }
    100% { transform: translate(50px, 50px); }
}
*/
```

### Ajustar Velocidade das Animações

```css
:root {
    --transition-fast: 0.2s ease;    /* Mais rápido: 0.1s */
    --transition-normal: 0.3s ease;  /* Mais rápido: 0.2s */
    --transition-slow: 0.5s ease;    /* Mais rápido: 0.3s */
}
```

### Modificar Orbs Flutuantes

No `css/style.css`, ajuste tamanho e cor:

```css
.glow-orb-1 {
    width: 500px;           /* Tamanho */
    height: 500px;
    background: radial-gradient(circle, #00d4ff, transparent); /* Cor */
    opacity: 0.3;           /* Transparência (0.1 a 1) */
}
```

---

## 📱 Layout e Responsividade

### Ajustar Largura Máxima

No `css/style.css`:

```css
.container {
    max-width: 1400px; /* Altere para 1200px, 1600px, etc. */
    margin: 0 auto;
    padding: 0 var(--spacing-md);
}
```

### Modificar Grid de Cards

```css
.ai-cards {
    /* 2 colunas mínimo */
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    
    /* Opções alternativas: */
    /* 3 colunas fixas */
    /* grid-template-columns: repeat(3, 1fr); */
    
    /* 4 colunas em telas grandes */
    /* grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); */
}
```

---

## 💬 Personalizar Chat

### Alterar Tamanho do Chat

No `css/style.css`:

```css
.chat-section {
    max-height: 700px; /* Ajuste aqui (500px - 900px) */
}

.chat-messages {
    min-height: 400px; /* Altura mínima */
    max-height: 500px; /* Altura máxima */
}
```

### Modificar Cores das Mensagens

```css
/* Mensagens do usuário */
.message.user .message-content {
    background: var(--gradient-cyan); /* Altere o gradiente */
    color: white;
}

/* Mensagens da IA */
.message.ai .message-content {
    background: var(--bg-secondary);
    color: var(--text-primary);
}
```

---

## 🔊 Adicionar Sons (Opcional)

### 1. Adicionar arquivos de áudio

Crie uma pasta `sounds/` e adicione arquivos `.mp3`:
```
sounds/
├── message-sent.mp3
├── message-received.mp3
└── notification.mp3
```

### 2. Atualizar JavaScript

No `js/main.js`, adicione função de som:

```javascript
function playSound(soundName) {
    const audio = new Audio(`sounds/${soundName}.mp3`);
    audio.volume = 0.5; // 50% volume
    audio.play().catch(e => console.log('Could not play sound'));
}
```

### 3. Usar nos eventos

```javascript
function sendMessage() {
    // ... código existente ...
    playSound('message-sent');
}

function generateAIResponse(userMessage) {
    // ... código existente ...
    playSound('message-received');
}
```

---

## 🌐 Adicionar Idiomas

### 1. Criar objeto de traduções

No `js/main.js`:

```javascript
const TRANSLATIONS = {
    'pt-BR': {
        selectAI: 'Selecione sua IA',
        sendMessage: 'Enviar mensagem',
        clearChat: 'Limpar conversa',
        // ... mais traduções
    },
    'en': {
        selectAI: 'Select your AI',
        sendMessage: 'Send message',
        clearChat: 'Clear chat',
        // ... more translations
    }
};
```

### 2. Implementar função de tradução

```javascript
let currentLanguage = 'pt-BR';

function translate(key) {
    return TRANSLATIONS[currentLanguage][key] || key;
}
```

---

## 📊 Adicionar Analytics

### Google Analytics

No `index.html`, adicione antes do `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🎯 Personalizar Logo

### Trocar Texto do Logo

No `index.html`:

```html
<div class="logo">
    <i class="fas fa-brain"></i> <!-- Troque o ícone -->
    <span>SEU TEXTO</span> <!-- Troque o texto -->
</div>
```

### Usar Imagem como Logo

```html
<div class="logo">
    <img src="images/logo.png" alt="Logo" style="height: 40px;">
    <span>AI HUB</span>
</div>
```

---

## 🔧 Configurações Avançadas

### Alterar Comportamento do Chat

No `js/main.js`, modifique estas configurações:

```javascript
// Auto-scroll mais suave
chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
});

// Delay da resposta da IA
setTimeout(() => {
    generateAIResponse(messageText);
}, 1000); // Altere o tempo em milissegundos
```

### Limite de Histórico

```javascript
function saveChatHistory() {
    // Manter apenas últimas 100 mensagens
    if (chatHistory.length > 100) {
        chatHistory = chatHistory.slice(-100);
    }
    localStorage.setItem('ai_hub_chat_history', JSON.stringify(chatHistory));
}
```

---

## 💡 Dicas de Customização

1. **Teste em Diferentes Navegadores**: Chrome, Firefox, Safari
2. **Use DevTools**: Inspecione elementos para ajustes rápidos
3. **Backup**: Sempre faça backup antes de mudanças grandes
4. **Documentação**: Comente suas alterações no código
5. **Validação**: Use validadores HTML/CSS para verificar

---

## 📚 Recursos Úteis

- **Font Awesome Icons**: [fontawesome.com/icons](https://fontawesome.com/icons)
- **Google Fonts**: [fonts.google.com](https://fonts.google.com/)
- **Color Picker**: [coolors.co](https://coolors.co/)
- **Gradient Generator**: [cssgradient.io](https://cssgradient.io/)
- **CSS Reference**: [developer.mozilla.org](https://developer.mozilla.org/)

---

<div align="center">

### 🎨 Faça do AI Hub a sua cara!

**Personalize e crie algo único!**

</div>
