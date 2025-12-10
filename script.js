const firebaseConfig = {
    apiKey: "AIzaSyDALe6eKby-7JaCBvej9iqr95Y97s6oHWg",
    authDomain: "flutter-ai-playground-7971c.firebaseapp.com",
    projectId: "flutter-ai-playground-7971c",
    storageBucket: "flutter-ai-playground-7971c.firebasestorage.app",
    messagingSenderId: "623047073166",
    appId: "1:623047073166:web:83d31c6c017b2e70af58df"
};

const WHATSAPP_PHONE = '5551997395967';
const LOCAL_REVIEWS_KEY = 'local_reviews_v3';
const REVIEWS_PAGE_SIZE = 5;

/* ===========================
   RUNTIME VARS
   =========================== */
let firebaseAuth = null;
let firebaseDB = null;
let currentUser = null;
let reviewsCache = []; // array of reviews (most recent first)
let reviewsPage = 1;

/* ===========================
   UTIL: Notificações (usadas moderadamente)
   =========================== */
function mostrarNotificacao(mensagem, tipo = 'info') {
    // usada apenas para sucessos/erros importantes; permission-denied leitura NÃO mostra global
    try {
        const cores = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-blue-600 text-white',
            warning: 'bg-yellow-600 text-black'
        };
        const el = document.createElement('div');
        el.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 translate-x-full ${cores[tipo] || cores.info}`;
        el.style.zIndex = 99999;
        el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}" style="font-size:18px"></i><span style="font-weight:600">${mensagem}</span></div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.style.transform = 'translateX(0)');
        setTimeout(() => {
            el.style.transform = 'translateX(420px)';
            setTimeout(() => { try { el.remove(); } catch (e) {} }, 300);
        }, 3000);
    } catch (e) { console.warn('mostrarNotificacao erro', e); }
}

/* ===========================
   FIREBASE: inicialização (compat)
   =========================== */
(function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('[initFirebase] Firebase SDK compat NÃO detectado. O site seguirá com fallback localStorage para reviews.');
            return;
        }
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseDB = firebase.firestore();

        firebaseAuth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI(user);
            // attach handlers again in case UI injected
            try { attachUserMenuHandlersOnce(); } catch (e) {}
        });

        // getRedirectResult handle quietly (se usar redirect fallback)
        firebaseAuth.getRedirectResult().catch(() => {});
        console.log('[initFirebase] Firebase inicializado (compat).');
    } catch (err) {
        console.error('[initFirebase] erro ao inicializar Firebase:', err);
        firebaseAuth = null;
        firebaseDB = null;
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
        if (!icon) return;
        if (mobileMenu.classList.contains('hidden')) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
        else { icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
    });
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
    }));
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
   SOLICITAR SERVIÇO -> WHATSAPP (migração onclick -> data-service)
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
    setTimeout(() => { try { el.innerHTML = originalHTML; el.classList.remove('success'); } catch (e) {} }, 2000);
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
    try {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.service-card').forEach(card => observer.observe(card));
    } catch (e) { /* ignore */ }
}

/* ===========================
   LAZY IMAGES
   =========================== */
function initLazyImages() {
    if (!('IntersectionObserver' in window)) return;
    try {
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
    } catch (e) {}
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
   USER MENU (NOME DO USUÁRIO + DROPDOWN)
   =========================== */
function createUserMenuElement(user) {
    const wrap = document.createElement('div');
    wrap.className = 'user-menu-wrap';
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-block';
    const display = user.displayName || user.email || 'Usuário';
    const short = display.length > 18 ? display.slice(0, 15) + '...' : display;
    wrap.innerHTML = `
        <button class="user-menu-btn" type="button" aria-expanded="false" style="display:flex;align-items:center;gap:8px;background:transparent;border:none;color:inherit;cursor:pointer;padding:6px 8px;">
            <img src="${user.photoURL || ''}" alt="${display}" style="width:28px;height:28px;border-radius:999px;object-fit:cover" />
            <span class="user-menu-label" style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${short}</span>
            <i class="fas fa-chevron-down" style="margin-left:6px"></i>
        </button>
        <div class="user-menu-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 6px);min-width:160px;background:#0f172a;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.5);z-index:999;padding:6px 0;">
            <button class="user-switch-btn" type="button" style="display:block;width:100%;text-align:left;padding:10px 12px;background:transparent;border:none;color:#e6eef8;cursor:pointer">Trocar login</button>
            <button class="user-logout-btn" type="button" style="display:block;width:100%;text-align:left;padding:10px 12px;background:transparent;border:none;color:#e6eef8;cursor:pointer">Sair</button>
        </div>
    `;
    return wrap;
}

function attachUserMenuHandlersOnce() {
    // attach handlers to any .user-menu-wrap (idempotent)
    document.querySelectorAll('.user-menu-wrap').forEach(wrap => {
        if (wrap._attached) return;
        const btn = wrap.querySelector('.user-menu-btn');
        const dropdown = wrap.querySelector('.user-menu-dropdown');
        const switchBtn = wrap.querySelector('.user-switch-btn');
        const logoutBtn = wrap.querySelector('.user-logout-btn');

        if (btn && dropdown) {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const shown = dropdown.style.display === 'block';
                dropdown.style.display = shown ? 'none' : 'block';
                btn.setAttribute('aria-expanded', String(!shown));
            });

            // close on outside click
            document.addEventListener('click', (e) => {
                if (!wrap.contains(e.target)) {
                    dropdown.style.display = 'none';
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });

            // close on Esc
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    dropdown.style.display = 'none';
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (firebaseAuth) {
                    firebaseAuth.signOut().then(() => {
                        // conforme pedido: sem notificação global
                        console.log('Usuário deslogado');
                    }).catch(err => {
                        console.error('Erro ao sair:', err);
                        mostrarNotificacao('Erro ao sair (veja console)', 'error');
                    });
                }
                if (dropdown) dropdown.style.display = 'none';
            });
        }

        if (switchBtn) {
            switchBtn.addEventListener('click', () => {
                if (firebaseAuth) {
                    firebaseAuth.signOut().then(() => {
                        if (dropdown) dropdown.style.display = 'none';
                        setTimeout(() => startGoogleSignIn(), 250);
                    }).catch(err => {
                        console.error('Erro ao trocar login:', err);
                        startGoogleSignIn();
                    });
                } else {
                    startGoogleSignIn();
                }
            });
        }

        wrap._attached = true;
    });
}

/* ===========================
   UPDATE AUTH UI (insere menu no lugar apropriado)
   =========================== */
function updateAuthUI(user) {
    const authArea = document.getElementById('auth-area');
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    const loginAction = document.getElementById('login-action');
    const userNameEl = document.getElementById('user-name');
    if (user) {
        currentUser = user;
        if (authArea) {
            authArea.innerHTML = '';
            const menu = createUserMenuElement(user);
            authArea.appendChild(menu);
            attachUserMenuHandlersOnce();
        }
        if (loginAction) {
            loginAction.innerHTML = '';
            const menu2 = createUserMenuElement(user);
            loginAction.appendChild(menu2);
            attachUserMenuHandlersOnce();
        }
        if (loginBtnMobile) loginBtnMobile.style.display = 'none';
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
        if (loginAction) {
            loginAction.innerHTML = `<button id="login-action-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg">Entrar com Google</button>`;
            const actionBtn = document.getElementById('login-action-btn');
            if (actionBtn) actionBtn.addEventListener('click', startGoogleSignIn);
        }
        if (loginBtnMobile) {
            loginBtnMobile.style.display = 'inline-flex';
            loginBtnMobile.addEventListener('click', startGoogleSignIn);
        }
        if (userNameEl) userNameEl.textContent = 'Você não está conectado';
    }
}

/* ===========================
   LOGIN: popup + redirect fallback
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
    if (typeof firebase === 'undefined' || !firebase.auth) {
        mostrarNotificacao('Firebase SDK não carregado.', 'error');
        return;
    }
    if (!firebaseAuth) firebaseAuth = firebase.auth();
    setLoginButtonLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseAuth.signInWithPopup(provider)
    .then(result => {
        console.log('[signin] sucesso', result && result.user && result.user.uid);
        mostrarNotificacao('Logado com sucesso!', 'success');
    })
    .catch(err => {
        console.error('[signin] erro', err);
        const fallback = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (err && err.code && fallback.includes(err.code)) {
            console.log('[signin] popup bloqueado/fechado - usando redirect');
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

/* ===========================
   REVIEWS: localStorage fallback helpers
   =========================== */
function loadLocalReviews() {
    try {
        const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        console.error('loadLocalReviews parse error', e);
        return [];
    }
}

function saveLocalReviews(arr) {
    try { localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(arr || [])); }
    catch (e) { console.error('saveLocalReviews', e); }
}

function appendLocalReview(review) {
    const arr = loadLocalReviews();
    arr.unshift(review);
    saveLocalReviews(arr);
}

/* ===========================
   REVIEWS: stars 1..10
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

/* ===========================
   REVIEWS: render page, pagination controls
   =========================== */
function renderReviewsPage(page = 1) {
    const reviewsListEl = document.getElementById('reviews-list');
    const averageRatingEl = document.getElementById('average-rating');
    const paginationEl = document.getElementById('reviews-pagination');
    if (!reviewsListEl) return;

    const total = reviewsCache.length;
    const pageSize = REVIEWS_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(Math.max(1, page), totalPages);
    reviewsPage = page;

    const start = (page - 1) * pageSize;
    const slice = reviewsCache.slice(start, start + pageSize);

    const sum = reviewsCache.reduce((s, r) => s + (r.rating || 0), 0);
    const avg = reviewsCache.length ? (sum / reviewsCache.length).toFixed(1) : '--';
    if (averageRatingEl) averageRatingEl.textContent = avg;

    if (!slice.length) {
        reviewsListEl.innerHTML = '<div class="text-slate-400">Ainda não há avaliações. Seja o primeiro!</div>';
    } else {
        reviewsListEl.innerHTML = '';
        slice.forEach(d => {
            const when = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : (d.createdAt || '');
            const item = document.createElement('div');
            item.className = 'bg-slate-900/50 p-4 rounded-lg border border-slate-700/40 mb-3';
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
    }

    // pagination controls
    if (paginationEl) {
        paginationEl.innerHTML = '';
        const prev = document.createElement('button');
        prev.textContent = 'Anterior';
        prev.className = 'px-3 py-1 rounded bg-slate-700 text-white mr-2';
        prev.disabled = page <= 1;
        prev.addEventListener('click', () => renderReviewsPage(reviewsPage - 1));
        const next = document.createElement('button');
        next.textContent = 'Próxima';
        next.className = 'px-3 py-1 rounded bg-slate-700 text-white ml-2';
        next.disabled = page >= totalPages;
        next.addEventListener('click', () => renderReviewsPage(reviewsPage + 1));
        const info = document.createElement('span');
        info.textContent = `Página ${page} / ${totalPages}`;
        info.style.marginLeft = '8px';
        info.style.color = '#cbd5e1';
        paginationEl.appendChild(prev);
        paginationEl.appendChild(info);
        paginationEl.appendChild(next);
    }

    reviewsListEl.style.maxHeight = '380px';
    reviewsListEl.style.overflowY = 'auto';
}

/* ===========================
   SUBMIT REVIEW (Firestore -> fallback local)
   =========================== */
async function submitReview() {
    const reviewTextEl = document.getElementById('review-text');
    const text = reviewTextEl ? reviewTextEl.value.trim() : '';
    if (!text) { mostrarNotificacao('Escreva um comentário antes de enviar.', 'info'); return; }

    const nowIso = new Date().toISOString();
    const review = {
        uid: currentUser ? currentUser.uid : null,
        name: currentUser ? (currentUser.displayName || currentUser.email) : 'Anônimo',
        photoURL: currentUser ? (currentUser.photoURL || '') : '',
        rating: selectedRating,
        comment: text,
        createdAt: firebaseDB ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
    };

    // if Firestore available and user authenticated, try to write
    if (firebaseDB && firebaseAuth && firebaseAuth.currentUser) {
        try {
            await firebaseDB.collection('reviews').add(review);
            if (reviewTextEl) reviewTextEl.value = '';
            // onSnapshot should update reviewsCache
            return;
        } catch (err) {
            console.error('submitReview firestore error', err);
            // fallback local storage (no global notif)
            appendLocalReview(Object.assign({}, review, { createdAt: nowIso }));
            reviewsCache.unshift(Object.assign({}, review, { createdAt: nowIso }));
            renderReviewsPage(1);
            if (reviewTextEl) reviewTextEl.value = '';
            return;
        }
    }

    // otherwise save locally
    appendLocalReview(Object.assign({}, review, { createdAt: nowIso }));
    reviewsCache.unshift(Object.assign({}, review, { createdAt: nowIso }));
    renderReviewsPage(1);
    if (reviewTextEl) reviewTextEl.value = '';
}

/* ===========================
   LOAD + LISTEN REVIEWS (get + onSnapshot) with fallback
   =========================== */
function loadAndListenReviews() {
    const listEl = document.getElementById('reviews-list');
    if (!listEl) return;

    // initial loading text
    listEl.innerHTML = '<div class="text-slate-400">Carregando avaliações...</div>';

    // if no firestore -> fallback local
    if (!firebaseDB) {
        reviewsCache = loadLocalReviews();
        renderReviewsPage(1);
        return;
    }

    // try one-time get() to detect permission quickly
    firebaseDB.collection('reviews').orderBy('createdAt', 'desc').get()
    .then(snapshot => {
        const docs = [];
        snapshot.forEach(doc => docs.push(Object.assign({ id: doc.id }, doc.data())));
        // prefer server docs (may have serverTimestamp resolved)
        reviewsCache = docs;
        renderReviewsPage(1);
        // then subscribe to realtime updates
        firebaseDB.collection('reviews').orderBy('createdAt', 'desc').onSnapshot(snap => {
            const updated = [];
            snap.forEach(d => updated.push(Object.assign({ id: d.id }, d.data())));
            reviewsCache = updated;
            reviewsPage = 1;
            renderReviewsPage(1);
        }, err => {
            console.error('onSnapshot reviews error', err);
            if (err && err.code === 'permission-denied') {
                const isLogged = !!(firebaseAuth && firebaseAuth.currentUser);
                listEl.innerHTML = isLogged ? '<div class="text-slate-400">Sem permissão para ver avaliações.</div>' : '<div class="text-slate-400">Faça login para ver avaliações.</div>';
                const local = loadLocalReviews();
                if (local.length) { reviewsCache = local; renderReviewsPage(1); }
                const pag = document.getElementById('reviews-pagination'); if (pag) pag.innerHTML = '';
                return;
            }
            const local = loadLocalReviews();
            if (local.length) { reviewsCache = local; renderReviewsPage(1); }
            else listEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
        });
    })
    .catch(err => {
        console.error('get reviews error', err);
        if (err && err.code === 'permission-denied') {
            const isLogged = !!(firebaseAuth && firebaseAuth.currentUser);
            listEl.innerHTML = isLogged ? '<div class="text-slate-400">Sem permissão para ver avaliações.</div>' : '<div class="text-slate-400">Faça login para ver avaliações.</div>';
            const local = loadLocalReviews();
            if (local.length) { reviewsCache = local; renderReviewsPage(1); }
            return;
        }
        const local = loadLocalReviews();
        if (local.length) { reviewsCache = local; renderReviewsPage(1); }
        else listEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
    });
}

/* ===========================
   Prevent double click on important buttons
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
   Ensure reviews UI and attach events
   =========================== */
function ensureReviewsUI() {
    // render stars
    const ratingContainer = document.getElementById('rating-stars');
    if (ratingContainer) renderStarsNumeric(ratingContainer, selectedRating);

    // attach submit
    const submitBtn = document.getElementById('submit-review');
    if (submitBtn) {
        try { submitBtn.removeEventListener('click', submitReview); } catch (e) {}
        submitBtn.addEventListener('click', submitReview);
    }

    // ensure pagination container
    const reviewsSection = document.getElementById('reviews-section');
    if (reviewsSection && !document.getElementById('reviews-pagination')) {
        const pag = document.createElement('div');
        pag.id = 'reviews-pagination';
        pag.style.marginTop = '8px';
        reviewsSection.appendChild(pag);
    }
}

/* ===========================
   Safe wrappers to initialize other helpers (if exist)
   =========================== */
function safeInit(fn) {
    try { if (typeof fn === 'function') fn(); } catch (e) { /* ignore */ }
}

/* ===========================
   DOMContentLoaded: boot everything
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    // initialize non-invasive helpers
    safeInit(initMobileMenu);
    safeInit(initSmoothScroll);
    safeInit(migrateSolicitarServicoHandlers);
    safeInit(initHeaderEffect);
    safeInit(initCardObserver);
    safeInit(initLazyImages);
    safeInit(criarBotaoVoltarTopo);
    safeInit(criarBarraBusca);

    // ensure reviews UI
    ensureReviewsUI();

    // load and listen reviews (with fallback)
    loadAndListenReviews();

    // attach user menu handlers if any menus exist already
    try { attachUserMenuHandlersOnce(); } catch (e) {}

    console.log('[script] inicialização completa');
});

/* ===========================
   Debug helpers
   =========================== */
window.debugFirebase = function() {
    if (typeof firebase === 'undefined') { console.log('Firebase não definido'); return; }
    try {
        console.log('firebase.app().options =', firebase.app().options);
        console.log('firebase.apps.length =', firebase.apps.length);
        console.log('firebase.auth available?', !!firebase.auth);
        console.log('firebase.firestore available?', !!firebase.firestore);
        console.log('firebaseAuth var?', !!firebaseAuth);
        console.log('currentUser', currentUser);
        console.log('reviewsCache length', reviewsCache.length, 'page', reviewsPage);
    } catch (e) { console.error('debugFirebase error', e); }
};

/* ===========================
   Expose solicitarServico global helper
   =========================== */
window.solicitarServico = function(serviceName) {
    const btn = document.querySelector(`[data-service="${serviceName}"]`);
    if (btn) btn.click();
    else abrirWhatsAppMensagem(serviceName);
};
