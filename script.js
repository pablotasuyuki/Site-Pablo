/**
 * js/script.js
 * Serviços de TI - Pablo Tasuyuki
 *
 * Arquivo completo com:
 * - Mobile menu
 * - Smooth scroll
 * - solicitarServico (WhatsApp) usando data-service (e migração de onclicks)
 * - Animações (IntersectionObserver)
 * - Lazy loading de imagens
 * - Botão voltar ao topo
 * - Barra de busca para serviços
 * - Sistema de notificações
 * - Google Sign-In (Firebase Auth) + Firestore reviews (0-10)
 * - Proteções (prevenção de clique duplo em botões importantes)
 *
 * IMPORTANTE:
 * - Já insiri o seu firebaseConfig fornecido (SDK modular snippet).
 * - Seu index.html inclui os SDKs compat; este script usa o modo compat (firebase.*).
 * - Se preferir usar a versão modular do SDK, me avise que adapto o código para import/export modular.
 */

/* ===========================
   CONFIGURAÇÃO FIREBASE (substituído com os valores que você forneceu)
   =========================== */
const firebaseConfig = {
    apiKey: "AIzaSyDALe6eKby-7JaCBvej9iqr95Y97s6oHWg",
    authDomain: "flutter-ai-playground-7971c.firebaseapp.com",
    projectId: "flutter-ai-playground-7971c",
    storageBucket: "flutter-ai-playground-7971c.firebasestorage.app",
    messagingSenderId: "623047073166",
    appId: "1:623047073166:web:83d31c6c017b2e70af58df"
};

// Telefone usado para abrir WhatsApp (formato internacional sem +)
const WHATSAPP_PHONE = '5551997395967';

// Firebase runtime variables
let firebaseAuth = null;
let firebaseDB = null;
let currentUser = null;

// Inicializa Firebase se disponível (modo compat)
(function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK não encontrado. Autenticação e avaliações estarão desabilitadas até você incluir os SDKs e configurar firebaseConfig.');
        return;
    }

    try {
        // Inicializa app (se ainda não inicializado)
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseAuth = firebase.auth();
        firebaseDB = firebase.firestore();
        // Observador de estado de autenticação
        firebaseAuth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI(user);
        });
    } catch (err) {
        console.error('Erro inicializando Firebase:', err);
    }
})();

/* ===========================
   UTILITÁRIOS / NOTIFICAÇÕES
   =========================== */
function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 translate-x-full`;
    const cores = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white',
        warning: 'bg-yellow-600 text-black'
    };
    const icones = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    notificacao.className += ` ${cores[tipo] || cores.info}`;
    notificacao.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas ${icones[tipo] || icones.info} text-xl"></i>
            <span class="font-semibold">${mensagem}</span>
        </div>
    `;
    document.body.appendChild(notificacao);
    // Animar entrada
    setTimeout(() => {
        notificacao.style.transform = 'translateX(0)';
    }, 50);
    // Remover após 3s
    setTimeout(() => {
        notificacao.style.transform = 'translateX(400px)';
        setTimeout(() => {
            try { document.body.removeChild(notificacao); } catch(e){/* ignore */ }
        }, 300);
    }, 3000);
}
window.mostrarNotificacao = mostrarNotificacao;

/* ===========================
   MOBILE MENU
   =========================== */
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('mobile-menu-enter');

        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            if (mobileMenu.classList.contains('hidden')) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
}

/* ===========================
   SMOOTH SCROLL
   =========================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    });
});

/* ===========================
   SOLICITAR SERVIÇO -> WhatsApp
   - Usa data-service="Nome do Serviço" em botões
   - Migra onclicks que contenham solicitarServico(...) para data-service automaticamente
   =========================== */
function abrirWhatsAppMensagem(serviceName) {
    const mensagem = `Olá! Tenho interesse no serviço: ${serviceName}`;
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function solicitarServicoHandler(ev) {
    const btn = ev.currentTarget || ev.target.closest('button, a');
    const serviceName = btn && (btn.dataset.service || btn.getAttribute('data-service'));
    if (!serviceName) {
        console.warn('Botão "Solicitar Serviço" sem data-service');
        return;
    }
    // feedback visual
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Abrindo WhatsApp...';
    btn.classList.add('success');
    abrirWhatsAppMensagem(serviceName);

    setTimeout(() => {
        try { btn.innerHTML = originalHTML; } catch (e) { /* ignore */ }
        btn.classList.remove('success');
    }, 2000);
}

// Migra handlers inline onclick="solicitarServico('...')" -> data-service + listener
function migrateSolicitarServicoHandlers() {
    const elements = Array.from(document.querySelectorAll('button, a'));
    elements.forEach(el => {
        // se já tem data-service e sem listener, adiciona
        if (el.dataset.service) {
            if (!el._solicitarServicoAttached) {
                el.addEventListener('click', solicitarServicoHandler);
                el._solicitarServicoAttached = true;
            }
            return;
        }
        const onclick = el.getAttribute('onclick') || '';
        const match = onclick.match(/solicitarServico\s*\(\s*['"`]([\s\S]*?)['"`]\s*\)/);
        if (match && match[1]) {
            const serviceName = match[1];
            el.dataset.service = serviceName;
            el.removeAttribute('onclick');
            if (!el._solicitarServicoAttached) {
                el.addEventListener('click', solicitarServicoHandler);
                el._solicitarServicoAttached = true;
            }
        }
    });
}

// Delegation fallback: captura clicks em elementos com data-service (por segurança)
document.addEventListener('click', (ev) => {
    const target = ev.target.closest && ev.target.closest('[data-service]');
    if (target && !target._solicitarServicoAttached) {
        target.addEventListener('click', solicitarServicoHandler);
        target._solicitarServicoAttached = true;
    }
});

// Executa migração ao DOMContentLoaded
document.addEventListener('DOMContentLoaded', migrateSolicitarServicoHandlers);

/* ===========================
   HEADER SCROLL EFFECT
   =========================== */
const headerEl = document.querySelector('header');
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (!headerEl) return;
    if (currentScroll > 10) headerEl.classList.add('shadow-2xl');
    else headerEl.classList.remove('shadow-2xl');
    lastScroll = currentScroll;
});

/* ===========================
   ANIMAÇÃO DE ENTRADA DOS CARDS
   - Usa a classe .in-view adicionada pelo IntersectionObserver
   - CSS deve ter .service-card { opacity:0; transform: translateY(20px) } e .service-card.in-view { opacity:1; transform: translateY(0) }
   =========================== */
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            cardObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.service-card').forEach(card => cardObserver.observe(card));

/* ===========================
   CONTADOR DE SERVIÇOS (console)
   =========================== */
function contarServicos() {
    const servicosExternos = document.querySelectorAll('#servicos-externos .service-card').length;
    const servicosInternos = document.querySelectorAll('#servicos-internos .service-card').length;
    const total = servicosExternos + servicosInternos;
    console.log(`📊 Total de serviços: ${total} (Externos: ${servicosExternos}, Internos: ${servicosInternos})`);
}
window.addEventListener('load', contarServicos);

/* ===========================
   LAZY LOADING DE IMAGENS
   =========================== */
const lazyImageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) img.src = img.dataset.src;
            img.classList.add('loaded');
            lazyImageObserver.unobserve(img);
        }
    });
}, { rootMargin: '200px 0px' });

document.querySelectorAll('img[data-src]').forEach(img => lazyImageObserver.observe(img));

/* ===========================
   BOTÃO VOLTAR AO TOPO
   =========================== */
function criarBotaoVoltarTopo() {
    if (document.getElementById('back-to-top')) return;
    const botao = document.createElement('button');
    botao.id = 'back-to-top';
    botao.className = 'fixed bottom-24 right-6 w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-300 opacity-0 pointer-events-none z-40';
    botao.innerHTML = '<i class="fas fa-arrow-up"></i>';
    botao.setAttribute('aria-label', 'Voltar ao topo');
    botao.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(botao);
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            botao.style.opacity = '1';
            botao.style.pointerEvents = 'auto';
        } else {
            botao.style.opacity = '0';
            botao.style.pointerEvents = 'none';
        }
    });
}
window.addEventListener('load', criarBotaoVoltarTopo);

/* ===========================
   TOOLTIP DINÂMICO
   =========================== */
function inicializarTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => el.classList.add('tooltip'));
}
window.addEventListener('load', inicializarTooltips);

/* ===========================
   COPIAR PARA ÁREA DE TRANSFERÊNCIA (utilitário)
   =========================== */
function copiarTexto(texto) {
    if (!texto) return;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(() => mostrarNotificacao('Copiado para área de transferência!', 'success'))
            .catch(err => console.error('Erro ao copiar:', err));
    } else {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            mostrarNotificacao('Copiado para área de transferência!', 'success');
        } catch (e) {
            console.error('Erro ao copiar:', e);
        }
        document.body.removeChild(ta);
    }
}
window.copiarTexto = copiarTexto;

/* ===========================
   BARRA DE BUSCA (filtro de serviços)
   =========================== */
function criarBarraBusca() {
    const heroSection = document.querySelector('section.pt-32') || document.querySelector('section');
    if (!heroSection) return;
    const buscaContainer = document.createElement('div');
    buscaContainer.className = 'container mx-auto mt-8 max-w-2xl';
    buscaContainer.innerHTML = `
        <div class="relative">
            <input id="busca-servicos" type="text" placeholder="Buscar serviços..." class="w-full px-6 py-4 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none"/>
            <i class="fas fa-search absolute right-6 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
        </div>
    `;
    heroSection.appendChild(buscaContainer);
    const input = document.getElementById('busca-servicos');
    if (!input) return;
    input.addEventListener('input', (e) => {
        const termo = e.target.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.service-card');
        let encontrados = 0;
        cards.forEach(card => {
            const titulo = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
            const descricao = card.querySelector('p') ? card.querySelector('p').textContent.toLowerCase() : '';
            if (!termo || titulo.includes(termo) || descricao.includes(termo)) {
                card.style.display = '';
                encontrados++;
            } else {
                card.style.display = 'none';
            }
        });
        if (termo && encontrados === 0) mostrarNotificacao('Nenhum serviço encontrado', 'info');
    });
}
window.addEventListener('load', criarBarraBusca);

/* ===========================
   PREVENÇÃO DE CLIQUE DUPLO (aplica só a botões relevantes)
   =========================== */
let clickPrevenido = false;
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;
    // aplica prevenção apenas para botões de solicitação e envio de review
    if (btn.dataset.service || btn.id === 'submit-review') {
        if (clickPrevenido) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }
        clickPrevenido = true;
        setTimeout(() => { clickPrevenido = false; }, 1000);
    }
});

/* ===========================
   PERFORMANCE MONITORING (simples)
   =========================== */
window.addEventListener('load', () => {
    try {
        if ('performance' in window && performance.timing) {
            const t = performance.timing;
            const loadTime = t.loadEventEnd - t.navigationStart;
            console.log(`⚡ Tempo de carregamento: ${loadTime}ms`);
        }
    } catch (e) { /* ignore */ }
});

/* ===========================
   TEMA (light/dark) - simples
   =========================== */
function alternarTema() {
    document.body.classList.toggle('light-mode');
    const tema = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('tema', tema);
}
window.alternarTema = alternarTema;
window.addEventListener('load', () => {
    const tema = localStorage.getItem('tema');
    if (tema === 'light') document.body.classList.add('light-mode');
});

/* ===========================
   EASTER EGG (Konami)
   =========================== */
let konamiBuffer = [];
const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
document.addEventListener('keydown', (e) => {
    konamiBuffer.push(e.key);
    konamiBuffer = konamiBuffer.slice(-konamiSeq.length);
    if (konamiBuffer.join(',') === konamiSeq.join(',')) {
        mostrarNotificacao('🐉 Dragão asiático ativado! 🎮', 'success');
        document.body.style.animation = 'float 2s ease-in-out infinite';
        setTimeout(() => { document.body.style.animation = ''; }, 5000);
    }
});

/* ===========================
   LOG DE INICIALIZAÇÃO
   =========================== */
console.log(`
╔════════════════════════════════════════╗
║  🐉 Site de Serviços de TI            ║
║  👨‍💻 Pablo Tasuyuki                      ║
║  ✅ JavaScript carregado com sucesso   ║
╚════════════════════════════════════════╝
`);

/* ===========================
   AUTENTICAÇÃO + UI (Google Sign-In)
   - updateAuthUI(user)
   - startGoogleSignIn()
   =========================== */
function updateAuthUI(user) {
    const authArea = document.getElementById('auth-area');
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    const loginAction = document.getElementById('login-action');
    const userNameEl = document.getElementById('user-name');

    if (user) {
        currentUser = user;
        // topo (auth-area)
        if (authArea) {
            authArea.innerHTML = `
                <img src="${user.photoURL || ''}" alt="${user.displayName || ''}" class="w-9 h-9 rounded-full border border-slate-700 shadow-sm" title="${user.displayName || 'Usuário'}" />
                <button id="logout-btn" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg">Sair</button>
            `;
            const outBtn = document.getElementById('logout-btn');
            if (outBtn) outBtn.addEventListener('click', () => firebaseAuth.signOut());
        }
        if (loginBtnMobile) loginBtnMobile.style.display = 'none';
        if (loginAction) loginAction.innerHTML = `<button id="logout-action" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg">Sair</button>`;
        if (document.getElementById('logout-action')) {
            document.getElementById('logout-action').addEventListener('click', () => firebaseAuth.signOut());
        }
        if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'Usuário';
    } else {
        currentUser = null;
        if (authArea) {
            authArea.innerHTML = `
                <button id="login-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg flex items-center space-x-2">
                    <i class="fab fa-google"></i><span>Login</span>
                </button>
            `;
            const lbtn = document.getElementById('login-btn');
            if (lbtn) lbtn.addEventListener('click', startGoogleSignIn);
        }
        if (loginBtnMobile) {
            loginBtnMobile.style.display = 'inline-flex';
            loginBtnMobile.addEventListener('click', startGoogleSignIn);
        }
        if (loginAction) loginAction.innerHTML = `<button id="login-action-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg">Entrar com Google</button>`;
        if (document.getElementById('login-action-btn')) {
            document.getElementById('login-action-btn').addEventListener('click', startGoogleSignIn);
        }
        if (userNameEl) userNameEl.textContent = 'Você não está conectado';
    }
}

function startGoogleSignIn() {
    if (!firebaseAuth) {
        mostrarNotificacao('Firebase não configurado. Insira seu firebaseConfig e inclua os SDKs.', 'error');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseAuth.signInWithPopup(provider).catch(err => {
        console.error('Erro no sign-in:', err);
        mostrarNotificacao('Erro ao entrar com Google', 'error');
    });
}

// Conecta botões já existentes
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', startGoogleSignIn);
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    if (loginBtnMobile) loginBtnMobile.addEventListener('click', startGoogleSignIn);
    const loginAction = document.getElementById('login-action');
    if (loginAction) loginAction.addEventListener('click', startGoogleSignIn);
});

/* ===========================
   AVALIAÇÕES / REVIEWS (Firestore)
   - renderStars
   - submitReview
   - listenReviews (onSnapshot)
   =========================== */
const reviewsListEl = document.getElementById('reviews-list');
const ratingStarsEl = document.getElementById('rating-stars');
const submitReviewBtn = document.getElementById('submit-review');
const reviewTextEl = document.getElementById('review-text');
const averageRatingEl = document.getElementById('average-rating');

let selectedRating = 10;

function renderStars(container, selected = 10) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `p-1 rounded ${i <= selected ? 'text-yellow-400' : 'text-slate-500'} hover:text-yellow-300`;
        btn.innerHTML = `<i class="fas fa-star"></i>`;
        btn.dataset.value = i;
        btn.title = `${i} / 10`;
        btn.addEventListener('click', () => {
            selectedRating = i;
            renderStars(container, selectedRating);
        });
        container.appendChild(btn);
    }
}

// Inicializa estrelas
document.addEventListener('DOMContentLoaded', () => {
    if (ratingStarsEl) renderStars(ratingStarsEl, selectedRating);
});

// Submit review
async function submitReview() {
    if (!firebaseAuth || !firebaseDB) {
        mostrarNotificacao('Firebase não configurado. Não é possível enviar avaliações.', 'error');
        return;
    }
    const user = firebaseAuth.currentUser;
    if (!user) {
        mostrarNotificacao('Faça login com Google para enviar uma avaliação.', 'warning');
        return;
    }
    const text = reviewTextEl ? reviewTextEl.value.trim() : '';
    if (!text) {
        mostrarNotificacao('Escreva um comentário antes de enviar.', 'info');
        return;
    }

    const review = {
        uid: user.uid,
        name: user.displayName || user.email,
        photoURL: user.photoURL || '',
        rating: selectedRating,
        comment: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await firebaseDB.collection('reviews').add(review);
        mostrarNotificacao('Avaliação enviada! Obrigado.', 'success');
        if (reviewTextEl) reviewTextEl.value = '';
    } catch (err) {
        console.error('Erro ao enviar avaliação:', err);
        mostrarNotificacao('Erro ao enviar avaliação', 'error');
    }
}

if (submitReviewBtn) submitReviewBtn.addEventListener('click', submitReview);

// Escuta avaliações (realtime)
function listenReviews() {
    if (!firebaseDB) {
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Firestore não configurado.</div>';
        return;
    }
    const col = firebaseDB.collection('reviews').orderBy('createdAt', 'desc');
    col.onSnapshot(snapshot => {
        const docs = [];
        let sum = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            docs.push(Object.assign({ id: doc.id }, data));
            sum += (data.rating || 0);
        });
        const avg = docs.length ? (sum / docs.length).toFixed(1) : '--';
        if (averageRatingEl) averageRatingEl.textContent = avg;
        if (!reviewsListEl) return;
        if (!docs.length) {
            reviewsListEl.innerHTML = '<div class="text-slate-400">Ainda não há avaliações. Seja o primeiro!</div>';
            return;
        }
        reviewsListEl.innerHTML = '';
        docs.forEach(d => {
            const item = document.createElement('div');
            item.className = 'bg-slate-900/50 p-4 rounded-lg border border-slate-700/40';
            const when = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : '';
            item.innerHTML = `
                <div class="flex items-start gap-3">
                    <img src="${d.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}" alt="${d.name || 'Usuário'}" class="w-12 h-12 rounded-full object-cover" />
                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="font-semibold">${d.name || 'Usuário'}</div>
                                <div class="text-sm text-slate-400">${when}</div>
                            </div>
                            <div class="text-yellow-400 font-bold">${d.rating || 0} / 10</div>
                        </div>
                        <p class="mt-2 text-slate-300">${d.comment || ''}</p>
                    </div>
                </div>
            `;
            reviewsListEl.appendChild(item);
        });
    }, (err) => {
        console.error('Erro ao ler reviews:', err);
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
    });
}
document.addEventListener('DOMContentLoaded', listenReviews);

/* ===========================
   Exports úteis para console
   =========================== */
window.solicitarServico = function(serviceName) {
    // fallback programmatic call: procura botão com data-service igual e simula clique
    const btn = document.querySelector(`[data-service="${serviceName}"]`);
    if (btn) {
        btn.click();
    } else {
        abrirWhatsAppMensagem(serviceName);
    }
};
window.mostrarNotificacao = mostrarNotificacao;

/* ===========================
   FIM DO ARQUIVO
   =========================== */
