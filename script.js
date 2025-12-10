/**
 * js/script.js (corrigido)
 * - Corrige user menu (nome do usuário -> dropdown Trocar login / Sair)
 * - Remove IDs duplicados, usa classes e data-menu-id para múltiplas instâncias
 * - Garante todas as funções definidas antes do DOMContentLoaded
 * - Mantém Firebase (compat) + Google Sign-In + Firestore reviews
 * - Render de reviews em container rolável
 *
 * IMPORTANTE: inclua os SDKs compat do Firebase ANTES deste arquivo no index.html.
 */

/* ===========================
   FIREBASE CONFIG
   =========================== */
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
   RUNTIME VARS
   =========================== */
let firebaseAuth = null;
let firebaseDB = null;
let currentUser = null;

/* ===========================
   NOTIFICAÇÕES SIMPLES
   =========================== */
function mostrarNotificacao(mensagem, tipo = 'info') {
  const el = document.createElement('div');
  el.className = `fixed top-24 right-6 z-50 px-5 py-3 rounded-lg shadow transform transition-all duration-300 translate-x-full`;
  const cores = { success: 'bg-green-600 text-white', error: 'bg-red-600 text-white', info: 'bg-blue-600 text-white', warning: 'bg-yellow-400 text-black' };
  el.className += ` ${cores[tipo] || cores.info}`;
  el.innerHTML = `<div class="flex items-center gap-3"><i class="fas fa-info-circle"></i><span>${mensagem}</span></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.style.transform = 'translateX(0)');
  setTimeout(() => { el.style.transform = 'translateX(400px)'; setTimeout(() => { try { el.remove(); } catch(e){} }, 300); }, 3000);
}
window.mostrarNotificacao = mostrarNotificacao;

/* ===========================
   INICIALIZAÇÃO FIREBASE (compat)
   =========================== */
(function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK compat não detectado. Inclua os scripts antes do script.js');
      return;
    }
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDB = firebase.firestore();

    firebaseAuth.onAuthStateChanged(user => {
      currentUser = user;
      updateAuthUI(user);
      console.log('[auth] onAuthStateChanged uid=', user ? user.uid : null);
    });

    // tratar redirect result
    firebaseAuth.getRedirectResult().then(result => {
      if (result && result.user) {
        console.log('[auth] logged via redirect', result.user.uid);
      }
    }).catch(err => {
      if (err) console.warn('[auth] getRedirectResult:', err);
    });

    console.log('[Firebase] inicializado (compat)');
  } catch (e) {
    console.error('[Firebase] erro init', e);
  }
})();

/* ===========================
   MOBILE MENU (existia antes)
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
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
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
   MIGRAR onclicks -> data-service (WhatsApp)
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
      if (!el._svcAttached) { el.addEventListener('click', solicitarServicoHandler); el._svcAttached = true; }
      return;
    }
    const onclick = el.getAttribute('onclick') || '';
    const match = onclick.match(/solicitarServico\s*\(\s*['"`]([\s\S]*?)['"`]\s*\)/);
    if (match && match[1]) {
      el.dataset.service = match[1];
      el.removeAttribute('onclick');
      if (!el._svcAttached) { el.addEventListener('click', solicitarServicoHandler); el._svcAttached = true; }
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
   CARDS / LAZY / BOTAO TOPO
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
   USER MENU (name button + dropdown)
   - usa classes .user-menu-wrap .user-menu-btn .user-menu-dropdown
   - suporta múltiplas instâncias (header + área mobile)
   =========================== */
function createUserMenuMarkup(user) {
  const display = (user.displayName || user.email || 'Usuário');
  const short = display.length > 18 ? display.slice(0,15) + '...' : display;
  // não usar IDs fixos — use classes e data-menu-id
  const menuId = 'um-' + Math.random().toString(36).slice(2,8);
  return `
    <div class="user-menu-wrap inline-block" data-menu-id="${menuId}">
      <button class="user-menu-btn bg-slate-800 text-white px-3 py-1 rounded-lg flex items-center gap-2">
        <img src="${user.photoURL || ''}" alt="" class="w-7 h-7 rounded-full object-cover" />
        <span class="user-menu-label truncate">${short}</span>
        <i class="fas fa-chevron-down text-sm"></i>
      </button>
      <div class="user-menu-dropdown hidden absolute right-0 mt-2 w-44 bg-slate-900 rounded-md shadow-lg z-50 ring-1 ring-white/5">
        <button class="user-switch-btn block w-full text-left px-4 py-2 hover:bg-slate-700">Trocar login</button>
        <button class="user-logout-btn block w-full text-left px-4 py-2 hover:bg-slate-700">Sair</button>
      </div>
    </div>
  `;
}

function attachUserMenuHandlers() {
  // anexa handlers para cada .user-menu-wrap
  document.querySelectorAll('.user-menu-wrap').forEach(wrap => {
    if (wrap._attached) return;
    const btn = wrap.querySelector('.user-menu-btn');
    const dropdown = wrap.querySelector('.user-menu-dropdown');
    const logoutBtn = wrap.querySelector('.user-logout-btn');
    const switchBtn = wrap.querySelector('.user-switch-btn');

    if (!btn || !dropdown) { wrap._attached = true; return; }
    // toggle
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    // logout
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      if (firebaseAuth) firebaseAuth.signOut().then(() => { mostrarNotificacao('Você saiu', 'info'); }).catch(err => { console.error('Erro ao sair', err); mostrarNotificacao('Erro ao sair', 'error'); });
    });
    // switch login
    if (switchBtn) switchBtn.addEventListener('click', () => {
      if (firebaseAuth) {
        firebaseAuth.signOut().then(() => {
          setTimeout(() => startGoogleSignIn(), 250);
        }).catch(err => { console.error('Erro ao trocar login', err); startGoogleSignIn(); });
      } else startGoogleSignIn();
    });

    // close on outside click
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) dropdown.classList.add('hidden');
    });
    // close on Esc
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdown.classList.add('hidden'); });

    wrap._attached = true;
  });
}

/* ===========================
   AUTH UI (substitui auth-area e login buttons)
   - usa createUserMenuMarkup + attachUserMenuHandlers
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
    if (loginAction) {
      // inserir sem duplicar IDs: cria nova instância
      const markup = createUserMenuMarkup(user);
      loginAction.innerHTML = `<div class="inline-block">${markup}</div>`;
      attachUserMenuHandlers();
    }
    if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'Usuário';
  } else {
    currentUser = null;
    if (authArea) {
      authArea.innerHTML = `<button id="login-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg flex items-center space-x-2"><i class="fab fa-google"></i><span>Login</span></button>`;
      const lbtn = document.getElementById('login-btn');
      if (lbtn) lbtn.addEventListener('click', startGoogleSignIn);
    }
    if (loginBtnMobile) {
      loginBtnMobile.style.display = 'inline-flex';
      loginBtnMobile.addEventListener('click', startGoogleSignIn);
    }
    if (loginAction) {
      loginAction.innerHTML = `<button id="login-action-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg">Entrar com Google</button>`;
      const actionBtn = document.getElementById('login-action-btn');
      if (actionBtn) actionBtn.addEventListener('click', startGoogleSignIn);
    }
    if (userNameEl) userNameEl.textContent = 'Você não está conectado';
  }
}

/* ===========================
   LOGIN (popup + redirect fallback)
   =========================== */
function setLoginButtonLoading(loading = true) {
  const btn = document.querySelector('#auth-area button, #login-btn, #login-btn-mobile, #login-action-btn');
  if (!btn) return;
  if (loading) { btn.dataset._orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Aguarde...`; }
  else { btn.disabled = false; if (btn.dataset._orig) btn.innerHTML = btn.dataset._orig; }
}

function startGoogleSignIn() {
  if (typeof firebase === 'undefined' || !firebase.auth) { mostrarNotificacao('Firebase SDK não carregado.', 'error'); return; }
  if (!firebaseAuth) firebaseAuth = firebase.auth();
  setLoginButtonLoading(true);
  const provider = new firebase.auth.GoogleAuthProvider();
  firebaseAuth.signInWithPopup(provider)
    .then(result => { console.log('[signin] success', result.user && result.user.uid); mostrarNotificacao('Logado com sucesso!', 'success'); })
    .catch(err => {
      console.error('[signin] popup erro', err);
      const fallbackCodes = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
      if (err && err.code && fallbackCodes.includes(err.code)) {
        mostrarNotificacao('Popup bloqueado/fechado — redirecionando...', 'warning');
        firebaseAuth.signInWithRedirect(provider);
        return;
      }
      if (err && err.code === 'auth/unauthorized-domain') {
        mostrarNotificacao('Domínio não autorizado. Adicione em Auth → Authorized domains.', 'error');
      } else if (err && err.code === 'auth/operation-not-allowed') {
        mostrarNotificacao('Provedor Google desabilitado no Firebase. Ative em Auth → Sign-in method.', 'error');
      } else {
        mostrarNotificacao('Erro ao entrar com Google (veja console).', 'error');
      }
    })
    .finally(() => setLoginButtonLoading(false));
}

/* ===========================
   REVIEWS (render scrollable, submit, listen)
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
    btn.addEventListener('click', () => { selectedRating = i; renderStarsNumeric(container, selectedRating); });
    container.appendChild(btn);
  }
}

async function submitReview() {
  if (!firebaseAuth || !firebaseDB) { mostrarNotificacao('Firebase não configurado. Não é possível enviar avaliações.', 'error'); return; }
  const user = firebaseAuth.currentUser;
  if (!user) { mostrarNotificacao('Faça login com Google para enviar uma avaliação.', 'warning'); return; }
  const reviewTextEl = document.getElementById('review-text');
  const text = reviewTextEl ? reviewTextEl.value.trim() : '';
  if (!text) { mostrarNotificacao('Escreva um comentário antes de enviar.', 'info'); return; }

  const review = { uid: user.uid, name: user.displayName || user.email, photoURL: user.photoURL || '', rating: selectedRating, comment: text, createdAt: firebase.firestore.FieldValue.serverTimestamp() };

  try {
    await firebaseDB.collection('reviews').add(review);
    mostrarNotificacao('Avaliação enviada! Obrigado.', 'success');
    if (reviewTextEl) reviewTextEl.value = '';
  } catch (err) {
    console.error('Erro ao enviar review', err);
    const reviewsListEl = document.getElementById('reviews-list');
    if (err && err.code === 'permission-denied') {
      if (reviewsListEl) reviewsListEl.innerHTML = '<div class="text-slate-400">Não foi possível salvar a avaliação (sem permissão).</div>';
    } else {
      mostrarNotificacao('Erro ao enviar avaliação (veja console).', 'error');
    }
  }
}

function makeReviewsScrollable(reviewsListEl) {
  if (!reviewsListEl) return;
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
  if (!reviewsListEl) return;
  if (!firebaseDB) { reviewsListEl.innerHTML = '<div class="text-red-400">Firestore não configurado.</div>'; return; }

  makeReviewsScrollable(reviewsListEl);

  try {
    firebaseDB.collection('reviews').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
      const docs = []; let sum = 0;
      snapshot.forEach(doc => { const data = doc.data(); docs.push(Object.assign({ id: doc.id }, data)); sum += (data.rating || 0); });
      const avg = docs.length ? (sum / docs.length).toFixed(1) : '--';
      if (averageRatingEl) averageRatingEl.textContent = avg;
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
      console.error('Erro onSnapshot reviews', err);
      if (err && err.code === 'permission-denied') {
        const isLogged = !!(firebaseAuth && firebaseAuth.currentUser);
        if (isLogged) { reviewsListEl.innerHTML = '<div class="text-slate-400">Sem permissão para ver avaliações.</div>'; }
        else { reviewsListEl.innerHTML = '<div class="text-slate-400">Faça login para ver avaliações.</div>'; }
        return;
      }
      reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
    });
  } catch (e) {
    console.error('listenReviews exception', e);
    reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
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
   INICIALIZAÇÃO (DOMContentLoaded)
   - executa somente depois de todas as funções serem definidas
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  try {
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

    // conecta login buttons (existentes)
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', startGoogleSignIn);
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    if (loginBtnMobile) loginBtnMobile.addEventListener('click', startGoogleSignIn);
    const loginAction = document.getElementById('login-action');
    if (loginAction) loginAction.addEventListener('click', startGoogleSignIn);

    // iniciar escuta de reviews
    listenReviews();

    // attach any user menus created by initial updateAuthUI
    attachUserMenuHandlers();

    console.log('[script] inicialização completa (corrigido)');
  } catch (e) {
    console.error('[script] erro na inicialização:', e);
  }
});

/* ===========================
   Debug helpers
   =========================== */
window.debugFirebase = function() {
  if (typeof firebase === 'undefined') { console.log('Firebase não definido'); return; }
  try {
    console.log('firebase.app().options=', firebase.app().options);
    console.log('firebase.apps.length=', firebase.apps.length);
    console.log('firebase.auth?', !!firebase.auth);
    console.log('firebase.firestore?', !!firebase.firestore);
    console.log('firebaseAuth var?', !!firebaseAuth);
    console.log('currentUser', currentUser);
  } catch (e) { console.error('debugFirebase error', e); }
};

window.solicitarServico = function(serviceName) {
  const btn = document.querySelector(`[data-service="${serviceName}"]`);
  if (btn) btn.click(); else abrirWhatsAppMensagem(serviceName);
};
