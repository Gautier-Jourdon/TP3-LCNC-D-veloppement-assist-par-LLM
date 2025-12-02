const ringInput = document.getElementById("ring-count");
const startBtn = document.getElementById("start-btn");
const statusEl = document.getElementById("status");
const towerEls = Array.from(document.querySelectorAll(".tower"));

let towerState = [[], [], []];
let totalRings = 4;
let gameActive = false;
let dragData = null;

startBtn.addEventListener("click", () => {
    const desiredCount = Number(ringInput.value);
    if (Number.isNaN(desiredCount) || desiredCount < 3 || desiredCount > 8) {
        statusEl.textContent = "Choisissez un nombre entre 3 et 8 anneaux.";
        return;
    }
    totalRings = desiredCount;
    resetBoard();
    statusEl.textContent = "Déplacez les anneaux en respectant les règles : un seul anneau à la fois et jamais un grand sur un petit.";
});

towerEls.forEach((tower) => {
    tower.addEventListener("dragover", (event) => {
        if (!gameActive || !dragData) return;
        if (isDropAllowed(Number(tower.dataset.index))) {
            event.preventDefault();
        }
    });

    tower.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!gameActive || !dragData) return;
        const targetIndex = Number(tower.dataset.index);
        if (!isDropAllowed(targetIndex)) {
            statusEl.textContent = "Impossible : un anneau plus grand ne peut pas être posé sur un plus petit.";
            return;
        }
        moveRing(dragData.from, targetIndex);
        dragData = null;
    });
});

function resetBoard() {
    towerState = [[], [], []];
    for (let size = totalRings; size >= 1; size -= 1) {
        towerState[0].push(size);
    }
    gameActive = true;
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
            ring.draggable = gameActive && isTopRing;
            if (ring.draggable) {
                ring.addEventListener("dragstart", (event) => {
                    dragData = { from: index, size };
                    if (event.dataTransfer) {
                        event.dataTransfer.setData("text/plain", String(size));
                        event.dataTransfer.effectAllowed = "move";
                    }
                });
                ring.addEventListener("dragend", () => {
                    dragData = null;
                });
            }
            towerEl.appendChild(ring);
        });
    });
    checkForWin();
}

function isDropAllowed(targetIndex) {
    if (!dragData) return false;
    if (targetIndex === dragData.from) return false;
    const targetStack = towerState[targetIndex];
    const topTarget = targetStack[targetStack.length - 1];
    return topTarget === undefined || dragData.size < topTarget;
}

function moveRing(fromIndex, toIndex) {
    const sourceStack = towerState[fromIndex];
    const targetStack = towerState[toIndex];
    if (!sourceStack.length) return;
    targetStack.push(sourceStack.pop());
    statusEl.textContent = `Déplacement : Tour ${String.fromCharCode(65 + fromIndex)} → Tour ${String.fromCharCode(65 + toIndex)}.`;
    render();
}

function checkForWin() {
    if (towerState[2].length === totalRings && totalRings > 0) {
        gameActive = false;
        statusEl.textContent = "Bravo ! Vous avez résolu les tours d'Hanoï. Cliquez sur \"Démarrer\" pour rejouer.";
    }
}

// Initial rendering so the layout is not empty on load.
render();
