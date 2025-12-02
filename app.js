const ringInput = document.getElementById("ring-count");
const startBtn = document.getElementById("start-btn");
const demoBtn = document.getElementById("demo-btn");
const statusEl = document.getElementById("status");
const towerEls = Array.from(document.querySelectorAll(".tower"));
const boardEl = document.querySelector(".board");
const effectsLayer = document.getElementById("effects-layer");
const winOverlay = document.getElementById("win-overlay");
const errorOverlay = document.getElementById("error-overlay");
const demoModal = document.getElementById("demo-modal");
const modalStartBtn = document.getElementById("modal-start-btn");
const modalCloseBtn = document.getElementById("modal-close-btn");

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

startBtn.addEventListener("pointermove", (event) => {
    const rect = startBtn.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    startBtn.style.setProperty("--x", `${x}%`);
    startBtn.style.setProperty("--y", `${y}%`);
});

startBtn.addEventListener("click", startPlayerGame);
demoBtn.addEventListener("click", startDemoMode);

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
    const desiredCount = getValidatedRingCount();
    if (desiredCount === null) return;
    totalRings = desiredCount;
    stopDemoMode(true);
    resetBoard();
    statusEl.textContent = "Sélectionnez un anneau (toujours le sommet d'une tour) puis cliquez sur la tour d'arrivée. Un seul anneau à la fois et jamais un grand sur un petit.";
}

function startDemoMode() {
    if (demoMode) return;
    const desiredCount = getValidatedRingCount();
    if (desiredCount === null) return;
    totalRings = desiredCount;
    stopDemoMode(true);
    resetBoard();
    demoMode = true;
    setControlsDisabled(true);
    clearSelection();
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

function resetBoard() {
    towerState = [[], [], []];
    for (let size = totalRings; size >= 1; size -= 1) {
        towerState[0].push(size);
    }
    gameActive = true;
    lastMove = null;
    clearSelection();
    hideOverlay(winOverlay);
    hideOverlay(errorOverlay);
    if (boardEl) {
        boardEl.classList.remove("shake");
    }
    render();
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

function moveRing(fromIndex, toIndex, ringSize) {
    const sourceStack = towerState[fromIndex];
    const targetStack = towerState[toIndex];
    if (!sourceStack.length) return;
    if (selectedRingEl) {
        emitRingParticles(selectedRingEl, { count: 12, variant: "success" });
    }
    const movingSize = ringSize ?? sourceStack[sourceStack.length - 1];
    targetStack.push(sourceStack.pop());
    statusEl.textContent = `Déplacement : Tour ${String.fromCharCode(65 + fromIndex)} → Tour ${String.fromCharCode(65 + toIndex)}.`;
    lastMove = { toIndex, size: movingSize };
    clearSelection();
    render();
}

function checkForWin() {
    if (towerState[2].length === totalRings && totalRings > 0) {
        gameActive = false;
        statusEl.textContent = "Bravo ! Vous avez résolu les tours d'Hanoï. Cliquez sur \"Démarrer\" pour rejouer.";
        showWinAnimation();
    }
}

function handleRingSelection(fromIndex, size, ringEl) {
    if (demoMode) {
        statusEl.textContent = "Mode démo en cours : patientez jusqu'à la fin de l'automatisation.";
        return;
    }
    if (!gameActive) return;
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
    if (!gameActive) return;
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
    demoTimeoutId = setTimeout(() => {
        if (!demoMode) return;
        const ringSize = towerState[move.from][towerState[move.from].length - 1];
        moveRing(move.from, move.to, ringSize);
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
    if (!demoMode) {
        setControlsDisabled(false);
        if (!skipModal) {
            showDemoModal();
        }
        return;
    }
    demoMode = false;
    demoMoves = [];
    setControlsDisabled(false);
    if (!skipModal) {
        showDemoModal();
    }
}

function setControlsDisabled(disabled) {
    startBtn.disabled = disabled;
    ringInput.disabled = disabled;
    if (demoBtn) demoBtn.disabled = disabled;
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
