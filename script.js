/**
 * js/script.js
 * Corrigido: dropdown position, restauração da seleção 1-10, fallback para armazenamento em JSON (localStorage)
 *
 * Comportamento:
 * - Tenta usar Firestore (se configurado e com permissões). Se falhar (ausente/permission-denied),
 *   faz fallback para um "reviews JSON" salvo no localStorage (key = 'local_reviews').
 * - Submit: tenta gravar no Firestore; se der erro por permissão ou ausência, grava no localStorage.
 * - Renderiza reviews a partir do Firestore (quando disponível) ou do localStorage.
 * - User menu: botão com nome do usuário; dropdown posicionado corretamente (wrap com position:relative).
 * - Rating 1..10 restaurado e visível.
 *
 * IMPORTANT:
 * - Certifique-se de incluir os SDKs compat do Firebase ANTES deste arquivo se quiser usar Firestore.
 *   Exemplo (no fim do body, antes de <script src="script.js">):
 *     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
 *     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
 *     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
 *
 * - Esta versão NÃO tenta escrever um arquivo .json no servidor (não é possível a partir de um site estático
 *   sem backend). Se quiser persistir num arquivo JSON no servidor, consulte as instruções no final (usar
 *   função serverless ou Firebase).
 */

/* ===========================
   FIREBASE CONFIG (seu app)
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
   UTIL: notificações simples
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
   Inicializa Firebase (modo compat), se disponível
   =========================== */
(function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK compat não detectado — Firestore/desync fallback irá usar localStorage.');
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

    // tratar redirect result (caso fallback redirect usado)
    firebaseAuth.getRedirectResult().then(result => {
      if (result && result.user) {
        console.log('[auth] logged via redirect', result.user.uid);
        mostrarNotificacao('Autenticado via redirect', 'success');
      }
    }).catch(err => {
      if (err) console.warn('[auth] getRedirectResult:', err);
    });

    console.log('[Firebase] inicializado (compat)');
  } catch (err) {
    console.error('[Firebase] erro init', err);
    firebaseDB = null;
    firebaseAuth = null;
  }
})();

/* ===========================
   HELPERS: local JSON (localStorage) fallback
   key: 'local_reviews' stores an array of review objects
   =========================== */
function loadLocalReviews() {
  try {
    const raw = localStorage.getItem('local_reviews');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    console.error('loadLocalReviews parse error', e);
    return [];
  }
}
function saveLocalReviews(arr) {
  try {
    localStorage.setItem('local_reviews', JSON.stringify(arr || []));
  } catch (e) {
    console.error('saveLocalReviews error', e);
  }
}
function appendLocalReview(review) {
  const arr = loadLocalReviews();
  arr.unshift(review); // newest first
  saveLocalReviews(arr);
}

/* ===========================
   RENDER HELPERS (reused for Firestore or local)
   =========================== */
function renderReviewsArray(reviews) {
  const reviewsListEl = document.getElementById('reviews-list');
  const averageRatingEl = document.getElementById('average-rating');
  if (!reviewsListEl) return;
  // ensure scrollable
  if (!reviewsListEl.dataset.scrollable) {
    reviewsListEl.style.maxHeight = '360px';
    reviewsListEl.style.overflowY = 'auto';
    reviewsListEl.style.paddingRight = '8px';
    reviewsListEl.dataset.scrollable = '1';
  }

  if (!Array.isArray(reviews) || !reviews.length) {
    reviewsListEl.innerHTML = '<div class="text-slate-400">Ainda não há avaliações. Seja o primeiro!</div>';
    if (averageRatingEl) averageRatingEl.textContent = '--';
    return;
  }

  let sum = 0;
  reviews.forEach(r => sum += (r.rating || 0));
  if (averageRatingEl) averageRatingEl.textContent = (reviews.length ? (sum / reviews.length).toFixed(1) : '--');

  reviewsListEl.innerHTML = '';
  reviews.forEach(d => {
    const when = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : (d.createdAt ? new Date(d.createdAt).toLocaleString() : '');
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

/* ===========================
   LISTEN REVIEWS: try Firestore, fallback to localStorage
   =========================== */
function listenReviews() {
  const reviewsListEl = document.getElementById('reviews-list');
  if (!reviewsListEl) return;

  // If firestore available, try realtime subscription
  if (firebaseDB) {
    try {
      firebaseDB.collection('reviews').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const docs = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          docs.push(Object.assign({ id: doc.id }, data));
        });
        // render using renderReviewsArray
        renderReviewsArray(docs);
      }, err => {
        console.error('onSnapshot error', err);
        if (err && err.code === 'permission-denied') {
          // If user not logged in, show placeholder without loud notifications
          const isLogged = !!(firebaseAuth && firebaseAuth.currentUser);
          if (!isLogged) {
            reviewsListEl.innerHTML = '<div class="text-slate-400">Faça login para ver avaliações.</div>';
            // also show local reviews fallback
            const local = loadLocalReviews();
            if (local && local.length) {
              renderReviewsArray(local);
            }
            return;
          } else {
            reviewsListEl.innerHTML = '<div class="text-slate-400">Sem permissão para ver avaliações.</div>';
            return;
          }
        }
        // other error: fallback to localStorage
        const local = loadLocalReviews();
        if (local && local.length) {
          renderReviewsArray(local);
        } else {
          reviewsListEl.innerHTML = '<div class="text-red-400">Erro ao carregar avaliações.</div>';
        }
      });
      return;
    } catch (e) {
      console.error('listenReviews exception', e);
      // fallback to local
    }
  }

  // If we reach here, Firestore not available -> render local reviews
  const local = loadLocalReviews();
  renderReviewsArray(local);
}

/* ===========================
   SUBMIT REVIEW: attempt Firestore then local fallback
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
  const reviewTextEl = document.getElementById('review-text');
  const text = reviewTextEl ? reviewTextEl.value.trim() : '';
  if (!text) { mostrarNotificacao('Escreva um comentário antes de enviar.', 'info'); return; }

  // build review object (use ISO date for local fallback)
  const now = new Date();
  const review = {
    uid: currentUser ? currentUser.uid : null,
    name: currentUser ? (currentUser.displayName || currentUser.email) : 'Anônimo',
    photoURL: currentUser ? (currentUser.photoURL || '') : '',
    rating: selectedRating,
    comment: text,
    createdAt: firebaseDB ? firebase.firestore.FieldValue.serverTimestamp() : now.toISOString()
  };

  // if firestore exists and user authenticated (or rules allow), try adding to Firestore
  if (firebaseDB) {
    try {
      // require auth for meaningful uid; Firestore rules may reject otherwise
      await firebaseDB.collection('reviews').add(review);
      mostrarNotificacao('Avaliação enviada!', 'success');
      if (reviewTextEl) reviewTextEl.value = '';
      return;
    } catch (err) {
      console.error('Erro ao gravar no Firestore, fallback local', err);
      // if permission-denied or other, fallback to localStorage
      if (err && err.code === 'permission-denied') {
        appendLocalReview(Object.assign({}, review, { createdAt: now.toISOString() }));
        mostrarNotificacao('Avaliação salva localmente (login necessário para salvar no servidor).', 'warning');
        if (reviewTextEl) reviewTextEl.value = '';
        // re-render from local
        const local = loadLocalReviews();
        renderReviewsArray(local);
        return;
      } else {
        // other Firestore error -> fallback local as well
        appendLocalReview(Object.assign({}, review, { createdAt: now.toISOString() }));
        mostrarNotificacao('Avaliação salva localmente (erro servidor).', 'warning');
        if (reviewTextEl) reviewTextEl.value = '';
        const local = loadLocalReviews();
        renderReviewsArray(local);
        return;
      }
    }
  }

  // No Firestore -> save local
  appendLocalReview(Object.assign({}, review, { createdAt: now.toISOString() }));
  mostrarNotificacao('Avaliação salva localmente.', 'success');
  if (reviewTextEl) reviewTextEl.value = '';
  const local = loadLocalReviews();
  renderReviewsArray(local);
}

/* ===========================
   USER MENU: create + attach handlers
   - ensure wrapper positioned relative (fixes dropdown at corner)
   =========================== */
function createUserMenuMarkup(user) {
  const display = (user.displayName || user.email || 'Usuário');
  const short = display.length > 18 ? display.slice(0,15) + '...' : display;
  const markup = document.createElement('div');
  markup.className = 'user-menu-wrap inline-block';
  // ensure relative — fixes dropdown absolute position
  markup.style.position = 'relative';
  markup.innerHTML = `
    <button class="user-menu-btn bg-slate-800 text-white px-3 py-1 rounded-lg flex items-center gap-2">
      <img src="${user.photoURL || ''}" alt="" class="w-7 h-7 rounded-full object-cover" />
      <span class="user-menu-label truncate">${short}</span>
      <i class="fas fa-chevron-down text-sm"></i>
    </button>
    <div class="user-menu-dropdown hidden absolute right-0 mt-2 w-44 bg-slate-900 rounded-md shadow-lg z-50 ring-1 ring-white/5">
      <button class="user-switch-btn block w-full text-left px-4 py-2 hover:bg-slate-700">Trocar login</button>
      <button class="user-logout-btn block w-full text-left px-4 py-2 hover:bg-slate-700">Sair</button>
    </div>
  `;
  return markup;
}

function attachUserMenuHandlers() {
  // attach to each .user-menu-wrap element that hasn't been attached yet
  document.querySelectorAll('.user-menu-wrap').forEach(wrap => {
    if (wrap._attached) return;
    // if wrap was created as markup element (DOM node), everything's fine
    // else if wrap is a container with innerHTML (string), ensure position relative
    if (!wrap.style.position) wrap.style.position = 'relative';
    const btn = wrap.querySelector('.user-menu-btn');
    const dropdown = wrap.querySelector('.user-menu-dropdown');
    const logoutBtn = wrap.querySelector('.user-logout-btn');
    const switchBtn = wrap.querySelector('.user-switch-btn');

    if (!btn || !dropdown) { wrap._attached = true; return; }

    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      if (firebaseAuth) firebaseAuth.signOut().then(() => mostrarNotificacao('Você saiu', 'info')).catch(err => { console.error('Erro logout', err); mostrarNotificacao('Erro ao sair', 'error'); });
    });

    if (switchBtn) switchBtn.addEventListener('click', () => {
      if (firebaseAuth) {
        firebaseAuth.signOut().then(() => { setTimeout(() => startGoogleSignIn(), 200); }).catch(err => { console.error('Erro switch', err); startGoogleSignIn(); });
      } else startGoogleSignIn();
    });

    // close on outside click and Esc
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) dropdown.classList.add('hidden'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdown.classList.add('hidden'); });

    wrap._attached = true;
  });
}

/* ===========================
   OTHER UI / UTILITIES (mobile menu, smooth scroll, etc.)
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
   CLICK PREVENT DOUBLE
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
    criarBarraBusca && criarBarraBusca(); // if exists in page
    // rating widget
    const ratingContainer = document.getElementById('rating-stars');
    if (ratingContainer) renderStarsNumeric(ratingContainer, selectedRating);
    // connect submit
    const submitBtn = document.getElementById('submit-review');
    if (submitBtn) submitBtn.addEventListener('click', submitReview);
    // connect login fallback buttons
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', startGoogleSignIn);
    const loginBtnMobile = document.getElementById('login-btn-mobile');
    if (loginBtnMobile) loginBtnMobile.addEventListener('click', startGoogleSignIn);
    const loginAction = document.getElementById('login-action');
    if (loginAction) loginAction.addEventListener('click', startGoogleSignIn);

    // start listening reviews (Firestore or local)
    listenReviews();

    // attach any user menus rendered by updateAuthUI
    attachUserMenuHandlers();

    console.log('[script] inicialização completa (fixes applied)');
  } catch (e) {
    console.error('[script] init error', e);
  }
});

/* ===========================
   DEBUG HELPERS
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
