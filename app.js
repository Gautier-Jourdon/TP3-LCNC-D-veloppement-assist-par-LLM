const ringInput = document.getElementById("ring-count");
const startBtn = document.getElementById("start-btn");
const statusEl = document.getElementById("status");
const towerEls = Array.from(document.querySelectorAll(".tower"));

let towerState = [[], [], []];
let totalRings = 4;
let gameActive = false;
let selectedRing = null;
let selectedRingEl = null;

startBtn.addEventListener("click", () => {
    const desiredCount = Number(ringInput.value);
    if (Number.isNaN(desiredCount) || desiredCount < 3 || desiredCount > 8) {
        statusEl.textContent = "Choisissez un nombre entre 3 et 8 anneaux.";
        return;
    }
    totalRings = desiredCount;
    resetBoard();
    statusEl.textContent = "Sélectionnez un anneau (toujours le sommet d'une tour) puis cliquez sur la tour d'arrivée. Un seul anneau à la fois et jamais un grand sur un petit.";
});

towerEls.forEach((tower) => {
    tower.addEventListener("click", () => handleTowerClick(Number(tower.dataset.index)));
});

function resetBoard() {
    towerState = [[], [], []];
    for (let size = totalRings; size >= 1; size -= 1) {
        towerState[0].push(size);
    }
    gameActive = true;
    clearSelection();
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
    checkForWin();
}

function isDropAllowed(targetIndex) {
    if (!selectedRing) return false;
    if (targetIndex === selectedRing.from) return false;
    const targetStack = towerState[targetIndex];
    const topTarget = targetStack[targetStack.length - 1];
    return topTarget === undefined || selectedRing.size < topTarget;
}

function moveRing(fromIndex, toIndex) {
    const sourceStack = towerState[fromIndex];
    const targetStack = towerState[toIndex];
    if (!sourceStack.length) return;
    targetStack.push(sourceStack.pop());
    statusEl.textContent = `Déplacement : Tour ${String.fromCharCode(65 + fromIndex)} → Tour ${String.fromCharCode(65 + toIndex)}.`;
    clearSelection();
    render();
}

function checkForWin() {
    if (towerState[2].length === totalRings && totalRings > 0) {
        gameActive = false;
        statusEl.textContent = "Bravo ! Vous avez résolu les tours d'Hanoï. Cliquez sur \"Démarrer\" pour rejouer.";
    }
}

function handleRingSelection(fromIndex, size, ringEl) {
    if (!gameActive) return;
    if (selectedRing && selectedRing.from === fromIndex && selectedRing.size === size) {
        clearSelection();
        statusEl.textContent = "Sélection annulée. Choisissez un anneau à déplacer.";
        return;
    }
    clearSelection();
    selectedRing = { from: fromIndex, size };
    selectedRingEl = ringEl;
    ringEl.classList.add("ring-selected");
    statusEl.textContent = `Anneau ${size} sélectionné sur la tour ${String.fromCharCode(65 + fromIndex)}. Choisissez la tour d'arrivée.`;
}

function handleTowerClick(targetIndex) {
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
        return;
    }
    moveRing(selectedRing.from, targetIndex);
}

function clearSelection() {
    if (selectedRingEl) {
        selectedRingEl.classList.remove("ring-selected");
    }
    selectedRing = null;
    selectedRingEl = null;
}

// Initial rendering so the layout is not empty on load.
render();
