# 🔧 Troubleshooting - AI Hub

Guia para resolver problemas comuns no **AI Hub**.

---

## 🚨 Problemas Comuns

### 1. CSS não está carregando

**Sintomas:**
- Site aparece sem formatação
- Apenas HTML puro é exibido
- Cores e layout não aparecem

**Soluções:**

✅ **Verifique o caminho do arquivo CSS**
```html
<!-- Correto -->
<link rel="stylesheet" href="css/style.css">

<!-- Incorreto -->
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="style.css">
```

✅ **Verifique a estrutura de pastas**
```
Sua pasta/
├── index.html
├── css/
│   └── style.css    ← Deve estar aqui
└── js/
    └── main.js
```

✅ **Limpe o cache do navegador**
- Chrome: `Ctrl + Shift + Delete` (Windows) ou `Cmd + Shift + Delete` (Mac)
- Ou use `Ctrl + F5` para hard refresh

---

### 2. JavaScript não funciona

**Sintomas:**
- Botões não respondem
- Chat não abre
- Erros no console

**Soluções:**

✅ **Abra o Console do Navegador**
- Chrome/Edge: `F12` ou `Ctrl + Shift + J`
- Firefox: `F12` ou `Ctrl + Shift + K`
- Safari: `Cmd + Option + C`

✅ **Verifique erros no console**

Procure por erros em vermelho. Erros comuns:

```
❌ Failed to load resource: net::ERR_FILE_NOT_FOUND
Solução: Verifique o caminho do arquivo JS

❌ Uncaught ReferenceError: selectAI is not defined
Solução: Certifique-se que main.js está carregando

❌ Cannot read property 'addEventListener' of null
Solução: Elemento HTML não encontrado, verifique IDs
```

✅ **Verifique o caminho do arquivo JS**
```html
<!-- Correto -->
<script src="js/main.js"></script>

<!-- Incorreto -->
<script src="/js/main.js"></script>
<script src="main.js"></script>
```

---

### 3. Ícones não aparecem (Font Awesome)

**Sintomas:**
- Quadrados ou espaços vazios onde deveriam estar ícones
- Layout desalinhado

**Soluções:**

✅ **Verifique a CDN do Font Awesome**
```html
<!-- Certifique-se que esta linha está no <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
```

✅ **Teste a conexão com a CDN**
- Abra a URL da CDN diretamente no navegador
- Se não carregar, pode ser problema de conexão

✅ **Use CDN alternativa**
```html
<!-- Alternativa 1: cdnjs -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<!-- Alternativa 2: Bootstrap CDN -->
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/6.4.0/css/all.min.css">
```

---

### 4. Fontes não carregam (Google Fonts)

**Sintomas:**
- Texto aparece com fonte genérica
- Estilo não corresponde ao esperado

**Soluções:**

✅ **Verifique o link do Google Fonts**
```html
<!-- Deve estar no <head> -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

✅ **Verifique a aplicação no CSS**
```css
:root {
    --font-primary: 'Rajdhani', sans-serif;
    --font-display: 'Orbitron', sans-serif;
}

body {
    font-family: var(--font-primary);
}
```

✅ **Fallback de fontes**
```css
/* Sempre inclua fallbacks */
font-family: 'Orbitron', 'Arial Black', sans-serif;
```

---

### 5. Chat não abre ao clicar

**Sintomas:**
- Botão "Acessar" não faz nada
- Chat não aparece

**Soluções:**

✅ **Verifique o console por erros**
```javascript
// Erro comum:
Uncaught TypeError: Cannot read property 'classList' of null

// Solução: Verifique se o ID existe no HTML
<section class="chat-section" id="chat-interface">
```

✅ **Verifique se JavaScript está carregado**
```javascript
// Adicione temporariamente no início do main.js
console.log('JavaScript carregado!');
```

✅ **Teste a função diretamente no console**
```javascript
// No console do navegador, digite:
selectAI('chatgpt')
```

---

### 6. Mensagens não aparecem no chat

**Sintomas:**
- Digite mensagem mas nada acontece
- Botão de enviar não funciona

**Soluções:**

✅ **Verifique se uma IA foi selecionada**
```javascript
// A variável currentAI deve ter valor
console.log(currentAI); // Deve mostrar: 'chatgpt', 'gemini', etc.
```

✅ **Verifique se input está habilitado**
```javascript
// No console:
document.getElementById('chat-input').disabled // Deve ser false
```

✅ **Teste envio manual**
```javascript
// No console, após selecionar uma IA:
sendMessage()
```

---

### 7. LocalStorage não funciona

**Sintomas:**
- Histórico não salva entre sessões
- Conversas desaparecem ao recarregar

**Soluções:**

✅ **Verifique se LocalStorage está disponível**
```javascript
// No console:
typeof(Storage) !== 'undefined' // Deve retornar true
```

✅ **Verifique privacidade do navegador**
- Safari: Desabilite "Prevent Cross-Site Tracking"
- Chrome: Settings > Privacy > Site Settings > Cookies
- Firefox: Options > Privacy > Custom > Allow localStorage

✅ **Teste manualmente**
```javascript
// No console:
localStorage.setItem('test', 'hello');
localStorage.getItem('test'); // Deve retornar 'hello'
```

✅ **Limpe dados antigos corrompidos**
```javascript
// No console:
localStorage.clear();
location.reload();
```

---

### 8. Site não funciona no mobile

**Sintomas:**
- Layout quebrado em celular
- Botões não funcionam no touch

**Soluções:**

✅ **Verifique meta viewport**
```html
<!-- Deve estar no <head> -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

✅ **Teste responsividade**
- Chrome DevTools: `F12` > Toggle device toolbar
- Teste em: iPhone, iPad, Android

✅ **Verifique media queries**
```css
/* Devem estar no final do style.css */
@media (max-width: 768px) {
    /* Estilos mobile */
}
```

---

### 9. Performance lenta

**Sintomas:**
- Site demora para carregar
- Animações travadas
- Scroll não suave

**Soluções:**

✅ **Verifique conexão com internet**
- CDNs precisam de internet para carregar

✅ **Desabilite temporariamente animações**
```css
/* No style.css, adicione: */
* {
    animation: none !important;
    transition: none !important;
}
```

✅ **Use Lighthouse para auditoria**
- Chrome DevTools > Lighthouse > Generate report

✅ **Otimize imagens** (se adicionar)
- Use formatos modernos: WebP
- Comprima imagens: [tinypng.com](https://tinypng.com/)

---

### 10. Exportação de chat não funciona

**Sintomas:**
- Botão de exportar não faz nada
- Arquivo não baixa

**Soluções:**

✅ **Verifique permissões do navegador**
- Chrome: Settings > Privacy > Site Settings > Automatic downloads

✅ **Teste manualmente**
```javascript
// No console, após enviar mensagens:
exportChat()
```

✅ **Verifique se há mensagens**
```javascript
// No console:
chatHistory.length // Deve ser > 0
```

---

## 🔍 Ferramentas de Debug

### 1. Console do Navegador
```javascript
// Comandos úteis:

// Verificar variáveis globais
console.log(currentAI);
console.log(chatHistory);
console.log(AI_CONFIG);

// Verificar elementos
console.log(document.getElementById('chat-interface'));

// Verificar localStorage
console.log(localStorage.getItem('ai_hub_chat_history'));
```

### 2. Chrome DevTools

**Elements Tab:**
- Inspecione HTML/CSS em tempo real
- Teste alterações temporárias

**Console Tab:**
- Execute JavaScript
- Veja erros e logs

**Network Tab:**
- Verifique se recursos estão carregando
- Veja falhas de CDN

**Performance Tab:**
- Analise velocidade de carregamento
- Identifique gargalos

---

## 📋 Checklist de Verificação Rápida

Quando algo não funcionar, verifique:

- [ ] Todos os arquivos estão nas pastas corretas?
- [ ] Caminhos de CSS/JS estão corretos no HTML?
- [ ] Console mostra algum erro?
- [ ] Cache do navegador foi limpo?
- [ ] Conexão com internet está funcionando?
- [ ] CDNs estão acessíveis?
- [ ] JavaScript está habilitado no navegador?
- [ ] LocalStorage está permitido?

---

## 🆘 Suporte Adicional

Se o problema persistir:

1. **Verifique a documentação completa** em `README.md`
2. **Consulte o guia de customização** em `CUSTOMIZATION.md`
3. **Abra uma issue** no repositório GitHub (se aplicável)
4. **Procure ajuda** em comunidades:
   - Stack Overflow
   - Reddit r/webdev
   - Discord de desenvolvedores

---

## 🔄 Reset Completo

Se tudo mais falhar, faça um reset completo:

### 1. Limpar todos os dados
```javascript
// No console do navegador:
localStorage.clear();
sessionStorage.clear();
```

### 2. Hard refresh
- Windows: `Ctrl + Shift + R` ou `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 3. Recarregar arquivos
- Baixe novamente o projeto
- Verifique integridade dos arquivos
- Compare com versão original

---

## 💡 Prevenção de Problemas

### Melhores Práticas:

1. **Sempre teste após mudanças**
2. **Mantenha backups regulares**
3. **Use controle de versão** (Git)
4. **Documente modificações**
5. **Teste em múltiplos navegadores**
6. **Valide HTML/CSS** periodicamente

### Ferramentas de Validação:

- HTML: [validator.w3.org](https://validator.w3.org/)
- CSS: [jigsaw.w3.org/css-validator](https://jigsaw.w3.org/css-validator/)
- JavaScript: ESLint, JSHint

---

<div align="center">

### ✅ Problema resolvido?

**Se sim, ótimo! Se não, não desista - a solução existe!**

</div>
