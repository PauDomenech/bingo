const TOTAL_BALLS = 90;
const spinButton = document.getElementById("spinButton");
const bingoGrid = document.getElementById("bingoGrid");
const ballNumber = document.getElementById("ballNumber");
const bingoBall = document.getElementById("bingoBall");
const remainingLabel = document.getElementById("remainingLabel");
const historyList = document.getElementById("historyList");
const toggleUtilities = document.getElementById("toggleUtilities");
const utilityPanel = document.getElementById("utilityPanel");
const resetButton = document.getElementById("resetButton");
const confirmModal = document.getElementById("confirmModal");
const clearHistory = document.getElementById("clearHistory");

const STATE_KEY = "acebsa-bingo-state";
const CHANNEL_NAME = "acebsa-bingo-sync";
const CLIENT_ID = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `controller-${Date.now()}`;
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

let availableNumbers = [];
let drawnNumbers = [];
let historyWindow = [];

// Audio element for number announcements
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
    try {
        await numberAudio.play();
    } catch (err) {
        // Autoplay or missing file; fail silently
    }
};

const buildGrid = () => {
    if (!bingoGrid) return;
    const fragment = document.createDocumentFragment();
    for (let n = 1; n <= TOTAL_BALLS; n += 1) {
        const cell = document.createElement("div");
        cell.className = "bingo-cell";
        cell.dataset.number = String(n);
        cell.textContent = n.toString().padStart(2, "0");
        fragment.appendChild(cell);
    }
    bingoGrid.appendChild(fragment);
};

const resetGridMarks = () => {
    document.querySelectorAll(".bingo-cell.hit").forEach(cell => cell.classList.remove("hit"));
};

const updateBall = value => {
    if (!ballNumber || !bingoBall) return;
    ballNumber.textContent = value ?? "--";
    bingoBall.classList.remove("pop");
    void bingoBall.offsetWidth; // reinicia animación
    if (value) {
        bingoBall.classList.add("pop");
    }
};

const updateRemainingLabel = () => {
    if (!remainingLabel) return;
    const count = availableNumbers.length;
    const label = count === 0 ? "Sin bolas" : `${count} bola${count === 1 ? "" : "s"} restantes`;
    remainingLabel.textContent = label;
};

const renderHistory = () => {
    if (!historyList) return;
    historyList.innerHTML = "";
    if (!historyWindow.length) return;

    const fragment = document.createDocumentFragment();
    historyWindow.forEach(num => {
        const badge = document.createElement("span");
        badge.className = "history-item";
        badge.textContent = num.toString().padStart(2, "0");
        fragment.appendChild(badge);
    });
    historyList.appendChild(fragment);
};

const markGridCell = number => {
    if (!bingoGrid) return;
    const cell = bingoGrid.querySelector(`[data-number="${number}"]`);
    if (cell) {
        cell.classList.add("hit");
    }
};

const rebuildAvailableNumbers = () => {
    const drawnSet = new Set(drawnNumbers);
    availableNumbers = [];
    for (let i = 1; i <= TOTAL_BALLS; i += 1) {
        if (!drawnSet.has(i)) {
            availableNumbers.push(i);
        }
    }
};

const syncSpinButton = () => {
    if (!spinButton) return;
    if (!availableNumbers.length) {
        spinButton.disabled = true;
        spinButton.textContent = "Bombo vacío";
    } else {
        spinButton.disabled = false;
        spinButton.textContent = "Girar bola";
    }
};

const refreshUI = () => {
    resetGridMarks();
    drawnNumbers.forEach(markGridCell);
    updateBall(drawnNumbers[0]);
    renderHistory();
    updateRemainingLabel();
    syncSpinButton();
};


// Sincroniza el estado con Firebase
const persistState = () => {
    const payload = { drawn: drawnNumbers, sender: CLIENT_ID };
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn("No se pudo guardar el estado del bingo.", error);
    }
    syncChannel?.postMessage(payload);
    // Firebase: guarda el array de bolas extraídas
    if (window.db) {
        window.db.ref("bingo/drawnNumbers").set(drawnNumbers);
    }
};


// Escucha cambios en Firebase y actualiza el estado local
const adoptState = payload => {
    if (!payload || !Array.isArray(payload.drawn)) return;
    drawnNumbers = payload.drawn
        .map(n => Number(n))
        .filter(n => Number.isInteger(n) && n >= 1 && n <= TOTAL_BALLS);
    historyWindow = drawnNumbers.slice(0, 24);
    rebuildAvailableNumbers();
    refreshUI();
};


const hydrateState = () => {
    // Si hay Firebase, escucha en tiempo real
    if (window.db) {
        window.db.ref("bingo/drawnNumbers").on("value", function(snapshot) {
            const arr = snapshot.val();
            if (Array.isArray(arr)) {
                adoptState({ drawn: arr });
            } else {
                adoptState({ drawn: [] });
            }
        });
        return;
    }
    // Fallback local
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) {
        resetGame();
        return;
    }
    try {
        const payload = JSON.parse(raw);
        if (payload && Array.isArray(payload.drawn)) {
            drawnNumbers = payload.drawn
                .map(n => Number(n))
                .filter(n => Number.isInteger(n) && n >= 1 && n <= TOTAL_BALLS);
            historyWindow = drawnNumbers.slice(0, 24);
            rebuildAvailableNumbers();
            refreshUI();
            return;
        }
        resetGame();
    } catch (error) {
        console.warn("Estado guardado inválido. Se reiniciará la partida.", error);
        resetGame();
    }
};

const drawNumber = () => {
    console.log("Girnado Bola")
    if (!availableNumbers.length) {
        syncSpinButton();
        return;
    }

    const index = Math.floor(Math.random() * availableNumbers.length);
    const [number] = availableNumbers.splice(index, 1);
    drawnNumbers = [number, ...drawnNumbers];
    historyWindow = [number, ...historyWindow].slice(0, 24);

    refreshUI();
    persistState();
    
    // Play audio announcement for the new number
    playNumberAudio(number);
};

const resetGame = ({ persist = true } = {}) => {
    availableNumbers = Array.from({ length: TOTAL_BALLS }, (_, i) => i + 1);
    drawnNumbers = [];
    historyWindow = [];
    refreshUI();
    if (persist) {
        persistState();
    }
};

const toggleModal = show => {
    if (!confirmModal) return;
    confirmModal.classList.toggle("show", show);
    confirmModal.setAttribute("aria-hidden", String(!show));
};

const handleModalClick = event => {
    const target = event.target;
    if (target.dataset.modal === "cancel" || target === confirmModal) {
        toggleModal(false);
    }
    if (target.dataset.modal === "confirm") {
        resetGame();
        toggleModal(false);
    }
};

const closePanelsOnOutsideClick = event => {
    if (!utilityPanel || !toggleUtilities) return;
    if (!utilityPanel.contains(event.target) && !toggleUtilities.contains(event.target)) {
        utilityPanel.classList.remove("open");
    }
};

const initEvents = () => {
    spinButton?.addEventListener("click", drawNumber);
    if (toggleUtilities && utilityPanel) {
        toggleUtilities.addEventListener("click", () => utilityPanel.classList.toggle("open"));
        document.addEventListener("click", closePanelsOnOutsideClick);
    }
    resetButton?.addEventListener("click", () => toggleModal(true));
    confirmModal?.addEventListener("click", handleModalClick);
    clearHistory?.addEventListener("click", () => {
        historyWindow = [];
        renderHistory();
    });

    if (syncChannel) {
        syncChannel.addEventListener("message", event => adoptState(event.data));
    }

    window.addEventListener("storage", event => {
        if (event.key === STATE_KEY && event.newValue) {
            try {
                const payload = JSON.parse(event.newValue);
                adoptState(payload);
            } catch (error) {
                console.warn("No se pudo interpretar el estado sincronizado.", error);
            }
        }
    });
};

const init = () => {
    buildGrid();
    hydrateState();
    initEvents();
};

init();

