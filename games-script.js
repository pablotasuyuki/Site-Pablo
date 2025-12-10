/**
 * =====================================================
 * GAMES SCRIPT JS - Mini-Jogos Pablo Tasuyuki
 * =====================================================
 * 
 * Funcionalidades:
 * - 6 Mini-jogos completos e interativos
 * - Sistema de autenticação Google (Firebase)
 * - Rankings globais por jogo (Firestore)
 * - Perfil do usuário com estatísticas
 * - Notificações e animações
 */

// =====================================================
// FIREBASE CONFIGURATION
// =====================================================

// IMPORTANTE: Substitua com suas credenciais Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDALe6eKby-7JaCBvej9iqr95Y97s6oHWg",
    authDomain: "flutter-ai-playground-7971c.firebaseapp.com",
    projectId: "flutter-ai-playground-7971c",
    storageBucket: "flutter-ai-playground-7971c.firebasestorage.app",
    messagingSenderId: "623047073166",
    appId: "1:623047073166:web:83d31c6c017b2e70af58df"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentGame = null;
let gameLoop = null;
let gameState = {};

const GAMES_CONFIG = {
    'tetris': {
        icon: '🧱',
        title: 'Tetris',
        instructions: 'Use as setas ← → para mover, ↑ para rotacionar e ↓ para descer rápido. Complete linhas para pontuar!',
        canvasWidth: 300,
        canvasHeight: 600
    },
    'space-shooter': {
        icon: '🚀',
        title: 'Space Shooter',
        instructions: 'Use as setas ← → para mover a nave e ESPAÇO para atirar. Destrua asteroides e inimigos!',
        canvasWidth: 600,
        canvasHeight: 600
    },
    'snake': {
        icon: '🐍',
        title: 'Snake Game',
        instructions: 'Use as setas para controlar a cobra. Coma frutas para crescer. Não bata nas paredes ou em si mesmo!',
        canvasWidth: 500,
        canvasHeight: 500
    },
    'click-challenge': {
        icon: '🎯',
        title: 'Click Challenge',
        instructions: 'Clique nos alvos que aparecem na tela o mais rápido possível! Você tem 30 segundos!',
        canvasWidth: 600,
        canvasHeight: 600
    },
    'pong': {
        icon: '🏓',
        title: 'Pong Classic',
        instructions: 'Use as setas ↑ ↓ ou mouse para mover sua raquete. Não deixe a bola passar!',
        canvasWidth: 600,
        canvasHeight: 400
    },
    'memory': {
        icon: '🎨',
        title: 'Memory Game',
        instructions: 'Clique nas cartas para virá-las. Encontre todos os pares correspondentes!',
        canvasWidth: 600,
        canvasHeight: 600
    }
};

// =====================================================
// UTILITY FUNCTIONS
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
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// =====================================================
// AUTHENTICATION
// =====================================================

async function handleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        showNotification('Login realizado com sucesso!', 'success');
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
    } catch (error) {
        console.error('Erro no logout:', error);
        showNotification('Erro ao fazer logout.', 'error');
    }
}

function updateUIForUser(user) {
    currentUser = user;
    
    if (user) {
        // Mostrar informações do usuário
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('login-btn-mobile').style.display = 'none';
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-info').classList.add('flex');
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/150';
        document.getElementById('user-name').textContent = user.displayName || 'Jogador';
        
        // Mostrar links de perfil
        document.getElementById('nav-profile').style.display = 'block';
        document.getElementById('nav-profile-mobile').style.display = 'block';
        
        // Carregar dados do usuário
        loadUserData();
    } else {
        // Esconder informações do usuário
        document.getElementById('login-btn').style.display = 'flex';
        document.getElementById('login-btn-mobile').style.display = 'block';
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('user-info').classList.remove('flex');
        
        // Esconder links de perfil
        document.getElementById('nav-profile').style.display = 'none';
        document.getElementById('nav-profile-mobile').style.display = 'none';
        document.getElementById('profile').style.display = 'none';
    }
}

// Monitor de estado de autenticação
auth.onAuthStateChanged(updateUIForUser);

// Verificar resultado de redirect
auth.getRedirectResult().then((result) => {
    if (result.user) {
        showNotification('Login realizado com sucesso!', 'success');
    }
}).catch((error) => {
    console.error('Erro no redirect:', error);
});

// =====================================================
// FIRESTORE FUNCTIONS
// =====================================================

async function saveScore(gameName, score) {
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
        
        // Atualizar perfil do usuário
        await updateUserProfile(gameName, score);
        
        showNotification('Pontuação salva com sucesso!', 'success');
        
        // Recarregar rankings
        loadRankings(gameName);
    } catch (error) {
        console.error('Erro ao salvar pontuação:', error);
        showNotification('Erro ao salvar pontuação.', 'error');
    }
}

async function updateUserProfile(gameName, score) {
    const userRef = db.collection('user-profiles').doc(currentUser.uid);
    
    try {
        const doc = await userRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const games = data.games || {};
            
            if (!games[gameName] || games[gameName].bestScore < score) {
                games[gameName] = {
                    bestScore: score,
                    playCount: (games[gameName]?.playCount || 0) + 1,
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
                };
            } else {
                games[gameName].playCount = (games[gameName].playCount || 0) + 1;
                games[gameName].lastPlayed = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            await userRef.update({ games });
        } else {
            // Criar novo perfil
            await userRef.set({
                userId: currentUser.uid,
                userName: currentUser.displayName,
                userPhoto: currentUser.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                games: {
                    [gameName]: {
                        bestScore: score,
                        playCount: 1,
                        lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
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
            
            // Atualizar estatísticas gerais
            let totalScore = 0;
            let totalGames = 0;
            let favoriteGame = '-';
            let maxPlayCount = 0;
            
            Object.keys(games).forEach(gameName => {
                totalScore += games[gameName].bestScore || 0;
                totalGames += games[gameName].playCount || 0;
                
                if (games[gameName].playCount > maxPlayCount) {
                    maxPlayCount = games[gameName].playCount;
                    favoriteGame = GAMES_CONFIG[gameName]?.title || gameName;
                }
            });
            
            document.getElementById('user-score').textContent = `${formatNumber(totalScore)} pontos totais`;
            
            // Atualizar recordes nos cards
            Object.keys(GAMES_CONFIG).forEach(gameName => {
                const recordElement = document.querySelector(`.record-score[data-game="${gameName}"]`);
                const playCountElement = document.querySelector(`.play-count[data-game="${gameName}"]`);
                
                if (games[gameName]) {
                    if (recordElement) recordElement.textContent = formatNumber(games[gameName].bestScore || 0);
                    if (playCountElement) playCountElement.textContent = games[gameName].playCount || 0;
                }
            });
            
            // Atualizar perfil
            document.getElementById('profile-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/150';
            document.getElementById('profile-name').textContent = currentUser.displayName || 'Jogador';
            document.getElementById('profile-total-score').textContent = formatNumber(totalScore);
            document.getElementById('profile-total-games').textContent = totalGames;
            document.getElementById('profile-favorite').textContent = favoriteGame;
            
            // Atualizar recordes pessoais
            const recordsContainer = document.getElementById('profile-records');
            let recordsHtml = '';
            
            Object.keys(GAMES_CONFIG).forEach(gameName => {
                const config = GAMES_CONFIG[gameName];
                const gameData = games[gameName];
                
                recordsHtml += `
                    <div class="record-item">
                        <span>${config.icon} ${config.title}</span>
                        <span class="font-bold text-purple-400">${gameData ? formatNumber(gameData.bestScore) : '0'}</span>
                    </div>
                `;
            });
            
            recordsContainer.innerHTML = recordsHtml;
        }
        
        // Carregar estatísticas globais
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
// GAME ENGINE - TETRIS
// =====================================================

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
        // Limpar canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar grade
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
        
        // Desenhar tabuleiro
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
        
        // Desenhar peça atual
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
    
    // Controles
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

// =====================================================
// GAME ENGINE - SPACE SHOOTER
// =====================================================

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
        
        // Mover nave
        if (gameState.keys['ArrowLeft'] && gameState.ship.x > 0) {
            gameState.ship.x -= gameState.ship.speed;
        }
        if (gameState.keys['ArrowRight'] && gameState.ship.x < canvas.width - gameState.ship.width) {
            gameState.ship.x += gameState.ship.speed;
        }
        
        // Mover balas
        gameState.bullets = gameState.bullets.filter(bullet => {
            bullet.y -= 10;
            return bullet.y > 0;
        });
        
        // Mover inimigos
        gameState.enemies = gameState.enemies.filter(enemy => {
            enemy.y += enemy.speed;
            
            if (enemy.y > canvas.height) {
                gameState.gameOver = true;
                endGame();
                return false;
            }
            
            return true;
        });
        
        // Spawn inimigos
        gameState.spawnCounter++;
        if (gameState.spawnCounter >= gameState.spawnInterval) {
            spawnEnemy();
            gameState.spawnCounter = 0;
        }
        
        // Detectar colisões
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
        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Estrelas
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 123) % canvas.width;
            const y = (i * 456 + Date.now() * 0.1) % canvas.height;
            ctx.fillRect(x, y, 2, 2);
        }
        
        // Nave
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.moveTo(gameState.ship.x + 25, gameState.ship.y);
        ctx.lineTo(gameState.ship.x, gameState.ship.y + 50);
        ctx.lineTo(gameState.ship.x + 50, gameState.ship.y + 50);
        ctx.closePath();
        ctx.fill();
        
        // Balas
        ctx.fillStyle = '#ff0';
        gameState.bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Inimigos
        ctx.fillStyle = '#f00';
        gameState.enemies.forEach(enemy => {
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
    }
    
    // Controles
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

// =====================================================
// GAME ENGINE - SNAKE
// =====================================================

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
        
        // Atualizar direção
        gameState.direction = gameState.nextDirection;
        
        // Nova cabeça
        const head = {
            x: gameState.snake[0].x + gameState.direction.x,
            y: gameState.snake[0].y + gameState.direction.y
        };
        
        // Verificar colisões
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
        
        // Verificar comida
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
        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grade
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
        
        // Comida
        ctx.fillStyle = '#f00';
        ctx.fillRect(gameState.food.x * CELL_SIZE, gameState.food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Cobra
        gameState.snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? '#0f0' : '#0a0';
            ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        });
    }
    
    // Controles
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

// =====================================================
// GAME ENGINE - CLICK CHALLENGE
// =====================================================

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
        
        // Timer
        gameState.timeLeft -= 1/60;
        if (gameState.timeLeft <= 0) {
            gameState.gameOver = true;
            endGame();
            return;
        }
        
        // Spawn targets
        const now = Date.now();
        if (now - gameState.lastSpawn > 800) {
            spawnTarget();
            gameState.lastSpawn = now;
        }
        
        // Update targets
        gameState.targets = gameState.targets.filter(target => {
            target.life -= 16;
            return target.life > 0;
        });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        // Background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Timer
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Tempo: ${Math.ceil(gameState.timeLeft)}s`, canvas.width / 2, 40);
        
        // Targets
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
            
            // Crosshair
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
    
    // Click handler
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

// =====================================================
// GAME ENGINE - PONG
// =====================================================

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
        
        // Mover paddle do jogador
        if (gameState.keys['ArrowUp'] && gameState.playerPaddle.y > 0) {
            gameState.playerPaddle.y -= gameState.playerPaddle.speed;
        }
        if (gameState.keys['ArrowDown'] && gameState.playerPaddle.y < canvas.height - gameState.playerPaddle.height) {
            gameState.playerPaddle.y += gameState.playerPaddle.speed;
        }
        
        // IA simples
        const paddleCenter = gameState.aiPaddle.y + gameState.aiPaddle.height / 2;
        if (paddleCenter < gameState.ball.y - 10) {
            gameState.aiPaddle.y += gameState.aiPaddle.speed;
        } else if (paddleCenter > gameState.ball.y + 10) {
            gameState.aiPaddle.y -= gameState.aiPaddle.speed;
        }
        
        // Mover bola
        gameState.ball.x += gameState.ball.speedX;
        gameState.ball.y += gameState.ball.speedY;
        
        // Colisão com topo/fundo
        if (gameState.ball.y - gameState.ball.radius < 0 || gameState.ball.y + gameState.ball.radius > canvas.height) {
            gameState.ball.speedY *= -1;
        }
        
        // Colisão com paddles
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
        
        // Reset se sair da tela
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
        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Linha central
        ctx.strokeStyle = '#444';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Placar
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${gameState.score}`, canvas.width / 4, 50);
        ctx.fillText(`${gameState.aiScore}`, (canvas.width / 4) * 3, 50);
        
        // Paddles
        ctx.fillStyle = '#0f0';
        ctx.fillRect(gameState.playerPaddle.x, gameState.playerPaddle.y, gameState.playerPaddle.width, gameState.playerPaddle.height);
        ctx.fillStyle = '#f00';
        ctx.fillRect(gameState.aiPaddle.x, gameState.aiPaddle.y, gameState.aiPaddle.width, gameState.aiPaddle.height);
        
        // Bola
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Controles
    const keyHandler = (e) => {
        if (currentGame !== 'pong') return;
        gameState.keys[e.key] = e.type === 'keydown';
    };
    
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keyup', keyHandler);
    
    // Mouse control
    canvas.addEventListener('mousemove', (e) => {
        if (currentGame !== 'pong') return;
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        gameState.playerPaddle.y = Math.max(0, Math.min(y - gameState.playerPaddle.height/2, canvas.height - gameState.playerPaddle.height));
    });
    
    update();
}

// =====================================================
// GAME ENGINE - MEMORY GAME
// =====================================================

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
        
        // Desenhar cartas
        gameState.cards.forEach((card, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const x = OFFSET_X + col * (CARD_SIZE + PADDING);
            const y = OFFSET_Y + row * (CARD_SIZE + PADDING);
            
            // Fundo da carta
            if (card.matched) {
                ctx.fillStyle = '#0a0';
            } else if (card.revealed) {
                ctx.fillStyle = '#a855f7';
            } else {
                ctx.fillStyle = '#333';
            }
            
            ctx.fillRect(x, y, CARD_SIZE, CARD_SIZE);
            
            // Borda
            ctx.strokeStyle = card.revealed || card.matched ? '#fff' : '#555';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, CARD_SIZE, CARD_SIZE);
            
            // Símbolo
            if (card.revealed || card.matched) {
                ctx.font = '60px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(card.symbol, x + CARD_SIZE/2, y + CARD_SIZE/2);
            } else {
                // Padrão no verso
                ctx.fillStyle = '#555';
                ctx.font = 'bold 40px Arial';
                ctx.fillText('?', x + CARD_SIZE/2, y + CARD_SIZE/2);
            }
        });
        
        // Info
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
                    
                    // Verificar se ganhou
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
    
    // Click handler
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
    
    // Atualizar modal
    document.getElementById('modal-game-icon').textContent = config.icon;
    document.getElementById('modal-game-title').textContent = config.title;
    document.getElementById('instructions-text').textContent = config.instructions;
    document.getElementById('current-score').textContent = '0';
    
    // Configurar canvas
    const canvas = document.getElementById('game-canvas');
    canvas.width = config.canvasWidth;
    canvas.height = config.canvasHeight;
    
    // Esconder game over
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    // Mostrar modal
    document.getElementById('game-modal').classList.add('show');
    
    // Iniciar jogo específico
    switch(gameName) {
        case 'tetris': initTetris(); break;
        case 'space-shooter': initSpaceShooter(); break;
        case 'snake': initSnake(); break;
        case 'click-challenge': initClickChallenge(); break;
        case 'pong': initPong(); break;
        case 'memory': initMemory(); break;
    }
}

function endGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    const finalScore = gameState.score;
    document.getElementById('final-score').textContent = formatNumber(finalScore);
    
    // Salvar pontuação
    saveScore(currentGame, finalScore);
    
    // Verificar se é recorde pessoal
    const recordElement = document.querySelector(`.record-score[data-game="${currentGame}"]`);
    const currentRecord = recordElement ? parseInt(recordElement.textContent.replace(/\./g, '')) : 0;
    
    if (finalScore > currentRecord) {
        document.getElementById('high-score-message').textContent = '🎉 Novo Recorde Pessoal! 🎉';
    } else {
        document.getElementById('high-score-message').textContent = `Seu recorde: ${formatNumber(currentRecord)}`;
    }
    
    // Mostrar tela de game over
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function closeGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    document.getElementById('game-modal').classList.remove('show');
    currentGame = null;
    gameState = {};
}

// =====================================================
// EVENT LISTENERS
// =====================================================

// Login/Logout
document.getElementById('login-btn').addEventListener('click', handleLogin);
document.getElementById('login-btn-mobile').addEventListener('click', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);

// Mobile Menu
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
});

// Play Buttons
document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const gameName = e.currentTarget.dataset.game;
        
        if (!currentUser) {
            showNotification('Faça login para jogar e salvar sua pontuação!', 'info');
            // Pode jogar sem login, mas não salva
        }
        
        startGame(gameName);
    });
});

// Modal Controls
document.getElementById('close-modal').addEventListener('click', closeGame);
document.getElementById('play-again-btn').addEventListener('click', () => {
    startGame(currentGame);
});
document.getElementById('change-game-btn').addEventListener('click', closeGame);

// Ranking Tabs
document.querySelectorAll('.ranking-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        loadRankings(e.target.dataset.game);
    });
});

// Profile Link
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

// Back to Top
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

// Carregar rankings iniciais
loadRankings('tetris');
loadGlobalStats();

// Impedir scroll quando modal aberto
document.getElementById('game-modal').addEventListener('click', (e) => {
    if (e.target.id === 'game-modal') {
        // Não fechar ao clicar fora
    }
});

console.log('🎮 Mini-Jogos carregados com sucesso!');
