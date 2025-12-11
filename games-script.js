const firebaseConfig = {
    apiKey: "AIzaSyDALe6eKby-7JaCBvej9iqr95Y97s6oHWg",
    authDomain: "flutter-ai-playground-7971c.firebaseapp.com",
    projectId: "flutter-ai-playground-7971c",
    storageBucket: "flutter-ai-playground-7971c.firebasestorage.app",
    messagingSenderId: "623047073166",
    appId: "1:623047073166:web:83d31c6c017b2e70af58df"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentGame = null;
let gameLoop = null; // Loop para jogos Canvas
let gameState = {}; // Estado do jogo Canvas
let otamashisState = {}; // Estado do jogo RPG (Otamashis)
let otamashisInterval = null; // Loop para animações RPG

// VARIÁVEIS DE PROGRESSÃO
let playStartTime = 0;
const XP_PER_SCORE_POINT = 0.01;
const XP_PER_MINUTE = 5;
const XP_PER_LEVEL = 100;
const ATTR_POINTS_PER_LEVEL = 1;

// CONFIGURAÇÃO RPG
const ATTRIBUTE_NAMES = {
    forca: { name: 'Força', icon: '💪', desc: 'Aumenta dano físico e vida total.' },
    destreza: { name: 'Destreza', icon: '🏃', desc: 'Aumenta velocidade de ataque e chance de desvio.' },
    inteligencia: { name: 'Inteligência', icon: '🧠', desc: 'Aumenta dano mágico e precisão de feitiços.' },
    carisma: { name: 'Carisma', icon: '✨', desc: 'Melhora chances de encontrar itens raros e interação social.' },
    sorte: { name: 'Sorte', icon: '🍀', desc: 'Aumenta chance de crítico e evasão.' },
    fe: { name: 'Fé', icon: '🙏', desc: 'Aumenta resistência a maldições e cura.' }
};

const GAMES_CONFIG = {
    'tetris': { icon: '🧱', title: 'Tetris', instructions: 'Use as setas ← → para mover, ↑ para rotacionar e ↓ para descer rápido. Complete linhas para pontuar!', canvasWidth: 300, canvasHeight: 600 },
    'space-shooter': { icon: '🚀', title: 'Space Shooter', instructions: 'Use as setas ← → para mover a nave e ESPAÇO para atirar. Destrua asteroides e inimigos!', canvasWidth: 600, canvasHeight: 600 },
    'snake': { icon: '🐍', title: 'Snake Game', instructions: 'Use as setas para controlar a cobra. Coma frutas para crescer. Não bata nas paredes ou em si mesmo!', canvasWidth: 500, canvasHeight: 500 },
    'click-challenge': { icon: '🎯', title: 'Click Challenge', instructions: 'Clique nos alvos que aparecem na tela o mais rápido possível! Você tem 30 segundos!', canvasWidth: 600, canvasHeight: 600 },
    'pong': { icon: '🏓', title: 'Pong Classic', instructions: 'Use as setas ↑ ↓ ou mouse para mover sua raquete. Não deixe a bola passar!', canvasWidth: 600, canvasHeight: 400 },
    'memory': { icon: '🎨', title: 'Memory Game', instructions: 'Clique nas cartas para virá-las. Encontre todos os pares correspondentes!', canvasWidth: 600, canvasHeight: 600 },
    'otamashis': { 
        icon: '⚔️', 
        title: 'Otamashis: Duel RPG', 
        instructions: 'Clique no monstro para duelar! Use XP para subir de nível e pontos de atributo para aumentar seu dano e vida.', 
        canvasWidth: 800, 
        canvasHeight: 600, 
        isRPG: true 
    }
};

// =====================================================
// UTILIDADES E CÁLCULO DE NÍVEL
// =====================================================

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} text-xl"></i>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function calculateLevel(totalXP) {
    let level = 1;
    let xpNeeded = XP_PER_LEVEL;
    
    while (totalXP >= xpNeeded) {
        level++;
        xpNeeded = level * XP_PER_LEVEL;
    }
    
    const xpCurrentLevel = (level - 1) * XP_PER_LEVEL;
    const xpToNextLevel = level * XP_PER_LEVEL;
    const xpInLevel = totalXP - xpCurrentLevel;
    const levelProgress = xpToNextLevel - xpCurrentLevel;
    
    return {
        level,
        xpCurrentLevel,
        xpToNextLevel,
        xpInLevel,
        progress: (xpInLevel / levelProgress) * 100
    };
}


// =====================================================
// TEMPO E XP
// =====================================================

function startPlayTimer() {
    playStartTime = Date.now();
    console.log(`[Timer] Cronômetro de jogo iniciado para ${currentGame}.`);
}

function calculateXP(finalScore, minutesPlayed) {
    const scoreXP = finalScore * XP_PER_SCORE_POINT;
    const timeXP = minutesPlayed * XP_PER_MINUTE;
    
    const totalXP = Math.round(scoreXP + timeXP);
    
    return totalXP;
}

function stopAndSaveGameStats(finalScore) {
    const endTime = Date.now();
    if (playStartTime === 0) return;
    
    const minutesPlayed = Math.floor((endTime - playStartTime) / (1000 * 60));
    const earnedXP = calculateXP(finalScore, minutesPlayed);
    
    console.log(`[Timer] Partida finalizada. Tempo: ${minutesPlayed} min. XP Ganho: ${earnedXP}`);
    
    playStartTime = 0; 
    
    saveScore(currentGame, finalScore, minutesPlayed, earnedXP);
}

// =====================================================
// AUTHENTICATION AND FIRESTORE
// =====================================================

async function handleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        showNotification('Login realizado com sucesso!', 'success');
        
        // NOVO: Recarrega a página após login bem-sucedido
        window.location.reload(); 
        
    } catch (error) {
        console.error('Erro no login:', error);
        if (error.code === 'auth/popup-blocked') {
            try {
                await auth.signInWithRedirect(provider);
            } catch (redirectError) {
                showNotification('Erro ao fazer login. Permita pop-ups no navegador.', 'error');
            }
        } else {
            showNotification('Erro ao fazer login. Tente novamente.', 'error');
        }
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showNotification('Logout realizado com sucesso!', 'success');
        
        // NOVO: Recarrega a página após logout
        window.location.reload();
        
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showNotification('Erro ao fazer logout.', 'error');
    }
}

function updateUIForUser(user) {
    currentUser = user;
    
    if (user) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('login-btn-mobile').style.display = 'none';
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-info').classList.add('flex');
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/150';
        document.getElementById('user-name').textContent = user.displayName || 'Jogador';
        
        document.getElementById('nav-profile').style.display = 'block';
        document.getElementById('nav-profile-mobile').style.display = 'block';
        
        loadUserData();
    } else {
        document.getElementById('login-btn').style.display = 'flex';
        document.getElementById('login-btn-mobile').style.display = 'block';
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('user-info').classList.remove('flex');
        
        document.getElementById('nav-profile').style.display = 'none';
        document.getElementById('nav-profile-mobile').style.display = 'none';
        document.getElementById('profile').style.display = 'none';
    }
}
auth.onAuthStateChanged(updateUIForUser);

async function saveScore(gameName, score, minutesPlayed = 0, earnedXP = 0) {
    if (!currentUser) {
        showNotification('Faça login para salvar sua pontuação!', 'info');
        return;
    }
    try {
        const scoreData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Jogador',
            userPhoto: currentUser.photoURL || '',
            game: gameName,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('game-scores').add(scoreData);
        await updateUserProfile(gameName, score, minutesPlayed, earnedXP); 
        
        showNotification(`Pontuação salva! +${earnedXP} XP!`, 'success');
        
        loadRankings(gameName);
        loadUserData();
    } catch (error) {
        console.error('Erro ao salvar pontuação:', error);
        showNotification('Erro ao salvar pontuação.', 'error');
    }
}

async function updateUserProfile(gameName, score, minutesPlayed = 0, earnedXP = 0) {
    const userRef = db.collection('user-profiles').doc(currentUser.uid);
    
    try {
        const doc = await userRef.get();
        let games = {};
        let currentXP = 0;
        let attributePoints = 0;
        let attributes = {};
        let initialLevel = 1;

        if (doc.exists) {
            const data = doc.data();
            games = data.games || {};
            currentXP = data.totalXP || 0;
            attributePoints = data.attributePoints || 0;
            attributes = data.attributes || {};
            initialLevel = calculateLevel(currentXP).level;
            
            currentXP += earnedXP; 
        } else {
            currentXP = earnedXP;
            Object.keys(ATTRIBUTE_NAMES).forEach(key => attributes[key] = 1);
        }

        const newLevelData = calculateLevel(currentXP);
        const levelsGained = newLevelData.level - initialLevel;

        if (levelsGained > 0) {
            attributePoints += levelsGained * ATTR_POINTS_PER_LEVEL;
            showNotification(`UP! Você subiu para o Nível ${newLevelData.level}! Ganhou ${levelsGained * ATTR_POINTS_PER_LEVEL} ponto(s) de atributo!`, 'success');
        }

        const gameData = games[gameName] || { bestScore: 0, playCount: 0, totalTimeMinutes: 0 };
        
        gameData.totalTimeMinutes += minutesPlayed;

        if (gameData.bestScore < score) {
            gameData.bestScore = score;
        }
        
        gameData.playCount += 1;
        gameData.lastPlayed = firebase.firestore.FieldValue.serverTimestamp();
        games[gameName] = gameData;

        await userRef.set({ 
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userPhoto: currentUser.photoURL,
            createdAt: doc.exists ? doc.data().createdAt : firebase.firestore.FieldValue.serverTimestamp(), 
            totalXP: currentXP, 
            level: newLevelData.level,
            attributePoints: attributePoints,
            attributes: attributes,
            games: games
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil (XP/Tempo/Nível):', error);
    }
}

async function loadRankings(gameName) {
    const container = document.getElementById('rankings-container');
    container.innerHTML = '<div class="text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-4xl mb-4"></i><p>Carregando rankings...</p></div>';
    
    try {
        const snapshot = await db.collection('game-scores')
            .where('game', '==', gameName)
            .orderBy('score', 'desc')
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="text-center text-gray-400 py-12"><i class="fas fa-trophy text-4xl mb-4"></i><p>Nenhuma pontuação registrada ainda. Seja o primeiro!</p></div>';
            return;
        }
        
        let html = '';
        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const position = index + 1;
            const positionClass = position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : '';
            const topClass = position <= 3 ? `top-${position}` : '';
            
            html += `
                <div class="ranking-item ${topClass}">
                    <div class="ranking-position ${positionClass}">
                        ${position <= 3 ? (position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉') : `#${position}`}
                    </div>
                    <div class="ranking-user">
                        <img src="${data.userPhoto || 'https://via.placeholder.com/40'}" alt="${data.userName}" class="ranking-avatar">
                        <span class="font-semibold">${data.userName}</span>
                    </div>
                    <div class="ranking-score">${formatNumber(data.score)}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar rankings:', error);
        container.innerHTML = '<div class="text-center text-red-400 py-12"><i class="fas fa-exclamation-triangle text-4xl mb-4"></i><p>Erro ao carregar rankings.</p></div>';
    }
}

async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('user-profiles').doc(currentUser.uid);
        const doc = await userRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const games = data.games || {};
            
            const xpData = calculateLevel(data.totalXP || 0);
            
            document.getElementById('user-score').textContent = `Nível ${xpData.level} | ${formatNumber(data.totalXP || 0)} XP`; 
            
            let totalScore = 0;
            let totalGames = 0;
            let totalTime = 0;
            let favoriteGame = '-';
            let maxPlayCount = 0;
            
            Object.keys(games).forEach(gameName => {
                totalScore += games[gameName].bestScore || 0;
                totalGames += games[gameName].playCount || 0;
                totalTime += games[gameName].totalTimeMinutes || 0;
                
                if (games[gameName].playCount > maxPlayCount) {
                    maxPlayCount = games[gameName].playCount;
                    favoriteGame = GAMES_CONFIG[gameName]?.title || gameName;
                }
            });
            
            const hours = Math.floor(totalTime / 60);
            const minutes = totalTime % 60;
            const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            
            Object.keys(GAMES_CONFIG).forEach(gameName => {
                const recordElement = document.querySelector(`.record-score[data-game="${gameName}"]`);
                const playCountElement = document.querySelector(`.play-count[data-game="${gameName}"]`);
                const levelElement = document.querySelector(`.rpg-level`);
                const pointsElement = document.querySelector(`.rpg-points`);

                if (games[gameName]) {
                    if (recordElement) recordElement.textContent = formatNumber(games[gameName].bestScore || 0);
                    if (playCountElement) playCountElement.textContent = games[gameName].playCount || 0;
                }
                
                if (GAMES_CONFIG[gameName].isRPG) {
                    if (levelElement) levelElement.textContent = xpData.level;
                    if (pointsElement) pointsElement.textContent = data.attributePoints || 0;
                }
            });
            
            document.getElementById('profile-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/150';
            document.getElementById('profile-name').textContent = currentUser.displayName || 'Jogador';
            document.getElementById('profile-total-score').textContent = formatNumber(data.totalXP || 0);
            document.getElementById('profile-total-games').textContent = totalGames;
            document.getElementById('profile-total-time').textContent = timeDisplay;
            document.getElementById('profile-favorite').textContent = favoriteGame;
            
            const xpBarContainer = document.getElementById('xp-bar-container');
            const xpHtml = `
                <div class="mb-4">
                    <p class="text-sm font-semibold">Nível ${xpData.level} <span class="float-right text-xs text-purple-400">${formatNumber(xpData.xpInLevel)} / ${formatNumber(xpData.xpToNextLevel - xpData.xpCurrentLevel)} XP</span></p>
                    <div class="h-3 bg-slate-700 rounded-full overflow-hidden mt-1">
                        <div id="xp-bar" class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style="width: ${xpData.progress}%;"></div>
                    </div>
                </div>
            `;
            if (xpBarContainer) xpBarContainer.innerHTML = xpHtml;

            renderAttributes(data.attributes || {}, data.attributePoints || 0);
            
            const recordsContainer = document.getElementById('profile-records');
            let recordsHtml = '';
            
            Object.keys(GAMES_CONFIG).forEach(gameName => {
                const config = GAMES_CONFIG[gameName];
                const gameData = games[gameName];
                
                const gameTime = gameData ? (gameData.totalTimeMinutes || 0) : 0;
                const gameTimeDisplay = gameTime > 60 ? `${Math.floor(gameTime / 60)}h ${gameTime % 60}m` : `${gameTime}m`;
                
                recordsHtml += `
                    <div class="record-item">
                        <span class="flex items-center gap-2">${config.icon} ${config.title}</span>
                        <span class="font-bold text-purple-400">${gameData ? formatNumber(gameData.bestScore) : '0'}</span>
                    </div>
                    <div class="text-xs text-gray-500 flex justify-end mb-2">
                        <i class="fas fa-clock mr-1"></i> Tempo Jogado: ${gameTimeDisplay}
                    </div>
                `;
            });
            
            recordsContainer.innerHTML = recordsHtml;
        }
        
        loadGlobalStats();
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

async function loadGlobalStats() {
    try {
        const scoresSnapshot = await db.collection('game-scores').get();
        const profilesSnapshot = await db.collection('user-profiles').get();
        
        document.getElementById('total-players').textContent = profilesSnapshot.size;
        document.getElementById('total-games').textContent = scoresSnapshot.size;
    } catch (error) {
        console.error('Erro ao carregar estatísticas globais:', error);
    }
}

// =====================================================
// RPG ATTRIBUTES MANAGEMENT
// =====================================================

function renderAttributes(attributes, pointsAvailable) {
    const attrContainer = document.getElementById('profile-attributes-container');
    const pointsDisplay = document.getElementById('attribute-points-display');
    if (!attrContainer || !pointsDisplay) return;

    pointsDisplay.textContent = pointsAvailable;
    let html = '';

    Object.keys(ATTRIBUTE_NAMES).forEach(key => {
        const attr = ATTRIBUTE_NAMES[key];
        const value = attributes[key] || 1;

        const isDisabled = pointsAvailable === 0;

        html += `
            <div class="attribute-item border-b border-slate-700/50 pb-2 mb-2 last:border-b-0" data-attr="${key}">
                <div class="flex items-center justify-between">
                    <span class="font-semibold flex items-center gap-2">
                        ${attr.icon} ${attr.name} (Lv. ${value})
                    </span>
                    <button class="add-attr-btn px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-full text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            data-attr-key="${key}" ${isDisabled ? 'disabled' : ''} title="${attr.desc}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });

    attrContainer.innerHTML = html;

    document.querySelectorAll('.add-attr-btn').forEach(btn => {
        btn.addEventListener('click', handleAttributeIncrease);
    });
}

async function handleAttributeIncrease(e) {
    const attrKey = e.currentTarget.dataset.attrKey;
    if (!attrKey || !currentUser) return;

    e.currentTarget.disabled = true;

    try {
        const userRef = db.collection('user-profiles').doc(currentUser.uid);
        const doc = await userRef.get();
        if (!doc.exists) throw new Error("Perfil não encontrado.");

        const data = doc.data();
        let points = data.attributePoints || 0;
        let attributes = data.attributes || {};

        if (points <= 0) {
            showNotification('Você não tem pontos de atributo disponíveis.', 'warning');
            return;
        }

        attributes[attrKey] = (attributes[attrKey] || 1) + 1;
        points--;

        await userRef.update({
            attributePoints: points,
            attributes: attributes
        });

        showNotification(`${ATTRIBUTE_NAMES[attrKey].icon} ${ATTRIBUTE_NAMES[attrKey].name} melhorado!`, 'success');
        loadUserData();

    } catch (error) {
        console.error('Erro ao distribuir atributo:', error);
        showNotification('Erro ao salvar atributo.', 'error');
    } finally {
        e.currentTarget.disabled = false;
    }
}

// =====================================================
// GAME ENGINE - OTAMASHIS (Clicker/RPG PVE)
// =====================================================

function initOtamashis() {
    if (!currentUser) {
        handleLogin();
        document.getElementById('game-container').innerHTML = `<div class="text-center text-red-400 py-12">Faça login para iniciar o RPG!</div>`;
        return;
    }
    
    const userData = auth.currentUser;
    const userRef = db.collection('user-profiles').doc(userData.uid);
    
    userRef.get().then(doc => {
        const profile = doc.data();
        const attrs = profile.attributes || {};

        const force = attrs.forca || 1;
        
        otamashisState = {
            playerDamage: 1 + force * 3,
            playerHealth: 10 + force * 5,
            playerGold: profile.rpgGold || 0,
            playerXP: profile.totalXP || 0,
            currentStage: profile.rpgStage || 1,
            monsterHealth: 100,
            monsterMaxHealth: 100,
            monsterXPValue: 10,
            monsterGoldValue: 5,
            monsterIcon: '👹',
            monsterName: 'Slime de Lama'
        };

        otamashisState.monsterMaxHealth = Math.round(100 * Math.pow(1.1, otamashisState.currentStage - 1)); // Fator de 1.2
        otamashisState.monsterHealth = otamashisState.monsterMaxHealth;
        
        renderOtamashisUI();
        
        document.getElementById('game-container').removeEventListener('click', handleMonsterClick);
        document.getElementById('game-container').addEventListener('click', handleMonsterClick);
        
        if (otamashisInterval) clearInterval(otamashisInterval);
        otamashisInterval = setInterval(updateOtamashisLoop, 1000/30);
    });
}

function updateOtamashisLoop() {
    const monsterEl = document.getElementById('monster-area');
    if (monsterEl) {
        const healthPct = otamashisState.monsterHealth / otamashisState.monsterMaxHealth;
        monsterEl.style.boxShadow = `0 0 20px 5px rgba(239, 68, 68, ${1-healthPct})`;
    }
}

async function handleMonsterClick(e) {
    if (!e.target.closest('#monster-area')) return;
    
    if (otamashisState.monsterHealth <= 0) return;

    otamashisState.monsterHealth -= otamashisState.playerDamage;
    
    const damagePopup = document.createElement('div');
    damagePopup.className = 'absolute text-xl font-bold text-red-500 animate-damage-popup';
    damagePopup.textContent = `-${otamashisState.playerDamage}`;
    const container = document.getElementById('game-container');
    
    damagePopup.style.left = `${e.clientX - container.getBoundingClientRect().left - 10}px`; 
    damagePopup.style.top = `${e.clientY - container.getBoundingClientRect().top - 30}px`; 
    
    container.appendChild(damagePopup);
    setTimeout(() => damagePopup.remove(), 800);
    
    if (otamashisState.monsterHealth <= 0) {
        otamashisState.monsterHealth = 0;
        
        const rewardsXP = otamashisState.monsterXPValue;
        const rewardsGold = otamashisState.monsterGoldValue;
        
        otamashisState.playerXP += rewardsXP;
        otamashisState.playerGold += rewardsGold;
        
        showNotification(`Monstro derrotado! +${rewardsXP} XP, +${rewardsGold} Gold!`, 'success');
        
        await saveRPGState(otamashisState.playerGold, rewardsXP, otamashisState.currentStage);
        
        setTimeout(advanceStage, 1000);
    }
    
    renderOtamashisUI();
}

async function saveRPGState(gold, xpGained, currentStage) {
    const userRef = db.collection('user-profiles').doc(currentUser.uid);
    const doc = await userRef.get();
    const data = doc.data() || {};
    
    const currentXP = data.totalXP || 0;
    const initialLevel = calculateLevel(currentXP).level;
    const newXP = currentXP + xpGained;
    
    const newLevelData = calculateLevel(newXP);
    const levelsGained = newLevelData.level - initialLevel;
    
    let attributePoints = data.attributePoints || 0;
    if (levelsGained > 0) {
        attributePoints += levelsGained * ATTR_POINTS_PER_LEVEL;
    }
    
    await userRef.update({
        rpgGold: gold,
        rpgStage: currentStage,
        totalXP: newXP,
        level: newLevelData.level,
        attributePoints: attributePoints
    });
    
    loadUserData();
}

function advanceStage() {
    otamashisState.currentStage++;
    
    otamashisState.monsterMaxHealth = Math.round(100 * Math.pow(1.2, otamashisState.currentStage - 1));
    otamashisState.monsterHealth = otamashisState.monsterMaxHealth;
    otamashisState.monsterXPValue = Math.round(otamashisState.monsterXPValue * 1.5);
    otamashisState.monsterGoldValue = Math.round(otamashisState.monsterGoldValue * 1.5);
    otamashisState.monsterName = `Monstro do Estágio ${otamashisState.currentStage}`;
    
    renderOtamashisUI();
}

function renderOtamashisUI() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const healthPct = (otamashisState.monsterHealth / otamashisState.monsterMaxHealth) * 100;
    const monsterIsDead = otamashisState.monsterHealth === 0;

    container.innerHTML = `
        <style>
            @keyframes damage-popup { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px) scale(1.5); } }
            .animate-damage-popup { animation: damage-popup 0.8s ease-out forwards; pointer-events: none; }
        </style>
        
        <div class="otamashis-wrapper relative w-full h-full p-4 flex flex-col items-center justify-between">
            
            <div class="w-full flex justify-between p-3 bg-slate-800/80 rounded-xl border border-purple-500/30 shadow-lg">
                <span class="text-yellow-400 font-bold"><i class="fas fa-coins mr-1"></i> ${formatNumber(otamashisState.playerGold)}</span>
                <span class="text-purple-400 font-bold"><i class="fas fa-star mr-1"></i> ${formatNumber(otamashisState.playerXP)} XP</span>
                <span class="text-green-400 font-bold"><i class="fas fa-heart mr-1"></i> ${formatNumber(otamashisState.playerHealth)} HP</span>
            </div>
            
            <div id="monster-area" class="relative cursor-pointer select-none mt-8 w-48 h-48 flex flex-col items-center justify-center 
                                           bg-gradient-to-br from-slate-700 to-slate-900 rounded-full border-4 ${monsterIsDead ? 'border-green-500/50' : 'border-red-600/50'} transition-all hover:scale-[1.02]">
                <div class="text-6xl animate-float">${monsterIsDead ? '💀' : otamashisState.monsterIcon}</div>
                <h4 class="text-white font-bold mt-2">${otamashisState.monsterName}</h4>
                <p class="text-xs text-gray-400">Estágio ${otamashisState.currentStage}</p>

                <div class="absolute -top-6 w-32 h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div class="h-full bg-red-500 transition-all duration-300" style="width: ${healthPct}%;"></div>
                </div>
                ${monsterIsDead ? '<span class="absolute text-xl font-bold text-green-400">DERROTADO!</span>' : ''}
            </div>
            
            <div class="text-center mt-4">
                <p class="text-3xl font-bold text-red-400">${formatNumber(otamashisState.monsterHealth)} / ${formatNumber(otamashisState.monsterMaxHealth)}</p>
                <p class="text-sm text-gray-400">Dano por Clique: <span class="text-green-400">${otamashisState.playerDamage}</span></p>
            </div>

            <div class="w-full flex justify-around p-3 bg-slate-800/80 rounded-xl border border-purple-500/30 shadow-lg mt-auto">
                <button class="text-pink-400 hover:text-pink-300 font-bold"><i class="fas fa-shopping-bag mr-1"></i> Loja (Em Breve)</button>
                <button class="text-cyan-400 hover:text-cyan-300 font-bold"><i class="fas fa-search mr-1"></i> Buscar Duelo (Online)</button>
            </div>
        </div>
    `;
    
    document.getElementById('game-container').style.display = 'flex';
}

function initTetris() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    gameState = {
        board: Array(ROWS).fill().map(() => Array(COLS).fill(0)),
        currentPiece: null,
        currentX: 0,
        currentY: 0,
        score: 0,
        gameOver: false,
        dropCounter: 0,
        dropInterval: 1000,
        lastTime: 0
    };
    
    const PIECES = [
        [[1,1,1,1]], // I
        [[1,1],[1,1]], // O
        [[1,1,1],[0,1,0]], // T
        [[1,1,1],[1,0,0]], // L
        [[1,1,1],[0,0,1]], // J
        [[1,1,0],[0,1,1]], // S
        [[0,1,1],[1,1,0]]  // Z
    ];
    
    const COLORS = ['#00f0f0', '#f0f000', '#a000f0', '#f0a000', '#0000f0', '#00f000', '#f00000'];
    
    function newPiece() {
        const id = Math.floor(Math.random() * PIECES.length);
        gameState.currentPiece = PIECES[id];
        gameState.currentColor = COLORS[id];
        gameState.currentX = Math.floor(COLS / 2) - Math.floor(gameState.currentPiece[0].length / 2);
        gameState.currentY = 0;
        
        if (collides()) {
            gameState.gameOver = true;
            endGame();
        }
    }
    
    function collides() {
        for (let y = 0; y < gameState.currentPiece.length; y++) {
            for (let x = 0; x < gameState.currentPiece[y].length; x++) {
                if (gameState.currentPiece[y][x]) {
                    const newX = gameState.currentX + x;
                    const newY = gameState.currentY + y;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                    if (newY >= 0 && gameState.board[newY][newX]) return true;
                }
            }
        }
        return false;
    }
    
    function merge() {
        for (let y = 0; y < gameState.currentPiece.length; y++) {
            for (let x = 0; x < gameState.currentPiece[y].length; x++) {
                if (gameState.currentPiece[y][x]) {
                    gameState.board[gameState.currentY + y][gameState.currentX + x] = gameState.currentColor;
                }
            }
        }
    }
    
    function clearLines() {
        let linesCleared = 0;
        
        for (let y = ROWS - 1; y >= 0; y--) {
            if (gameState.board[y].every(cell => cell !== 0)) {
                gameState.board.splice(y, 1);
                gameState.board.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            gameState.score += linesCleared * 100 * linesCleared;
            updateScore();
        }
    }
    
    function rotate() {
        const rotated = gameState.currentPiece[0].map((_, i) =>
            gameState.currentPiece.map(row => row[i]).reverse()
        );
        
        const previousPiece = gameState.currentPiece;
        gameState.currentPiece = rotated;
        
        if (collides()) {
            gameState.currentPiece = previousPiece;
        }
    }
    
    function move(dir) {
        gameState.currentX += dir;
        if (collides()) {
            gameState.currentX -= dir;
        }
    }
    
    function drop() {
        gameState.currentY++;
        if (collides()) {
            gameState.currentY--;
            merge();
            clearLines();
            newPiece();
        }
        gameState.dropCounter = 0;
    }
    
    function hardDrop() {
        while (!collides()) {
            gameState.currentY++;
        }
        gameState.currentY--;
        merge();
        clearLines();
        newPiece();
    }
    
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#333';
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(canvas.width, y * BLOCK_SIZE);
            ctx.stroke();
        }
        
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (gameState.board[y][x]) {
                    ctx.fillStyle = gameState.board[y][x];
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
        
        if (gameState.currentPiece) {
            ctx.fillStyle = gameState.currentColor;
            for (let y = 0; y < gameState.currentPiece.length; y++) {
                for (let x = 0; x < gameState.currentPiece[y].length; x++) {
                    if (gameState.currentPiece[y][x]) {
                        ctx.fillRect(
                            (gameState.currentX + x) * BLOCK_SIZE,
                            (gameState.currentY + y) * BLOCK_SIZE,
                            BLOCK_SIZE,
                            BLOCK_SIZE
                        );
                        ctx.strokeStyle = '#000';
                        ctx.strokeRect(
                            (gameState.currentX + x) * BLOCK_SIZE,
                            (gameState.currentY + y) * BLOCK_SIZE,
                            BLOCK_SIZE,
                            BLOCK_SIZE
                        );
                    }
                }
            }
        }
    }
    
    function update(time = 0) {
        if (gameState.gameOver) return;
        
        const deltaTime = time - gameState.lastTime;
        gameState.lastTime = time;
        gameState.dropCounter += deltaTime;
        
        if (gameState.dropCounter > gameState.dropInterval) {
            drop();
        }
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    document.addEventListener('keydown', (e) => {
        if (gameState.gameOver || currentGame !== 'tetris') return;
        
        if (e.key === 'ArrowLeft') move(-1);
        else if (e.key === 'ArrowRight') move(1);
        else if (e.key === 'ArrowDown') drop();
        else if (e.key === 'ArrowUp') rotate();
        else if (e.key === ' ') hardDrop();
    });
    
    newPiece();
    update();
}

function initSpaceShooter() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = 600;
    
    gameState = {
        ship: { x: 275, y: 500, width: 50, height: 50, speed: 5 },
        bullets: [],
        enemies: [],
        score: 0,
        gameOver: false,
        keys: {},
        spawnCounter: 0,
        spawnInterval: 60
    };
    
    function spawnEnemy() {
        gameState.enemies.push({
            x: Math.random() * (canvas.width - 40),
            y: -40,
            width: 40,
            height: 40,
            speed: 2 + Math.random() * 2
        });
    }
    
    function update() {
        if (gameState.gameOver) return;
        
        if (gameState.keys['ArrowLeft'] && gameState.ship.x > 0) {
            gameState.ship.x -= gameState.ship.speed;
        }
        if (gameState.keys['ArrowRight'] && gameState.ship.x < canvas.width - gameState.ship.width) {
            gameState.ship.x += gameState.ship.speed;
        }
        
        gameState.bullets = gameState.bullets.filter(bullet => {
            bullet.y -= 10;
            return bullet.y > 0;
        });
        
        gameState.enemies = gameState.enemies.filter(enemy => {
            enemy.y += enemy.speed;
            
            if (enemy.y > canvas.height) {
                gameState.gameOver = true;
                endGame();
                return false;
            }
            
            return true;
        });
        
        gameState.spawnCounter++;
        if (gameState.spawnCounter >= gameState.spawnInterval) {
            spawnEnemy();
            gameState.spawnCounter = 0;
        }
        
        gameState.bullets.forEach((bullet, bIndex) => {
            gameState.enemies.forEach((enemy, eIndex) => {
                if (
                    bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y
                ) {
                    gameState.bullets.splice(bIndex, 1);
                    gameState.enemies.splice(eIndex, 1);
                    gameState.score += 10;
                    updateScore();
                }
            });
        });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 123) % canvas.width;
            const y = (i * 456 + Date.now() * 0.1) % canvas.height;
            ctx.fillRect(x, y, 2, 2);
        }
        
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.moveTo(gameState.ship.x + 25, gameState.ship.y);
        ctx.lineTo(gameState.ship.x, gameState.ship.y + 50);
        ctx.lineTo(gameState.ship.x + 50, gameState.ship.y + 50);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ff0';
        gameState.bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        ctx.fillStyle = '#f00';
        gameState.enemies.forEach(enemy => {
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
    }
    
    const keyHandler = (e) => {
        if (currentGame !== 'space-shooter') return;
        gameState.keys[e.key] = e.type === 'keydown';
        
        if (e.key === ' ' && e.type === 'keydown' && !gameState.gameOver) {
            gameState.bullets.push({
                x: gameState.ship.x + 23,
                y: gameState.ship.y,
                width: 4,
                height: 10
            });
        }
    };
    
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keyup', keyHandler);
    
    update();
}

function initSnake() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 500;
    canvas.height = 500;
    
    const GRID_SIZE = 20;
    const CELL_SIZE = canvas.width / GRID_SIZE;
    
    gameState = {
        snake: [{ x: 10, y: 10 }],
        direction: { x: 1, y: 0 },
        nextDirection: { x: 1, y: 0 },
        food: { x: 15, y: 15 },
        score: 0,
        gameOver: false,
        moveCounter: 0,
        moveInterval: 10
    };
    
    function placeFood() {
        do {
            gameState.food = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (gameState.snake.some(segment => segment.x === gameState.food.x && segment.y === gameState.food.y));
    }
    
    function update() {
        if (gameState.gameOver) return;
        
        gameState.moveCounter++;
        if (gameState.moveCounter < gameState.moveInterval) {
            gameLoop = requestAnimationFrame(update);
            return;
        }
        gameState.moveCounter = 0;
        
        gameState.direction = gameState.nextDirection;
        
        const head = {
            x: gameState.snake[0].x + gameState.direction.x,
            y: gameState.snake[0].y + gameState.direction.y
        };
        
        if (
            head.x < 0 || head.x >= GRID_SIZE ||
            head.y < 0 || head.y >= GRID_SIZE ||
            gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)
        ) {
            gameState.gameOver = true;
            endGame();
            return;
        }
        
        gameState.snake.unshift(head);
        
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            gameState.score += 10;
            updateScore();
            placeFood();
        } else {
            gameState.snake.pop();
        }
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#2a2a2a';
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();
        }
        
        ctx.fillStyle = '#f00';
        ctx.fillRect(gameState.food.x * CELL_SIZE, gameState.food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        gameState.snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? '#0f0' : '#0a0';
            ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        });
    }
    
    const keyHandler = (e) => {
        if (currentGame !== 'snake' || gameState.gameOver) return;
        
        const key = e.key;
        const dir = gameState.direction;
        
        if (key === 'ArrowUp' && dir.y === 0) gameState.nextDirection = { x: 0, y: -1 };
        else if (key === 'ArrowDown' && dir.y === 0) gameState.nextDirection = { x: 0, y: 1 };
        else if (key === 'ArrowLeft' && dir.x === 0) gameState.nextDirection = { x: -1, y: 0 };
        else if (key === 'ArrowRight' && dir.x === 0) gameState.nextDirection = { x: 1, y: 0 };
    };
    
    document.addEventListener('keydown', keyHandler);
    
    update();
}

function initClickChallenge() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = 600;
    
    gameState = {
        targets: [],
        score: 0,
        timeLeft: 30,
        gameOver: false,
        lastSpawn: 0
    };
    
    function spawnTarget() {
        const size = 30 + Math.random() * 40;
        gameState.targets.push({
            x: Math.random() * (canvas.width - size),
            y: Math.random() * (canvas.height - size),
            size: size,
            color: `hsl(${Math.random() * 360}, 80%, 60%)`,
            life: 2000 + Math.random() * 1000
        });
    }
    
    function update() {
        if (gameState.gameOver) return;
        
        gameState.timeLeft -= 1/60;
        if (gameState.timeLeft <= 0) {
            gameState.gameOver = true;
            endGame();
            return;
        }
        
        const now = Date.now();
        if (now - gameState.lastSpawn > 800) {
            spawnTarget();
            gameState.lastSpawn = now;
        }
        
        gameState.targets = gameState.targets.filter(target => {
            target.life -= 16;
            return target.life > 0;
        });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Tempo: ${Math.ceil(gameState.timeLeft)}s`, canvas.width / 2, 40);
        
        gameState.targets.forEach(target => {
            const alpha = Math.min(1, target.life / 500);
            ctx.globalAlpha = alpha;
            
            ctx.fillStyle = target.color;
            ctx.beginPath();
            ctx.arc(target.x + target.size/2, target.y + target.size/2, target.size/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(target.x + target.size/2 - 10, target.y + target.size/2);
            ctx.lineTo(target.x + target.size/2 + 10, target.y + target.size/2);
            ctx.moveTo(target.x + target.size/2, target.y + target.size/2 - 10);
            ctx.lineTo(target.x + target.size/2, target.y + target.size/2 + 10);
            ctx.stroke();
        });
        
        ctx.globalAlpha = 1;
    }
    
    const clickHandler = (e) => {
        if (currentGame !== 'click-challenge' || gameState.gameOver) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (let i = gameState.targets.length - 1; i >= 0; i--) {
            const target = gameState.targets[i];
            const dx = x - (target.x + target.size/2);
            const dy = y - (target.y + target.size/2);
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < target.size/2) {
                gameState.targets.splice(i, 1);
                const points = Math.floor(target.size / 2);
                gameState.score += points;
                updateScore();
                break;
            }
        }
    };
    
    canvas.addEventListener('click', clickHandler);
    
    spawnTarget();
    update();
}

function initPong() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = 400;
    
    gameState = {
        playerPaddle: { x: 20, y: 150, width: 10, height: 100, speed: 6 },
        aiPaddle: { x: 570, y: 150, width: 10, height: 100, speed: 4 },
        ball: { x: 300, y: 200, radius: 8, speedX: 4, speedY: 4 },
        score: 0,
        aiScore: 0,
        gameOver: false,
        keys: {}
    };
    
    function update() {
        if (gameState.gameOver) return;
        
        if (gameState.keys['ArrowUp'] && gameState.playerPaddle.y > 0) {
            gameState.playerPaddle.y -= gameState.playerPaddle.speed;
        }
        if (gameState.keys['ArrowDown'] && gameState.playerPaddle.y < canvas.height - gameState.playerPaddle.height) {
            gameState.playerPaddle.y += gameState.playerPaddle.speed;
        }
        
        const paddleCenter = gameState.aiPaddle.y + gameState.aiPaddle.height / 2;
        if (paddleCenter < gameState.ball.y - 10) {
            gameState.aiPaddle.y += gameState.aiPaddle.speed;
        } else if (paddleCenter > gameState.ball.y + 10) {
            gameState.aiPaddle.y -= gameState.aiPaddle.speed;
        }
        
        gameState.ball.x += gameState.ball.speedX;
        gameState.ball.y += gameState.ball.speedY;
        
        if (gameState.ball.y - gameState.ball.radius < 0 || gameState.ball.y + gameState.ball.radius > canvas.height) {
            gameState.ball.speedY *= -1;
        }
        
        if (
            gameState.ball.x - gameState.ball.radius < gameState.playerPaddle.x + gameState.playerPaddle.width &&
            gameState.ball.y > gameState.playerPaddle.y &&
            gameState.ball.y < gameState.playerPaddle.y + gameState.playerPaddle.height
        ) {
            gameState.ball.speedX *= -1.1;
            gameState.score += 10;
            updateScore();
        }
        
        if (
            gameState.ball.x + gameState.ball.radius > gameState.aiPaddle.x &&
            gameState.ball.y > gameState.aiPaddle.y &&
            gameState.ball.y < gameState.aiPaddle.y + gameState.aiPaddle.height
        ) {
            gameState.ball.speedX *= -1.1;
        }
        
        if (gameState.ball.x < 0) {
            gameState.aiScore++;
            if (gameState.aiScore >= 5) {
                gameState.gameOver = true;
                endGame();
            } else {
                resetBall();
            }
        }
        
        if (gameState.ball.x > canvas.width) {
            gameState.score += 50;
            updateScore();
            resetBall();
        }
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function resetBall() {
        gameState.ball.x = canvas.width / 2;
        gameState.ball.y = canvas.height / 2;
        gameState.ball.speedX = 4 * (Math.random() > 0.5 ? 1 : -1);
        gameState.ball.speedY = 4 * (Math.random() > 0.5 ? 1 : -1);
    }
    
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#444';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${gameState.score}`, canvas.width / 4, 50);
        ctx.fillText(`${gameState.aiScore}`, (canvas.width / 4) * 3, 50);
        
        ctx.fillStyle = '#0f0';
        ctx.fillRect(gameState.playerPaddle.x, gameState.playerPaddle.y, gameState.playerPaddle.width, gameState.playerPaddle.height);
        ctx.fillStyle = '#f00';
        ctx.fillRect(gameState.aiPaddle.x, gameState.aiPaddle.y, gameState.aiPaddle.width, gameState.aiPaddle.height);
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const keyHandler = (e) => {
        if (currentGame !== 'pong') return;
        gameState.keys[e.key] = e.type === 'keydown';
    };
    
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keyup', keyHandler);
    
    canvas.addEventListener('mousemove', (e) => {
        if (currentGame !== 'pong') return;
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        gameState.playerPaddle.y = Math.max(0, Math.min(y - gameState.playerPaddle.height/2, canvas.height - gameState.playerPaddle.height));
    });
    
    update();
}

function initMemory() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = 600;
    
    const ROWS = 4;
    const COLS = 4;
    const CARD_SIZE = 130;
    const PADDING = 10;
    const OFFSET_X = (canvas.width - (COLS * CARD_SIZE + (COLS - 1) * PADDING)) / 2;
    const OFFSET_Y = (canvas.height - (ROWS * CARD_SIZE + (ROWS - 1) * PADDING)) / 2;
    
    const SYMBOLS = ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎹', '🎺'];
    const cards = [...SYMBOLS, ...SYMBOLS].sort(() => Math.random() - 0.5);
    
    gameState = {
        cards: cards.map((symbol, index) => ({
            symbol,
            revealed: false,
            matched: false,
            index
        })),
        firstCard: null,
        secondCard: null,
        canClick: true,
        score: 0,
        moves: 0,
        gameOver: false
    };
    
    function draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        gameState.cards.forEach((card, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const x = OFFSET_X + col * (CARD_SIZE + PADDING);
            const y = OFFSET_Y + row * (CARD_SIZE + PADDING);
            
            if (card.matched) {
                ctx.fillStyle = '#0a0';
            } else if (card.revealed) {
                ctx.fillStyle = '#a855f7';
            } else {
                ctx.fillStyle = '#333';
            }
            
            ctx.fillRect(x, y, CARD_SIZE, CARD_SIZE);
            
            ctx.strokeStyle = card.revealed || card.matched ? '#fff' : '#555';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, CARD_SIZE, CARD_SIZE);
            
            if (card.revealed || card.matched) {
                ctx.font = '60px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(card.symbol, x + CARD_SIZE/2, y + CARD_SIZE/2);
            } else {
                ctx.fillStyle = '#555';
                ctx.font = 'bold 40px Arial';
                ctx.fillText('?', x + CARD_SIZE/2, y + CARD_SIZE/2);
            }
        });
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Movimentos: ${gameState.moves}`, 20, 30);
    }
    
    function checkCard(index) {
        if (!gameState.canClick || gameState.gameOver) return;
        
        const card = gameState.cards[index];
        if (card.revealed || card.matched) return;
        
        card.revealed = true;
        
        if (!gameState.firstCard) {
            gameState.firstCard = card;
        } else if (!gameState.secondCard) {
            gameState.secondCard = card;
            gameState.moves++;
            gameState.canClick = false;
            
            setTimeout(() => {
                if (gameState.firstCard.symbol === gameState.secondCard.symbol) {
                    gameState.firstCard.matched = true;
                    gameState.secondCard.matched = true;
                    gameState.score += 50;
                    updateScore();
                    
                    if (gameState.cards.every(c => c.matched)) {
                        gameState.score += Math.max(0, 500 - gameState.moves * 10);
                        updateScore();
                        gameState.gameOver = true;
                        endGame();
                    }
                } else {
                    gameState.firstCard.revealed = false;
                    gameState.secondCard.revealed = false;
                }
                
                gameState.firstCard = null;
                gameState.secondCard = null;
                gameState.canClick = true;
                draw();
            }, 1000);
        }
        
        draw();
    }
    
    canvas.addEventListener('click', (e) => {
        if (currentGame !== 'memory') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        gameState.cards.forEach((card, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const cardX = OFFSET_X + col * (CARD_SIZE + PADDING);
            const cardY = OFFSET_Y + row * (CARD_SIZE + PADDING);
            
            if (x >= cardX && x <= cardX + CARD_SIZE && y >= cardY && y <= cardY + CARD_SIZE) {
                checkCard(index);
            }
        });
    });
    
    draw();
}

// =====================================================
// GAME MANAGEMENT
// =====================================================

function updateScore() {
    document.getElementById('current-score').textContent = formatNumber(gameState.score);
}

function startGame(gameName) {
    currentGame = gameName;
    const config = GAMES_CONFIG[gameName];
    
    document.getElementById('modal-game-icon').textContent = config.icon;
    document.getElementById('modal-game-title').textContent = config.title;
    document.getElementById('instructions-text').textContent = config.instructions;
    document.getElementById('current-score').textContent = '0';
    
    const canvas = document.getElementById('game-canvas');
    
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    if (!config.isRPG) {
        document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas>';
        canvas.width = config.canvasWidth;
        canvas.height = config.canvasHeight;
        document.getElementById('game-container').style.display = 'block';

        startPlayTimer(); 
    } else {
        document.getElementById('game-container').style.display = 'flex';
        if (otamashisInterval) clearInterval(otamashisInterval);
        document.getElementById('game-container').innerHTML = '';
        otamashisState = {};
    }

    document.getElementById('game-modal').classList.add('show');
    
    switch(gameName) {
        case 'tetris': initTetris(); break;
        case 'space-shooter': initSpaceShooter(); break;
        case 'snake': initSnake(); break;
        case 'click-challenge': initClickChallenge(); break;
        case 'pong': initPong(); break;
        case 'memory': initMemory(); break;
        case 'otamashis': initOtamashis(); break; 
    }
}

function endGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    const finalScore = gameState.score;
    document.getElementById('final-score').textContent = formatNumber(finalScore);
    
    if (!GAMES_CONFIG[currentGame].isRPG) {
        stopAndSaveGameStats(finalScore); 
    }
    
    const recordElement = document.querySelector(`.record-score[data-game="${currentGame}"]`);
    let currentRecord = 0;
    try {
        currentRecord = recordElement ? parseInt(recordElement.textContent.replace(/\./g, '')) : 0;
    } catch(e) {
        console.warn("Erro ao parsear recorde, usando 0.", e);
    }
    
    if (finalScore > currentRecord) {
        document.getElementById('high-score-message').textContent = '🎉 Novo Recorde Pessoal! 🎉';
    } else {
        document.getElementById('high-score-message').textContent = `Seu recorde: ${formatNumber(currentRecord)}`;
    }
    
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function closeGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    if (otamashisInterval) {
        clearInterval(otamashisInterval);
        otamashisInterval = null;
    }
    
    if(playStartTime !== 0 && !GAMES_CONFIG[currentGame].isRPG) {
        stopAndSaveGameStats(0); 
    }
    
    document.getElementById('game-modal').classList.remove('show');
    currentGame = null;
    gameState = {};
    otamashisState = {};
    
    document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas>';
    document.getElementById('game-container').removeEventListener('click', handleMonsterClick);
}

// =====================================================
// EVENT LISTENERS
// =====================================================

document.getElementById('login-btn').addEventListener('click', handleLogin);
document.getElementById('login-btn-mobile').addEventListener('click', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
});

document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const gameName = e.currentTarget.dataset.game;
        
        if (!currentUser) {
            showNotification('Você está jogando offline. Faça login para salvar sua pontuação!', 'warning');
        }
        
        startGame(gameName);
    });
});

document.getElementById('close-modal').addEventListener('click', closeGame);
document.getElementById('play-again-btn').addEventListener('click', () => {
    startGame(currentGame);
});
document.getElementById('change-game-btn').addEventListener('click', closeGame);

document.querySelectorAll('.ranking-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        loadRankings(e.target.dataset.game);
    });
});

document.querySelectorAll('[href="#profile"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            document.getElementById('profile').style.display = 'block';
            document.getElementById('profile').scrollIntoView({ behavior: 'smooth' });
        } else {
            showNotification('Faça login para ver seu perfil!', 'info');
        }
    });
});

const backToTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
});

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// =====================================================
// INITIALIZATION
// =====================================================

loadRankings('tetris');
loadGlobalStats();

console.log('🎮 Mini-Jogos carregados com sucesso! Sistema de Tempo/XP/Nível/Atributos ativado.');
