// DOM Elements
const gameEl = document.getElementById('game');
const ringsInput = document.getElementById('rings');
const startBtn = document.getElementById('start');
const demoBtn = document.getElementById('demo');
const resetBtn = document.getElementById('reset');
const movesEl = document.getElementById('moves');
const minMovesEl = document.getElementById('min-moves');
const demoModal = document.getElementById('demo-modal');
const demoStartBtn = document.getElementById('demo-start');
const demoBackBtn = document.getElementById('demo-back');
const errorOverlay = document.getElementById('error-overlay');
const winOverlay = document.getElementById('win-overlay');
const highscoresTable = document.querySelector('#highscores-table tbody');
const themeToggle = document.querySelector('.theme-toggle');

// Game State
let towers = [[], [], []];
let selectedRing = null;
let selectedTower = null;
let moves = 0;
let isDemo = false;
let demoInterval = null;
let demoMoves = [];
let currentDemoMove = 0;

// Colors for rings
const ringColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'
];

// Initialize
function init() {
    renderHighscores();
    themeToggle.addEventListener('click', toggleTheme);
    startBtn.addEventListener('click', startGame);
    demoBtn.addEventListener('click', startDemo);
    resetBtn.addEventListener('click', resetGame);
    demoStartBtn.addEventListener('click', () => {
        demoModal.style.display = 'none';
        startGame();
    });
    demoBackBtn.addEventListener('click', () => {
        demoModal.style.display = 'none';
    });
}

// Toggle Theme
function toggleTheme() {
    document.body.classList.toggle('light');
}

// Start Game
function startGame() {
    resetGame();
    const numRings = parseInt(ringsInput.value);
    if (numRings < 3 || numRings > 8) {
        alert('Nombre d\'anneaux doit être entre 3 et 8');
        return;
    }
    minMovesEl.textContent = Math.pow(2, numRings) - 1;
    towers[0] = Array.from({ length: numRings }, (_, i) => numRings - i);
    renderGame();
}

// Start Demo
function startDemo() {
    resetGame();
    const numRings = parseInt(ringsInput.value);
    if (numRings < 3 || numRings > 8) {
        alert('Nombre d\'anneaux doit être entre 3 et 8');
        return;
    }
    minMovesEl.textContent = Math.pow(2, numRings) - 1;
    towers[0] = Array.from({ length: numRings }, (_, i) => numRings - i);
    demoMoves = solveHanoi(numRings, 0, 2, 1);
    currentDemoMove = 0;
    isDemo = true;
    demoModal.style.display = 'flex';
}

// Reset Game
function resetGame() {
    towers = [[], [], []];
    selectedRing = null;
    selectedTower = null;
    moves = 0;
    movesEl.textContent = moves;
    isDemo = false;
    if (demoInterval) clearInterval(demoInterval);
    renderGame();
}

// Render Game
function renderGame() {
    gameEl.innerHTML = '';
    towers.forEach((tower, towerIndex) => {
        const towerEl = document.createElement('div');
        towerEl.className = 'tower';
        towerEl.dataset.index = towerIndex;
        tower.forEach(ring => {
            const ringEl = document.createElement('div');
            ringEl.className = 'ring';
            ringEl.dataset.size = ring;
            ringEl.style.setProperty('--width', `${ring * 15}px`);
            ringEl.style.setProperty('--color', ringColors[ring - 1]);
            ringEl.addEventListener('click', () => selectRing(towerIndex, ring));
            towerEl.appendChild(ringEl);
        });
        gameEl.appendChild(towerEl);
    });
}

// Select Ring
function selectRing(towerIndex, ring) {
    if (isDemo) return;
    if (selectedRing === null) {
        selectedRing = ring;
        selectedTower = towerIndex;
        renderGame();
        const rings = document.querySelectorAll('.ring');
        rings.forEach(r => {
            if (parseInt(r.dataset.size) === ring && r.parentElement.dataset.index == towerIndex) {
                r.classList.add('selected');
            }
        });
    } else {
        if (!moveRing(selectedTower, towerIndex)) {
            errorOverlay.style.display = 'flex';
            setTimeout(() => errorOverlay.style.display = 'none', 1000);
        }
        selectedRing = null;
        selectedTower = null;
        renderGame();
    }
}

// Move Ring
function moveRing(from, to) {
    if (towers[from].length === 0) return false;
    const ring = towers[from][towers[from].length - 1];
    if (towers[to].length > 0 && towers[to][towers[to].length - 1] < ring) {
        return false;
    }
    towers[from].pop();
    towers[to].push(ring);
    moves++;
    movesEl.textContent = moves;
    checkWin();
    return true;
}

// Check Win
function checkWin() {
    if (towers[2].length === parseInt(ringsInput.value)) {
        winOverlay.style.display = 'flex';
        setTimeout(() => winOverlay.style.display = 'none', 2000);
        saveHighscore();
    }
}

// Save Highscore
function saveHighscore() {
    const numRings = parseInt(ringsInput.value);
    const minMoves = Math.pow(2, numRings) - 1;
    const highscores = JSON.parse(localStorage.getItem('hanoiHighscores')) || {};
    if (!highscores[numRings] || moves < highscores[numRings]) {
        highscores[numRings] = moves;
        localStorage.setItem('hanoiHighscores', JSON.stringify(highscores));
        renderHighscores();
    }
}

// Render Highscores
function renderHighscores() {
    highscoresTable.innerHTML = '';
    const highscores = JSON.parse(localStorage.getItem('hanoiHighscores')) || {};
    for (let i = 3; i <= 8; i++) {
        const tr = document.createElement('tr');
        const tdRings = document.createElement('td');
        tdRings.textContent = i;
        const tdMoves = document.createElement('td');
        tdMoves.textContent = highscores[i] || '--';
        const tdMin = document.createElement('td');
        tdMin.textContent = Math.pow(2, i) - 1;
        tr.appendChild(tdRings);
        tr.appendChild(tdMoves);
        tr.appendChild(tdMin);
        highscoresTable.appendChild(tr);
    }
}

// Solve Hanoi (recursive)
function solveHanoi(n, from, to, aux, moves = []) {
    if (n === 1) {
        moves.push({ from, to });
    } else {
        solveHanoi(n - 1, from, aux, to, moves);
        moves.push({ from, to });
        solveHanoi(n - 1, aux, to, from, moves);
    }
    return moves;
}

// Run Demo
function runDemo() {
    if (currentDemoMove >= demoMoves.length) {
        clearInterval(demoInterval);
        isDemo = false;
        return;
    }
    const { from, to } = demoMoves[currentDemoMove];
    moveRing(from, to);
    currentDemoMove++;
}

// Event Listeners
init();
