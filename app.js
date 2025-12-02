const ringInput = document.getElementById("ring-count");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const demoBtn = document.getElementById("demo-btn");
const themeToggleBtn = document.getElementById("theme-toggle");
const statusEl = document.getElementById("status");
const towerEls = Array.from(document.querySelectorAll(".tower"));
const boardEl = document.querySelector(".board");
const effectsLayer = document.getElementById("effects-layer");
const motionLayer = document.getElementById("motion-layer");
const winOverlay = document.getElementById("win-overlay");
const errorOverlay = document.getElementById("error-overlay");
const demoModal = document.getElementById("demo-modal");
const modalStartBtn = document.getElementById("modal-start-btn");
const modalCloseBtn = document.getElementById("modal-close-btn");
const playerMovesEl = document.getElementById("player-moves");
const demoMovesEl = document.getElementById("demo-moves");
const scoreRowsEl = document.getElementById("score-rows");

let towerState = [[], [], []];
let totalRings = 4;
let gameActive = false;
let selectedRing = null;
let selectedRingEl = null;
let lastMove = null;
const overlayTimers = new Map();
let demoMode = false;
let demoMoves = [];
let demoTimeoutId = null;
let boardPrepared = false;
let playerMoveCount = 0;
let demoMoveCount = 0;
let isAnimatingMove = false;

const SCORE_STORAGE_KEY = "hanoiScores";
const THEME_STORAGE_KEY = "hanoiTheme";
const MIN_RINGS = 3;
const MAX_RINGS = 8;
let scoreData = loadScores();

applyStoredTheme();
renderScoreboard();
prepareBoardState({ autoActivate: false, silentStatus: true });
statusEl.textContent = "Plateau prêt. Cliquez sur \"Démarrer\" pour jouer.";
updateMoveCounters();

startBtn.addEventListener("pointermove", (event) => {
    const rect = startBtn.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    startBtn.style.setProperty("--x", `${x}%`);
    startBtn.style.setProperty("--y", `${y}%`);
});

startBtn.addEventListener("click", startPlayerGame);
resetBtn?.addEventListener("click", () => resetGameState());
demoBtn.addEventListener("click", startDemoMode);
themeToggleBtn?.addEventListener("click", toggleTheme);

modalStartBtn?.addEventListener("click", () => {
    hideDemoModal();
    startPlayerGame();
});

modalCloseBtn?.addEventListener("click", () => {
    hideDemoModal();
    statusEl.textContent = "Quand vous êtes prêt·e, choisissez un nombre d'anneaux et cliquez sur \"Démarrer\".";
});

towerEls.forEach((tower) => {
    tower.addEventListener("click", () => handleTowerClick(Number(tower.dataset.index)));
});

function startPlayerGame() {
    if (demoMode) {
        statusEl.textContent = "Impossible de démarrer pendant la démo.";
        return;
    }
    if (gameActive) {
        statusEl.textContent = "La partie est déjà en cours. Utilisez \"Reset\" pour recommencer.";
        return;
    }
    const desiredCount = getValidatedRingCount();
    if (desiredCount === null) return;
    if (boardPrepared && desiredCount !== totalRings) {
        statusEl.textContent = "Utilisez \"Reset\" pour appliquer le nouveau nombre d'anneaux.";
        return;
    }
    totalRings = desiredCount;
    if (!boardPrepared) {
        prepareBoardState({ autoActivate: false, silentStatus: true });
    }
    gameActive = true;
    statusEl.textContent = "Sélectionnez un anneau (toujours le sommet d'une tour) puis cliquez sur la tour d'arrivée.";
    render();
}

function startDemoMode() {
    if (demoMode) return;
    const desiredCount = getValidatedRingCount();
    if (desiredCount === null) return;
    totalRings = desiredCount;
    stopDemoMode(true);
    prepareBoardState({ autoActivate: true, silentStatus: true });
    demoMode = true;
    setControlsDisabled(true);
    clearSelection();
    gameActive = true;
    demoMoveCount = 0;
    updateMoveCounters();
    statusEl.textContent = "Mode démo : observez comment résoudre les tours automatiquement.";
    demoMoves = buildDemoSequence(totalRings, 0, 2, 1);
    scheduleNextDemoStep();
}

function getValidatedRingCount() {
    const desiredCount = Number(ringInput.value);
    if (Number.isNaN(desiredCount) || desiredCount < 3 || desiredCount > 8) {
        statusEl.textContent = "Choisissez un nombre entre 3 et 8 anneaux.";
        return null;
    }
    return desiredCount;
}

function resetGameState() {
    const desiredCount = getValidatedRingCount();
    if (desiredCount === null) return;
    totalRings = desiredCount;
    prepareBoardState({ autoActivate: false, silentStatus: true });
    statusEl.textContent = "Plateau prêt. Cliquez sur \"Démarrer\" pour jouer.";
}

function prepareBoardState({ autoActivate = false, silentStatus = false } = {}) {
    stopDemoMode(true);
    towerState = [[], [], []];
    for (let size = totalRings; size >= 1; size -= 1) {
        towerState[0].push(size);
    }
    boardPrepared = true;
    gameActive = autoActivate;
    lastMove = null;
    clearSelection();
    hideOverlay(winOverlay);
    hideOverlay(errorOverlay);
    if (boardEl) {
        boardEl.classList.remove("shake");
    }
    if (!autoActivate) {
        selectedRing = null;
    }
    playerMoveCount = 0;
    demoMoveCount = 0;
    updateMoveCounters();
    render();
    if (!silentStatus && statusEl) {
        statusEl.textContent = autoActivate
            ? "Le plateau est prêt pour la démonstration."
            : "Plateau prêt. Cliquez sur \"Démarrer\" pour jouer.";
    }
}

function render() {
    towerEls.forEach((towerEl, index) => {
        towerEl.querySelectorAll(".ring").forEach((ring) => ring.remove());
        const stack = towerState[index];
        stack.forEach((size, pos) => {
            const ring = document.createElement("div");
            ring.className = "ring";
            ring.dataset.size = String(size);
            ring.textContent = size;
            ring.style.bottom = `${40 + pos * 30}px`;
            const isTopRing = pos === stack.length - 1;
            ring.classList.toggle("ring-selectable", gameActive && isTopRing);
            if (gameActive && isTopRing) {
                ring.addEventListener("click", (event) => {
                    event.stopPropagation();
                    handleRingSelection(index, size, ring);
                });
            }
            if (selectedRing && selectedRing.from === index && selectedRing.size === size) {
                ring.classList.add("ring-selected");
                selectedRingEl = ring;
            }
            towerEl.appendChild(ring);
        });
    });
    animateArrival();
    checkForWin();
}

function isDropAllowed(targetIndex) {
    if (!selectedRing) return false;
    if (targetIndex === selectedRing.from) return false;
    const targetStack = towerState[targetIndex];
    const topTarget = targetStack[targetStack.length - 1];
    return topTarget === undefined || selectedRing.size < topTarget;
}

async function moveRing(fromIndex, toIndex, ringSize) {
    const sourceStack = towerState[fromIndex];
    const targetStack = towerState[toIndex];
    if (!sourceStack.length) return;
    const movingSize = ringSize ?? sourceStack[sourceStack.length - 1];
    const targetLevel = targetStack.length;
    const currentRingEl = findRingElement(movingSize, fromIndex);
    if (selectedRingEl && selectedRingEl === currentRingEl) {
        emitRingParticles(selectedRingEl, { count: 12, variant: "success" });
    }
    clearSelection();
    isAnimatingMove = true;
    try {
        await animateRingTravel(currentRingEl, fromIndex, toIndex, targetLevel);
        const moved = sourceStack.pop();
        targetStack.push(moved);
        if (demoMode) {
            demoMoveCount += 1;
        } else {
            playerMoveCount += 1;
        }
        updateMoveCounters();
        statusEl.textContent = `Déplacement : Tour ${String.fromCharCode(65 + fromIndex)} → Tour ${String.fromCharCode(65 + toIndex)}.`;
        lastMove = { toIndex, size: movingSize };
        render();
    } finally {
        isAnimatingMove = false;
    }
}

function checkForWin() {
    if (towerState[2].length === totalRings && totalRings > 0) {
        gameActive = false;
        statusEl.textContent = "Bravo ! Vous avez résolu les tours d'Hanoï. Cliquez sur \"Démarrer\" pour rejouer.";
        showWinAnimation();
        if (!demoMode) {
            registerPlayerScore();
        }
    }
}

function handleRingSelection(fromIndex, size, ringEl) {
    if (demoMode) {
        statusEl.textContent = "Mode démo en cours : patientez jusqu'à la fin de l'automatisation.";
        return;
    }
    if (isAnimatingMove) {
        statusEl.textContent = "Attendez la fin du déplacement en cours.";
        return;
    }
    if (!gameActive) {
        statusEl.textContent = "Cliquez sur \"Démarrer\" pour commencer la partie.";
        return;
    }
    if (selectedRing && selectedRing.from === fromIndex && selectedRing.size === size) {
        emitRingParticles(ringEl, { count: 10, variant: "success" });
        clearSelection(true);
        statusEl.textContent = "Sélection annulée. Choisissez un anneau à déplacer.";
        return;
    }
    const hadPrevious = Boolean(selectedRing);
    clearSelection(hadPrevious);
    selectedRing = { from: fromIndex, size };
    selectedRingEl = ringEl;
    ringEl.classList.add("ring-selected");
    emitRingParticles(ringEl, { count: 12, variant: "success" });
    statusEl.textContent = `Anneau ${size} sélectionné sur la tour ${String.fromCharCode(65 + fromIndex)}. Choisissez la tour d'arrivée.`;
}

function handleTowerClick(targetIndex) {
    if (demoMode) {
        statusEl.textContent = "Mode démo en cours : patientez jusqu'à la fin de l'automatisation.";
        return;
    }
    if (isAnimatingMove) {
        statusEl.textContent = "Attendez la fin du déplacement en cours.";
        return;
    }
    if (!gameActive) {
        statusEl.textContent = "Cliquez sur \"Démarrer\" pour commencer la partie.";
        return;
    }
    if (!selectedRing) {
        statusEl.textContent = "Sélectionnez d'abord un anneau sur la tour de départ.";
        return;
    }
    if (selectedRing.from === targetIndex) {
        statusEl.textContent = "Choisissez une tour différente pour effectuer le déplacement.";
        return;
    }
    if (!isDropAllowed(targetIndex)) {
        statusEl.textContent = "Impossible : un anneau plus grand ne peut pas être posé sur un plus petit.";
        showErrorAnimation(targetIndex);
        return;
    }
    moveRing(selectedRing.from, targetIndex, selectedRing.size);
}

function clearSelection(emitFx = false) {
    if (selectedRingEl) {
        if (emitFx) {
            emitRingParticles(selectedRingEl, { count: 8, variant: "success" });
        }
        selectedRingEl.classList.remove("ring-selected");
    }
    selectedRing = null;
    selectedRingEl = null;
}

function animateArrival() {
    if (!lastMove) return;
    const { toIndex, size } = lastMove;
    const towerEl = towerEls[toIndex];
    if (towerEl) {
        const ringEl = towerEl.querySelector(`.ring[data-size="${size}"]`);
        if (ringEl) {
            emitRingParticles(ringEl, { count: 14, variant: "success" });
        }
    }
    lastMove = null;
}

function emitRingParticles(ringEl, options = {}) {
    if (!ringEl || !boardEl) return;
    const boardRect = boardEl.getBoundingClientRect();
    const rect = ringEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - boardRect.left;
    const y = rect.top + rect.height / 2 - boardRect.top;
    spawnParticlesAt(x, y, options);
}

function spawnParticlesAt(x, y, { count = 10, variant = "success" } = {}) {
    if (!effectsLayer) return;
    for (let i = 0; i < count; i += 1) {
        const particle = document.createElement("span");
        const classes = ["particle"];
        if (variant && variant !== "default") {
            classes.push(variant);
        }
        particle.className = classes.join(" ");
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 40;
        particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--dy", `${Math.sin(angle) * distance - 10}px`);
        effectsLayer.appendChild(particle);
        particle.addEventListener("animationend", () => particle.remove());
    }
}

function findRingElement(size, towerIndex) {
    if (towerIndex == null) return null;
    const towerEl = towerEls[towerIndex];
    if (!towerEl) return null;
    return towerEl.querySelector(`.ring[data-size="${size}"]`);
}

function animateRingTravel(ringEl, fromIndex, toIndex, targetLevel) {
    return new Promise((resolve) => {
        if (!ringEl || !boardEl || !motionLayer) {
            resolve();
            return;
        }
        const boardRect = boardEl.getBoundingClientRect();
        const startRect = ringEl.getBoundingClientRect();
        const targetTower = towerEls[toIndex];
        if (!targetTower) {
            resolve();
            return;
        }
        const targetRect = targetTower.getBoundingClientRect();
        const ringHeight = startRect.height;
        const ringWidth = startRect.width;
        const startLeft = startRect.left - boardRect.left;
        const startTop = startRect.top - boardRect.top;
        const ghost = ringEl.cloneNode(true);
        ghost.classList.add("ring-ghost");
        ghost.style.left = `${startLeft}px`;
        ghost.style.top = `${startTop}px`;
        ghost.style.width = `${ringWidth}px`;
        ghost.style.height = `${ringHeight}px`;
        motionLayer.appendChild(ghost);
        ringEl.classList.add("ring-hidden");

        requestAnimationFrame(() => {
            const targetBottomOffset = 40 + targetLevel * 30;
            const targetLeft = targetRect.left - boardRect.left + targetRect.width / 2 - ringWidth / 2;
            const targetTop = targetRect.bottom - boardRect.top - (targetBottomOffset + ringHeight);
            const dx = targetLeft - startLeft;
            const dy = targetTop - startTop;
            ghost.style.transform = `translate(${dx}px, ${dy}px)`;
        });

        const cleanup = () => {
            ghost.remove();
            resolve();
        };

        ghost.addEventListener("transitionend", cleanup, { once: true });
        setTimeout(cleanup, 800);
    });
}

function showWinAnimation() {
    burstBoardParticles(45);
    showOverlay(winOverlay, 2200);
}

function burstBoardParticles(count = 30) {
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    for (let i = 0; i < count; i += 1) {
        const randX = Math.random() * rect.width;
        const randY = Math.random() * rect.height;
        spawnParticlesAt(randX, randY, { count: 1, variant: "success" });
    }
}

function showErrorAnimation(targetIndex) {
    if (boardEl) {
        boardEl.classList.remove("shake");
        void boardEl.offsetWidth;
        boardEl.classList.add("shake");
    }
    showOverlay(errorOverlay, 900);
    const coords = getTowerCenter(targetIndex);
    if (coords) {
        spawnParticlesAt(coords.x, coords.y, { count: 16, variant: "error" });
    }
}

function getTowerCenter(index) {
    if (!boardEl || !towerEls[index]) return null;
    const boardRect = boardEl.getBoundingClientRect();
    const towerRect = towerEls[index].getBoundingClientRect();
    return {
        x: towerRect.left + towerRect.width / 2 - boardRect.left,
        y: towerRect.top + towerRect.height * 0.3 - boardRect.top,
    };
}

function showOverlay(overlayEl, duration = 0) {
    if (!overlayEl) return;
    overlayEl.classList.remove("hidden");
    requestAnimationFrame(() => overlayEl.classList.add("active"));
    if (duration > 0) {
        if (overlayTimers.has(overlayEl)) {
            clearTimeout(overlayTimers.get(overlayEl));
        }
        const timerId = setTimeout(() => hideOverlay(overlayEl), duration);
        overlayTimers.set(overlayEl, timerId);
    }
}

function hideOverlay(overlayEl) {
    if (!overlayEl) return;
    if (overlayTimers.has(overlayEl)) {
        clearTimeout(overlayTimers.get(overlayEl));
        overlayTimers.delete(overlayEl);
    }
    overlayEl.classList.remove("active");
    setTimeout(() => overlayEl.classList.add("hidden"), 320);
}

function updateMoveCounters() {
    if (playerMovesEl) {
        playerMovesEl.textContent = String(playerMoveCount);
    }
    if (demoMovesEl) {
        demoMovesEl.textContent = String(demoMoveCount);
    }
}

function loadScores() {
    const defaults = {};
    for (let n = MIN_RINGS; n <= MAX_RINGS; n += 1) {
        defaults[n] = { best: null };
    }
    if (typeof localStorage === "undefined") {
        return defaults;
    }
    try {
        const stored = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || "{}");
        return { ...defaults, ...stored };
    } catch (error) {
        return defaults;
    }
}

function saveScores() {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scoreData));
    } catch (error) {
        // Ignore quota errors silently.
    }
}

function renderScoreboard() {
    if (!scoreRowsEl) return;
    const fragment = document.createDocumentFragment();
    for (let n = MIN_RINGS; n <= MAX_RINGS; n += 1) {
        const row = document.createElement("tr");
        const minMoves = Math.pow(2, n) - 1;
        const best = scoreData[n]?.best ?? null;
        row.innerHTML = `<td>${n}</td><td>${minMoves}</td><td>${best ?? "—"}</td>`;
        fragment.appendChild(row);
    }
    scoreRowsEl.innerHTML = "";
    scoreRowsEl.appendChild(fragment);
}

function registerPlayerScore() {
    const minMoves = Math.pow(2, totalRings) - 1;
    const currentBest = scoreData[totalRings]?.best ?? null;
    if (currentBest === null || playerMoveCount < currentBest) {
        scoreData[totalRings] = { best: playerMoveCount };
        saveScores();
        renderScoreboard();
    }
    statusEl.textContent += ` (Minimum théorique : ${minMoves} coups)`;
}

function applyStoredTheme() {
    if (typeof localStorage === "undefined") return;
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light") {
            document.body.classList.add("theme-light");
        }
    } catch (error) {
        // ignore
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle("theme-light");
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, isLight ? "light" : "dark");
    } catch (error) {
        // ignore storage errors
    }
}

function buildDemoSequence(n, from, to, aux, acc = []) {
    if (n === 1) {
        acc.push({ from, to });
    } else {
        buildDemoSequence(n - 1, from, aux, to, acc);
        acc.push({ from, to });
        buildDemoSequence(n - 1, aux, to, from, acc);
    }
    return acc;
}

function scheduleNextDemoStep() {
    if (!demoMode) return;
    if (!demoMoves.length) {
        completeDemoMode();
        return;
    }
    const move = demoMoves.shift();
    demoTimeoutId = setTimeout(async () => {
        if (!demoMode) return;
        const ringSize = towerState[move.from][towerState[move.from].length - 1];
        await moveRing(move.from, move.to, ringSize);
        scheduleNextDemoStep();
    }, 2000);
}

function completeDemoMode() {
    stopDemoMode(true);
    statusEl.textContent = "Démo terminée ! À vous de jouer.";
    showDemoModal();
}

function stopDemoMode(skipModal = false) {
    if (demoTimeoutId) {
        clearTimeout(demoTimeoutId);
        demoTimeoutId = null;
    }
    const wasDemo = demoMode;
    demoMode = false;
    demoMoves = [];
    setControlsDisabled(false);
    if (!skipModal && wasDemo) {
        showDemoModal();
    }
}

function setControlsDisabled(disabled) {
    startBtn.disabled = disabled;
    ringInput.disabled = disabled;
    if (demoBtn) demoBtn.disabled = disabled;
    if (resetBtn) resetBtn.disabled = disabled;
}

function showDemoModal() {
    if (!demoModal) return;
    demoModal.classList.remove("hidden");
}

function hideDemoModal() {
    if (!demoModal) return;
    demoModal.classList.add("hidden");
}

// Initial rendering so the layout is not empty on load.
render();
