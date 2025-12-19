const TOTAL_BALLS = 90;
const STATE_KEY = "acebsa-bingo-state";
const CHANNEL_NAME = "acebsa-bingo-sync";

const viewerGrid = document.getElementById("viewerGrid");
const viewerBallNumber = document.getElementById("viewerBallNumber");
const viewerRemaining = document.getElementById("viewerRemaining");
const viewerHistory = document.getElementById("viewerHistory");

const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

let drawnNumbers = [];
let hasInit = false;
let lastPlayedNumber = null;

// Single reusable audio element for number announcements
const numberAudio = new Audio();
numberAudio.preload = "none";
numberAudio.volume = 1;

const stopNumberAudio = () => {
    try {
        numberAudio.pause();
        numberAudio.currentTime = 0;
    } catch {}
};

const playNumberAudio = async (n) => {
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_BALLS) return;
    const url = `aud/${n}.mp3`;
    stopNumberAudio();
    numberAudio.src = url;
    lastPlayedNumber = n;
    try {
        await numberAudio.play();
    } catch (err) {
        // Autoplay or missing file; fail silently
        // Optionally, could log: console.debug("Audio play skipped", err);
    }
};

const buildGrid = () => {
    if (!viewerGrid) return;
    const fragment = document.createDocumentFragment();
    for (let n = 1; n <= TOTAL_BALLS; n += 1) {
        const cell = document.createElement("div");
        cell.className = "bingo-cell";
        cell.dataset.number = String(n);
        cell.textContent = n.toString().padStart(2, "0");
        fragment.appendChild(cell);
    }
    viewerGrid.appendChild(fragment);
};

const resetGridMarks = () => {
    viewerGrid?.querySelectorAll(".bingo-cell.hit").forEach(cell => cell.classList.remove("hit"));
};

const markGridCell = number => {
    if (!viewerGrid) return;
    const cell = viewerGrid.querySelector(`[data-number="${number}"]`);
    if (cell) {
        cell.classList.add("hit");
    }
};

const updateBall = () => {
    if (!viewerBallNumber) return;
    const latest = drawnNumbers[0];
    viewerBallNumber.textContent = latest ? latest.toString().padStart(2, "0") : "--";
};

const updateRemaining = () => {
    if (!viewerRemaining) return;
    const remaining = TOTAL_BALLS - drawnNumbers.length;
    viewerRemaining.textContent = remaining === 0 ? "Bombo completo" : `${remaining} bola${remaining === 1 ? "" : "s"} restantes`;
};

const renderHistory = () => {
    if (!viewerHistory) return;
    viewerHistory.innerHTML = "";
    if (!drawnNumbers.length) return;

    const fragment = document.createDocumentFragment();
    drawnNumbers.slice(0, 60).forEach(num => {
        const badge = document.createElement("span");
        badge.className = "history-item";
        badge.textContent = num.toString().padStart(2, "0");
        fragment.appendChild(badge);
    });
    viewerHistory.appendChild(fragment);
};

const applyState = payload => {
    if (!payload || !Array.isArray(payload.drawn)) return;
    const prevLength = drawnNumbers.length;
    const prevLatest = drawnNumbers[0];

    drawnNumbers = payload.drawn
        .map(n => Number(n))
        .filter(n => Number.isInteger(n) && n >= 1 && n <= TOTAL_BALLS);

    resetGridMarks();
    drawnNumbers.forEach(markGridCell);
    updateBall();
    renderHistory();
    updateRemaining();

    // Play audio only after initial load, and when latest changes
    const latest = drawnNumbers[0];
    const lengthChanged = drawnNumbers.length !== prevLength;
    const latestChanged = latest && latest !== prevLatest;
    if (hasInit && latest && (lengthChanged || latestChanged)) {
        playNumberAudio(latest);
    }
};

const readStoredState = () => {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) {
        applyState({ drawn: [] });
        hasInit = true;
        return;
    }
    try {
        const payload = JSON.parse(raw);
        applyState(payload);
        hasInit = true;
    } catch (error) {
        console.warn("No se pudo leer el estado guardado para el visor.", error);
    }
};

buildGrid();
readStoredState();

if (syncChannel) {
    syncChannel.addEventListener("message", event => applyState(event.data));
}

window.addEventListener("storage", event => {
    if (event.key === STATE_KEY && event.newValue) {
        try {
            const payload = JSON.parse(event.newValue);
            applyState(payload);
        } catch (error) {
            console.warn("No se pudo sincronizar el visor mediante localStorage.", error);
        }
    }
});
