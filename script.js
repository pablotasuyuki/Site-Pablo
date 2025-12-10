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
   UI: User menu helper (show name + dropdown)
   =========================== */
function createUserMenuMarkup(user) {
    const display = (user.displayName || user.email || 'Usuário');
    // truncate long names for button
    const short = display.length > 18 ? display.slice(0, 15) + '...' : display;
    return `
      <div class="relative inline-block" id="user-menu-wrap">
        <button id="user-menu-btn" aria-haspopup="true" aria-expanded="false" class="bg-slate-800 text-white px-3 py-1 rounded-lg flex items-center gap-2">
          <img src="${user.photoURL || ''}" alt="" class="w-7 h-7 rounded-full object-cover" />
          <span id="user-menu-label" class="truncate">${short}</span>
          <i class="fas fa-chevron-down text-sm"></i>
        </button>
        <div id="user-menu-dropdown" class="hidden absolute right-0 mt-2 w-44 bg-slate-900 rounded-md shadow-lg z-50 ring-1 ring-white/5">
          <button id="user-switch-btn" class="block w-full text-left px-4 py-2 hover:bg-slate-700">Trocar login</button>
          <button id="user-logout-btn" class="block w-full text-left px-4 py-2 hover:bg-slate-700">Sair</button>
        </div>
      </div>
    `;
}

function attachUserMenuHandlers() {
    const wrap = document.getElementById('user-menu-wrap');
    if (!wrap) return;
    const btn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-menu-dropdown');
    const logoutBtn = document.getElementById('user-logout-btn');
    const switchBtn = document.getElementById('user-switch-btn');

    function closeMenu() {
        if (!dropdown) return;
        dropdown.classList.add('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
        if (!dropdown) return;
        dropdown.classList.remove('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    if (btn) {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (!dropdown) return;
            dropdown.classList.toggle('hidden');
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', (!expanded).toString());
        });
    }

    // logout
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (firebaseAuth) firebaseAuth.signOut().then(() => {
            mostrarNotificacao('Você saiu', 'info');
        }).catch(err => {
            console.error('Erro ao sair:', err);
            mostrarNotificacao('Erro ao sair (veja console)', 'error');
        });
    });
    // switch login (sign out then open sign-in)
    if (switchBtn) switchBtn.addEventListener('click', () => {
        if (firebaseAuth) {
            firebaseAuth.signOut().then(() => {
                // small delay to ensure UI updated
                setTimeout(() => startGoogleSignIn(), 300);
            }).catch(err => {
                console.error('Erro ao trocar login:', err);
                startGoogleSignIn();
            });
        } else {
            startGoogleSignIn();
        }
    });

    // close on outside click
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closeMenu();
    });

    // close on Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

/* ===========================
   Update Auth UI (shows user name button with menu instead of plain "Sair")
   =========================== */
function updateAuthUI(user) {
    const authArea = document.getElementById('auth-area');
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    const loginAction = document.getElementById('login-action');
    const userNameEl = document.getElementById('user-name');

    if (user) {
        currentUser = user;
        if (authArea) {
            authArea.innerHTML = createUserMenuMarkup(user);
            attachUserMenuHandlers();
        }
        if (loginBtnMobile) loginBtnMobile.style.display = 'none';
        if (loginAction) loginAction.innerHTML = `<div class="inline-block" id="auth-action-mobile">${createUserMenuMarkup(user)}</div>`;
        // attach handlers for mobile auth action area (if present)
        const mobileWrap = document.getElementById('auth-action-mobile');
        if (mobileWrap) attachUserMenuHandlers();
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
   Login with Google (popup + fallback redirect)
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

/* ===========================
   Solicitar serviço -> WhatsApp (migração de onclicks)
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
   Reviews: render + submit + listen (with scrollable container)
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
            // não mostrar notificação intrusiva; exibe mensagem discreta dentro da área de reviews
            const reviewsListEl = document.getElementById('reviews-list');
            if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-slate-400">Não foi possível salvar avaliação (permissão).</div>';
        } else {
            mostrarNotificacao('Erro ao enviar avaliação (veja console).', 'error');
        }
    }
}

function makeReviewsScrollable(reviewsListEl) {
    if (!reviewsListEl) return;
    // apenas aplica se ainda não aplicado
    if (!reviewsListEl.dataset.scrollable) {
        reviewsListEl.style.maxHeight = '360px';
        reviewsListEl.style.overflowY = 'auto';
        reviewsListEl.style.paddingRight = '8px';
        reviewsListEl.dataset.scrollable = '1';
    }
}

function listenReviews() {
    const reviewsListEl = document.getElementById('reviews-list');
    const averageRatingEl = document.getElementById('average-rating');
    if (!firebaseDB) {
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Firestore não configurado.</div>';
        return;
    }

    makeReviewsScrollable(reviewsListEl);

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
        }, err => {
            console.error('Erro ao ler reviews (onSnapshot):', err);
            if (!reviewsListEl) return;
            // Se o erro for permission-denied e usuário NÃO autenticado, não mostrar notificação intrusiva.
            if (err && err.code === 'permission-denied') {
                const isLogged = !!(firebaseAuth && firebaseAuth.currentUser);
                if (isLogged) {
                    // usuário autenticado, mostrar mensagem discreta na área
                    reviewsListEl.innerHTML = '<div class="text-slate-400">Sem permissão para ver avaliações.</div>';
                } else {
                    // usuário não autenticado: incentive login ou mostre placeholder (não notificar)
                    reviewsListEl.innerHTML = '<div class="text-slate-400">Faça login para ver avaliações.</div>';
                }
                return;
            }
            reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
        });
    } catch (e) {
        console.error('listenReviews exception:', e);
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
    }
}

/* ===========================
   Pequenas utilidades e inicialização
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
    // componentes UI
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

    // conecta login buttons
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', startGoogleSignIn);
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    if (loginBtnMobile) loginBtnMobile.addEventListener('click', startGoogleSignIn);
    const loginAction = document.getElementById('login-action');
    if (loginAction) loginAction.addEventListener('click', startGoogleSignIn);

    // start listening reviews (realtime)
    listenReviews();

    console.log('[script] inicialização completa (com user-menu e reviews scroll)');
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
