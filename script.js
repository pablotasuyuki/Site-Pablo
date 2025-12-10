/* js/script.js (atualizado)
   - Nome do usuário no header com dropdown (Trocar login / Sair)
   - Paginação cliente para reviews (Prev / Next)
   - Suprime notificações intrusivas em permission-denied ao ler reviews
   - Mantém restante das funcionalidades (Firebase compat, stars 1-10, envio review, lazy load, etc.)
*/

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

/* reviews pagination state */
let reviewsCache = []; // full array from onSnapshot
let reviewsPage = 1;
const REVIEWS_PAGE_SIZE = 5; // ajustável

/* ===========================
   UTIL: Notificações (mantive para erros/sucessos pontuais)
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
    notificacao.className += ` ${cores[tipo] || cores.info}`;
    notificacao.innerHTML = `<div class="flex items-center space-x-3"><i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} text-xl"></i><span class="font-semibold">${mensagem}</span></div>`;
    document.body.appendChild(notificacao);
    requestAnimationFrame(() => { notificacao.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        notificacao.style.transform = 'translateX(400px)';
        setTimeout(() => { try { notificacao.remove(); } catch(e) {} }, 300);
    }, 3000);
}

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
                // notificar só quando for sucesso claro
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
   UI: User menu (nome do usuário com dropdown)
   =========================== */
function createUserMenuDOM(user) {
    // retorna um elemento DOM contendo o botão com nome e o dropdown (posicionado relativo)
    const wrap = document.createElement('div');
    wrap.className = 'user-menu-wrap';
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-block';
    const display = user.displayName || user.email || 'Usuário';
    const short = display.length > 20 ? display.slice(0, 17) + '...' : display;
    wrap.innerHTML = `
        <button class="user-menu-btn flex items-center gap-2" style="background:transparent;border:none;cursor:pointer;padding:6px 8px;color:inherit">
            <img src="${user.photoURL || ''}" alt="${display}" style="width:28px;height:28px;border-radius:999px;object-fit:cover" />
            <span class="user-menu-label" style="max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${short}</span>
            <i class="fas fa-chevron-down" style="margin-left:6px"></i>
        </button>
        <div class="user-menu-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 6px);min-width:160px;background:#0f172a;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.5);z-index:999;padding:6px 0;">
            <button class="user-switch-btn" style="display:block;width:100%;text-align:left;padding:10px 12px;background:transparent;border:none;color:#e6eef8;cursor:pointer">Trocar login</button>
            <button class="user-logout-btn" style="display:block;width:100%;text-align:left;padding:10px 12px;background:transparent;border:none;color:#e6eef8;cursor:pointer">Sair</button>
        </div>
    `;
    return wrap;
}

function attachUserMenuHandlersOnce() {
    // attach handlers for any menu wrap elements
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
            });
            // close on outside
            document.addEventListener('click', (e) => {
                if (!wrap.contains(e.target)) dropdown.style.display = 'none';
            });
            // esc to close
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (firebaseAuth) {
                    firebaseAuth.signOut().then(() => {
                        // não notificar globalmente (pedido do usuário)
                        console.log('Usuário deslogado');
                        // fechar dropdown
                        if (dropdown) dropdown.style.display = 'none';
                    }).catch(err => {
                        console.error('Erro ao sair:', err);
                        // notificar erro pontual
                        mostrarNotificacao('Erro ao sair (veja console)', 'error');
                    });
                }
            });
        }
        if (switchBtn) {
            switchBtn.addEventListener('click', () => {
                if (firebaseAuth) {
                    firebaseAuth.signOut().then(() => {
                        if (dropdown) dropdown.style.display = 'none';
                        // small delay then open login
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
   UPDATE AUTH UI (substitui o botão logout pela UI com nome)
   =========================== */
function updateAuthUI(user) {
    const authArea = document.getElementById('auth-area');
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    const loginAction = document.getElementById('login-action');
    const userNameEl = document.getElementById('user-name');

    if (user) {
        currentUser = user;
        if (authArea) {
            // remove conteúdo e inserir menu DOM
            authArea.innerHTML = '';
            const menu = createUserMenuDOM(user);
            authArea.appendChild(menu);
            attachUserMenuHandlersOnce();
        }
        if (loginBtnMobile) loginBtnMobile.style.display = 'none';
        if (loginAction) {
            loginAction.innerHTML = '';
            const menu2 = createUserMenuDOM(user);
            loginAction.appendChild(menu2);
            attachUserMenuHandlersOnce();
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
   LOGIN / AUTH (popup + fallback redirect)
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
        console.log('[signin] signInWithPopup success', result.user && result.user.uid);
        mostrarNotificacao('Logado com sucesso!', 'success');
      })
      .catch(err => {
        console.error('[signin] signInWithPopup erro:', err);
        const fallback = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (err && err.code && fallback.includes(err.code)) {
          console.log('Popup bloqueado/fechado - tentando redirect');
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
   REVIEWS: pagination, render, submit, listen
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

    // prepare average (on full set)
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

    // build pagination controls
    if (paginationEl) {
        paginationEl.innerHTML = '';
        const prev = document.createElement('button');
        prev.textContent = 'Anterior';
        prev.className = 'px-3 py-1 rounded bg-slate-700 text-white mr-2';
        prev.disabled = page <= 1;
        prev.addEventListener('click', () => {
            renderReviewsPage(reviewsPage - 1);
        });
        const next = document.createElement('button');
        next.textContent = 'Próxima';
        next.className = 'px-3 py-1 rounded bg-slate-700 text-white ml-2';
        next.disabled = page >= totalPages;
        next.addEventListener('click', () => {
            renderReviewsPage(reviewsPage + 1);
        });
        const info = document.createElement('span');
        info.textContent = `Página ${page} / ${totalPages}`;
        info.style.marginLeft = '8px';
        info.style.color = '#cbd5e1';
        paginationEl.appendChild(prev);
        paginationEl.appendChild(info);
        paginationEl.appendChild(next);
    }

    // ensure reviews container scrollable to avoid stretching page
    reviewsListEl.style.maxHeight = '380px';
    reviewsListEl.style.overflowY = 'auto';
}

/* Submit review */
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
        // Firestore onSnapshot irá atualizar reviewsCache e UI automaticamente
    } catch (err) {
        console.error('Erro ao enviar avaliação:', err);
        if (err && err.code === 'permission-denied') {
            // mostrar mensagem discreta na área (não notificação global)
            const reviewsListEl = document.getElementById('reviews-list');
            if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-slate-400">Não foi possível salvar avaliação (permissão).</div>';
        } else {
            mostrarNotificacao('Erro ao enviar avaliação (veja console).', 'error');
        }
    }
}

/* Listen reviews with onSnapshot and maintain reviewsCache */
function listenReviews() {
    const reviewsListEl = document.getElementById('reviews-list');
    const paginationContainer = document.getElementById('reviews-pagination');
    if (!firebaseDB) {
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Firestore não configurado.</div>';
        return;
    }
    try {
        firebaseDB.collection('reviews').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const docs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                docs.push(Object.assign({ id: doc.id }, data));
            });
            reviewsCache = docs;
            // render current page (reset to page 1 if new data arrives)
            reviewsPage = 1;
            renderReviewsPage(reviewsPage);
        }, err => {
            console.error('Erro ao ler reviews (onSnapshot):', err);
            if (!reviewsListEl) return;
            // If permission denied, do not show global notification; just show placeholder
            if (err && err.code === 'permission-denied') {
                const isLogged = !!(firebaseAuth && firebaseAuth.currentUser);
                if (isLogged) {
                    reviewsListEl.innerHTML = '<div class="text-slate-400">Sem permissão para ver avaliações.</div>';
                } else {
                    reviewsListEl.innerHTML = '<div class="text-slate-400">Faça login para ver avaliações.</div>';
                }
                // clear pagination
                if (paginationContainer) paginationContainer.innerHTML = '';
                return;
            }
            if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
        });
    } catch (e) {
        console.error('listenReviews exception:', e);
        if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
    }
}

/* ===========================
   Misc UI helpers (mobile menu, smooth scroll, lazy images, cards)
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
    criarBarraBusca && criarBarraBusca();

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

    // create reviews pagination container if not present
    const reviewsSection = document.getElementById('reviews-section');
    if (reviewsSection && !document.getElementById('reviews-pagination')) {
        const pag = document.createElement('div');
        pag.id = 'reviews-pagination';
        pag.style.marginTop = '8px';
        reviewsSection.appendChild(pag);
    }

    // start listening reviews (realtime)
    listenReviews();

    // attach user menu handlers if any menus inserted by updateAuthUI
    attachUserMenuHandlersOnce();

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
        console.log('reviewsCache length', reviewsCache.length);
        console.log('reviewsPage', reviewsPage);
    } catch (e) {
        console.error('debugFirebase error', e);
    }
};

window.solicitarServico = function(serviceName) {
    const btn = document.querySelector(`[data-service="${serviceName}"]`);
    if (btn) btn.click();
    else abrirWhatsAppMensagem(serviceName);
};
