const firebaseConfig = {
    apiKey: "AIzaSyDALe6eKby-7JaCBvej9iqr95Y97s6oHWg",
    authDomain: "flutter-ai-playground-7971c.firebaseapp.com",
    projectId: "flutter-ai-playground-7971c",
    storageBucket: "flutter-ai-playground-7971c.firebasestorage.app",
    messagingSenderId: "623047073166",
    appId: "1:623047073166:web:83d31c6c017b2e70af58df"
};

const WHATSAPP_PHONE = '5551997395967';

/* ===========================
   RUNTIME VARIABLES
   =========================== */
let firebaseAuth = null;
let firebaseDB = null;
let currentUser = null;

/* ===========================
   UTIL: Notificações
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
    requestAnimationFrame(() => { notificacao.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        notificacao.style.transform = 'translateX(400px)';
        setTimeout(() => { try { notificacao.remove(); } catch(e) {} }, 300);
    }, 3000);
}
window.mostrarNotificacao = mostrarNotificacao;

/* ===========================
   Inicializa Firebase (modo compat)
   =========================== */
(function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('[Firebase] SDK compat não detectado. Verifique se os scripts foram incluídos antes do script.js');
            return;
        }
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseAuth = firebase.auth();
        firebaseDB = firebase.firestore();

        firebaseAuth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI(user);
            console.log('[auth] onAuthStateChanged, uid=', user ? user.uid : null);
        });

        // Handle redirect result (if redirect fallback used)
        firebaseAuth.getRedirectResult().then(result => {
            if (result && result.user) {
                console.log('[auth] getRedirectResult user logged via redirect:', result.user.uid);
                mostrarNotificacao('Autenticado (redirect) com sucesso!', 'success');
            }
        }).catch(err => {
            if (err && err.code) console.warn('[auth] getRedirectResult error:', err.code, err.message);
        });

        console.log('[Firebase] inicializado com sucesso (modo compat)');
    } catch (err) {
        console.error('[Firebase] erro ao inicializar:', err);
    }
})();

/* ===========================
   MOBILE MENU
   =========================== */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenuBtn || !mobileMenu) return;
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('mobile-menu-enter');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            if (mobileMenu.classList.contains('hidden')) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
            else { icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
        }
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
        });
    });
}

/* ===========================
   SMOOTH SCROLL
   =========================== */
function initSmoothScroll() {
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
}

/* ===========================
   WHATSAPP: solicitar serviço
   =========================== */
function abrirWhatsAppMensagem(serviceName) {
    const mensagem = `Olá! Tenho interesse no serviço: ${serviceName}`;
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function solicitarServicoHandler(ev) {
    const el = ev.currentTarget || ev.target.closest('button, a');
    const serviceName = el && (el.dataset.service || el.getAttribute('data-service'));
    if (!serviceName) return;
    const originalHTML = el.innerHTML;
    el.innerHTML = '<i class="fas fa-check"></i> Abrindo WhatsApp...';
    el.classList.add('success');
    abrirWhatsAppMensagem(serviceName);
    setTimeout(() => { try { el.innerHTML = originalHTML; el.classList.remove('success'); } catch(e){} }, 2000);
}

function migrateSolicitarServicoHandlers() {
    const elements = Array.from(document.querySelectorAll('button, a'));
    elements.forEach(el => {
        if (el.dataset.service) {
            if (!el._solicitarServicoAttached) { el.addEventListener('click', solicitarServicoHandler); el._solicitarServicoAttached = true; }
            return;
        }
        const onclick = el.getAttribute('onclick') || '';
        const match = onclick.match(/solicitarServico\s*\(\s*['"`]([\s\S]*?)['"`]\s*\)/);
        if (match && match[1]) {
            el.dataset.service = match[1];
            el.removeAttribute('onclick');
            if (!el._solicitarServicoAttached) { el.addEventListener('click', solicitarServicoHandler); el._solicitarServicoAttached = true; }
        }
    });
}

/* ===========================
   HEADER EFFECT
   =========================== */
function initHeaderEffect() {
    const header = document.querySelector('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 10) header.classList.add('shadow-2xl');
        else header.classList.remove('shadow-2xl');
    });
}

/* ===========================
   CARD OBSERVER
   =========================== */
function initCardObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.service-card').forEach(card => observer.observe(card));
}

/* ===========================
   LAZY IMAGES
   =========================== */
function initLazyImages() {
    if (!('IntersectionObserver' in window)) return;
    const imgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) img.src = img.dataset.src;
                img.classList.add('loaded');
                imgObserver.unobserve(img);
            }
        });
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
}

/* ===========================
   BACK TO TOP
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
        if (window.pageYOffset > 300) { botao.style.opacity = '1'; botao.style.pointerEvents = 'auto'; }
        else { botao.style.opacity = '0'; botao.style.pointerEvents = 'none'; }
    });
}

/* ===========================
   BUSCA
   =========================== */
function criarBarraBusca() {
    const hero = document.querySelector('section.pt-32') || document.querySelector('section');
    if (!hero) return;
    const container = document.createElement('div');
    container.className = 'container mx-auto mt-8 max-w-2xl';
    container.innerHTML = `
        <div class="relative">
            <input id="busca-servicos" type="text" placeholder="Buscar serviços..." class="w-full px-6 py-4 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none"/>
            <i class="fas fa-search absolute right-6 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
        </div>
    `;
    hero.appendChild(container);
    const input = document.getElementById('busca-servicos');
    if (!input) return;
    input.addEventListener('input', (e) => {
        const termo = e.target.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.service-card');
        let count = 0;
        cards.forEach(card => {
            const titulo = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
            const desc = card.querySelector('p') ? card.querySelector('p').textContent.toLowerCase() : '';
            if (!termo || titulo.includes(termo) || desc.includes(termo)) { card.style.display = ''; count++; } else { card.style.display = 'none'; }
        });
        if (termo && count === 0) mostrarNotificacao('Nenhum serviço encontrado', 'info');
    });
}

/* ===========================
   LOGIN / AUTH UI
   =========================== */
function setLoginButtonLoading(loading = true) {
    const btn = document.querySelector('#auth-area button, #login-btn, #login-btn-mobile, #login-action-btn');
    if (!btn) return;
    if (loading) {
        btn.dataset._orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Aguarde...`;
    } else {
        btn.disabled = false;
        if (btn.dataset._orig) btn.innerHTML = btn.dataset._orig;
    }
}

function startGoogleSignIn() {
    console.log('[signin] startGoogleSignIn called');
    if (typeof firebase === 'undefined' || !firebase.auth) {
        mostrarNotificacao('Firebase SDK não carregado.', 'error');
        return;
    }
    if (!firebaseAuth) firebaseAuth = firebase.auth();

    setLoginButtonLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();

    firebaseAuth.signInWithPopup(provider)
      .then(result => {
        console.log('[signin] signInWithPopup success', result.user && result.user.uid);
        mostrarNotificacao('Logado com sucesso!', 'success');
      })
      .catch(err => {
        console.error('[signin] signInWithPopup erro:', err);
        const fallback = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (err && err.code && fallback.includes(err.code)) {
          mostrarNotificacao('Popup bloqueado ou fechado — redirecionando...', 'warning');
          firebaseAuth.signInWithRedirect(provider);
          return;
        }
        if (err && err.code === 'auth/unauthorized-domain') {
          mostrarNotificacao('Domínio não autorizado. Adicione-o em Authentication → Authorized domains.', 'error');
        } else if (err && err.code === 'auth/operation-not-allowed') {
          mostrarNotificacao('Provedor Google desabilitado no Firebase. Ative em Authentication → Sign-in method.', 'error');
        } else {
          mostrarNotificacao('Erro ao entrar com Google (veja console).', 'error');
        }
      })
      .finally(() => setLoginButtonLoading(false));
}

function updateAuthUI(user) {
    const authArea = document.getElementById('auth-area');
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    const loginAction = document.getElementById('login-action');
    const userNameEl = document.getElementById('user-name');

    if (user) {
        currentUser = user;
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

/* ===========================
   REVIEWS: UI e Firestore
   =========================== */
let selectedRating = 10;

function renderStarsNumeric(container, selected = 10) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-3 py-1 rounded ${i <= selected ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`;
        btn.style.minWidth = '34px';
        btn.style.marginRight = '6px';
        btn.title = `${i} de 10`;
        btn.innerText = i;
        btn.dataset.value = i;
        btn.addEventListener('click', () => {
            selectedRating = i;
            renderStarsNumeric(container, selectedRating);
        });
        container.appendChild(btn);
    }
}

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
    const reviewTextEl = document.getElementById('review-text');
    const text = reviewTextEl ? reviewTextEl.value.trim() : '';
    if (!text) { mostrarNotificacao('Escreva um comentário antes de enviar.', 'info'); return; }

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
        if (err && err.code === 'permission-denied') {
            mostrarNotificacao('Permissão negada ao gravar. Verifique as regras do Firestore.', 'error');
        } else {
            mostrarNotificacao('Erro ao enviar avaliação (veja console).', 'error');
        }
    }
}

function listenReviews() {
    const reviewsListEl = document.getElementById('reviews-list');
    const averageRatingEl = document.getElementById('average-rating');
    if (!firebaseDB) {
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Firestore não configurado.</div>';
        return;
    }
    try {
        firebaseDB.collection('reviews').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
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
            if (!docs.length) { reviewsListEl.innerHTML = '<div class="text-slate-400">Ainda não há avaliações. Seja o primeiro!</div>'; return; }
            reviewsListEl.innerHTML = '';
            docs.forEach(d => {
                const when = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : '';
                const item = document.createElement('div');
                item.className = 'bg-slate-900/50 p-4 rounded-lg border border-slate-700/40';
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
        }, err => {
            console.error('Erro ao ler reviews (onSnapshot):', err);
            if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
            if (err && err.code === 'permission-denied') {
                mostrarNotificacao('Permissão negada ao ler avaliações. Ajuste as regras do Firestore.', 'error');
            }
        });
    } catch (e) {
        console.error('listenReviews exception:', e);
    }
}

/* ===========================
   Prevenção clique duplo
   =========================== */
let clickPrevenido = false;
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.service || btn.id === 'submit-review') {
        if (clickPrevenido) { e.preventDefault(); e.stopImmediatePropagation(); return false; }
        clickPrevenido = true;
        setTimeout(() => clickPrevenido = false, 1000);
    }
});

/* ===========================
   Inicialização ao carregar DOM
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initSmoothScroll();
    migrateSolicitarServicoHandlers();
    initHeaderEffect();
    initCardObserver();
    initLazyImages();
    criarBotaoVoltarTopo();
    criarBarraBusca();

    // rating UI
    const ratingContainer = document.getElementById('rating-stars');
    if (ratingContainer) renderStarsNumeric(ratingContainer, selectedRating);

    // conecta submit review
    const submitBtn = document.getElementById('submit-review');
    if (submitBtn) submitBtn.addEventListener('click', submitReview);

    // conecta login buttons (fallbacks)
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', startGoogleSignIn);
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    if (loginBtnMobile) loginBtnMobile.addEventListener('click', startGoogleSignIn);
    const loginAction = document.getElementById('login-action');
    if (loginAction) loginAction.addEventListener('click', startGoogleSignIn);

    // start listening reviews (realtime)
    listenReviews();

    console.log('[script] inicialização completa');
});

/* ===========================
   Debug helpers
   =========================== */
window.debugFirebase = function() {
    if (typeof firebase === 'undefined') {
        console.log('Firebase não definido nesta página.');
        return;
    }
    try {
        console.log('firebase.app().options =', firebase.app().options);
        console.log('firebase.apps.length =', firebase.apps.length);
        console.log('firebase.auth() available?', !!firebase.auth);
        console.log('firebase.firestore() available?', !!firebase.firestore);
        console.log('firebaseAuth var?', !!firebaseAuth);
        console.log('currentUser', currentUser);
    } catch (e) {
        console.error('debugFirebase error', e);
    }
};

window.solicitarServico = function(serviceName) {
    const btn = document.querySelector(`[data-service="${serviceName}"]`);
    if (btn) btn.click();
    else abrirWhatsAppMensagem(serviceName);
};
