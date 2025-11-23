// Translations
const translations = {
    en: {
        tab_send: "Send",
        tab_receive: "Receive",
        drop_zone_title: "Drag & Drop files here",
        drop_zone_subtitle: "or click to browse",
        share_code_msg: "Share this code with the recipient",
        status_waiting_receiver: "Waiting for receiver...",
        status_sending: "Sending file...",
        status_sent: "All files sent successfully!",
        status_received_batch: "All files received successfully!",
        cancel_btn: "Cancel",
        enter_code_title: "Enter 6-digit Key",
        receive_btn: "Receive",
        status_connecting: "Connecting...",
        status_receiving: "Receiving files...",
        status_error: "Error or Invalid Code",
        file_received: "File received",
        close_btn: "Close",
        history_title: "Transfer History",
        no_history: "No transfers yet.",
        clear_history: "Clear History",
        confirm_leave: "Transfer in progress. Are you sure you want to leave?",
        copy_link_btn: "Copy Magic Link"
    },
    es: {
        tab_send: "Enviar",
        tab_receive: "Recibir",
        drop_zone_title: "Arrastra archivos aquí",
        drop_zone_subtitle: "o haz clic para buscar",
        share_code_msg: "Comparte este código con el destinatario",
        status_waiting_receiver: "Esperando al receptor...",
        status_sending: "Enviando archivo...",
        status_sent: "¡Todos los archivos enviados!",
        status_received_batch: "¡Todos los archivos recibidos!",
        cancel_btn: "Cancelar",
        enter_code_title: "Introduce Clave de 6 dígitos",
        receive_btn: "Recibir",
        status_connecting: "Conectando...",
        status_receiving: "Recibiendo archivos...",
        status_error: "Error o Código Inválido",
        file_received: "Archivo recibido",
        close_btn: "Cerrar",
        history_title: "Historial de Transferencias",
        no_history: "No hay transferencias.",
        clear_history: "Borrar Historial",
        confirm_leave: "Transferencia en curso. ¿Seguro que quieres salir?",
        copy_link_btn: "Copiar Enlace Mágico"
    }
};

// State
let currentLang = 'en';
let peer = null;
let conn = null;
let filesQueue = [];
let currentFileIdx = 0;
let timerInterval = null;
let wakeLock = null;
let transferActive = false;

// Config
const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const MAX_BUFFER = 16 * 1024 * 1024; // 16MB buffer limit

// DOM Elements
const els = {
    langToggle: document.getElementById('lang-toggle'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    sendPanel: document.getElementById('send-panel'),
    receivePanel: document.getElementById('receive-panel'),

    // Send Mode
    stepUpload: document.getElementById('step-upload'),
    stepCode: document.getElementById('step-code'),
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    generatedCode: document.getElementById('generated-code'),
    copyCodeBtn: document.getElementById('copy-code-btn'),
    qrContainer: document.getElementById('qrcode'),
    timerDisplay: document.getElementById('timer'),
    sendStatus: document.getElementById('send-status'),
    cancelSendBtn: document.getElementById('cancel-send-btn'),
    copyLinkBtn: document.getElementById('copy-link-btn'),

    // Sender Progress
    senderProgressContainer: document.getElementById('sender-progress-container'),
    senderFileName: document.getElementById('sender-file-name'),
    senderFileSize: document.getElementById('sender-file-size'),
    senderProgressFill: document.getElementById('sender-progress-fill'),
    senderSpeed: document.getElementById('sender-speed'),
    senderPercent: document.getElementById('sender-percent'),
    senderCloseBtn: document.getElementById('sender-close-btn'),

    // Receive Mode
    receiveCodeInput: document.getElementById('receive-code-input'),
    receiveBtn: document.getElementById('receive-btn'),
    receiveStatus: document.getElementById('receive-status'),
    transfersList: document.getElementById('transfers-list'),

    // History
    historyPanel: document.getElementById('history-panel'),
    historyList: document.getElementById('history-list'),
    historyToggle: document.getElementById('history-toggle'),
    closeHistory: document.getElementById('close-history'),
    clearHistory: document.getElementById('clear-history')
};

// --- Language System ---
function updateLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.textContent = translations[lang][key];
    });
    renderHistory();
}

els.langToggle.addEventListener('click', () => {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    updateLanguage(newLang);
});

// --- Tab Switching ---
els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        if (tab === 'send') {
            els.sendPanel.classList.remove('hidden');
            els.receivePanel.classList.add('hidden');
            els.historyPanel.classList.add('hidden');
        } else {
            els.sendPanel.classList.add('hidden');
            els.receivePanel.classList.remove('hidden');
            els.historyPanel.classList.add('hidden');
        }
    });
});

// --- Wake Lock API ---
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.error(err);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

// --- Vibration API ---
function vibrateSuccess() {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function vibrateError() {
    if (navigator.vibrate) navigator.vibrate([300]);
}

// --- Dynamic Title ---
function updateTitle(percent) {
    if (percent === null) {
        document.title = "LupoSync";
    } else if (percent === 100) {
        document.title = "✅ LupoSync";
    } else {
        document.title = `(${Math.round(percent)}%) LupoSync`;
    }
}

// --- Before Unload Protection ---
window.addEventListener('beforeunload', (e) => {
    if (transferActive) {
        e.preventDefault();
        e.returnValue = translations[currentLang].confirm_leave;
        return translations[currentLang].confirm_leave;
    }
});

// --- History System ---
function getHistory() {
    return JSON.parse(localStorage.getItem('luposync_history') || '[]');
}

function addToHistory(role, fileName, size) {
    const history = getHistory();
    history.unshift({
        role,
        fileName,
        size,
        date: new Date().toISOString()
    });
    if (history.length > 50) history.pop();
    localStorage.setItem('luposync_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    els.historyList.innerHTML = '';

    if (history.length === 0) {
        els.historyList.innerHTML = `<p class="status-text" data-i18n="no_history">${translations[currentLang].no_history}</p>`;
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const icon = item.role === 'sent' ? '<i class="fa-solid fa-arrow-up"></i>' : '<i class="fa-solid fa-arrow-down"></i>';
        const date = new Date(item.date).toLocaleDateString() + ' ' + new Date(item.date).toLocaleTimeString();

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                ${icon}
                <div class="history-info">
                    <span class="history-name">${item.fileName}</span>
                    <span class="history-meta">${formatBytes(item.size)} • ${date}</span>
                </div>
            </div>
        `;
        els.historyList.appendChild(div);
    });
}

els.historyToggle.addEventListener('click', () => {
    els.historyPanel.classList.toggle('hidden');
    if (!els.historyPanel.classList.contains('hidden')) {
        renderHistory();
        if (window.innerWidth < 600) {
            els.sendPanel.classList.add('hidden');
            els.receivePanel.classList.add('hidden');
        }
    } else {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        if (activeTab === 'send') els.sendPanel.classList.remove('hidden');
        else els.receivePanel.classList.remove('hidden');
    }
});

els.closeHistory.addEventListener('click', () => {
    els.historyPanel.classList.add('hidden');
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'send') els.sendPanel.classList.remove('hidden');
    else els.receivePanel.classList.remove('hidden');
});

els.clearHistory.addEventListener('click', () => {
    localStorage.removeItem('luposync_history');
    renderHistory();
});

// --- Utility Functions ---
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- SEND FLOW ---
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function startTimer() {
    let timeLeft = 600;
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        els.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            resetSendState();
            alert("Code expired");
        }
    }, 1000);
}

function initSender(files) {
    filesQueue = Array.from(files);
    currentFileIdx = 0;
    const code = generateCode();

    els.stepUpload.classList.add('hidden');
    els.stepCode.classList.remove('hidden');
    els.generatedCode.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
    els.sendStatus.textContent = translations[currentLang].status_waiting_receiver;

    els.senderProgressContainer.classList.add('hidden');
    els.senderProgressFill.style.width = '0%';
    els.senderPercent.textContent = '0%';
    els.senderSpeed.textContent = '0 MB/s';
    els.senderCloseBtn.classList.add('hidden');

    els.qrContainer.innerHTML = '';
    const magicLink = `${window.location.origin}${window.location.pathname}?code=${code}`;
    new QRCode(els.qrContainer, {
        text: magicLink,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    startTimer();

    if (peer) peer.destroy();
    peer = new Peer(`pf-${code}`, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    peer.on('error', (err) => {
        console.error(err);
        if (err.type === 'unavailable-id') {
            initSender(files);
        }
    });

    peer.on('connection', (connection) => {
        conn = connection;
        els.sendStatus.textContent = translations[currentLang].status_sending;
        clearInterval(timerInterval);
        transferActive = true;
        requestWakeLock();

        conn.on('open', () => {
            conn.send({
                type: 'batch-meta',
                count: filesQueue.length,
                totalSize: filesQueue.reduce((acc, f) => acc + f.size, 0)
            });
            sendNextFile();
        });

        conn.on('data', (data) => {
            if (data.type === 'ack-file') {
                addToHistory('sent', filesQueue[currentFileIdx].name, filesQueue[currentFileIdx].size);
                currentFileIdx++;
                if (currentFileIdx < filesQueue.length) {
                    sendNextFile();
                } else {
                    els.sendStatus.setAttribute('data-i18n', 'status_sent');
                    els.sendStatus.textContent = translations[currentLang].status_sent;
                    els.sendStatus.style.color = 'var(--success-color)';
                    els.senderCloseBtn.classList.remove('hidden');
                    transferActive = false;
                    releaseWakeLock();
                    vibrateSuccess();
                    updateTitle(100);
                    conn.send({ type: 'batch-complete' });
                }
            } else if (data.type === 'ack-progress') {
                updateSenderProgress(data.received, filesQueue[currentFileIdx].size, startTime);
            }
        });

        conn.on('close', () => {
            transferActive = false;
            releaseWakeLock();
            updateTitle(null);
        });
    });
}

let startTime = 0;

function sendNextFile() {
    if (!conn || currentFileIdx >= filesQueue.length) return;

    const file = filesQueue[currentFileIdx];

    els.senderProgressContainer.classList.remove('hidden');
    els.senderFileName.textContent = `${file.name} (${currentFileIdx + 1}/${filesQueue.length})`;
    els.senderFileSize.textContent = formatBytes(file.size);
    els.senderProgressFill.style.width = '0%';
    els.senderPercent.textContent = '0%';

    startTime = Date.now();

    conn.send({
        type: 'meta',
        name: file.name,
        size: file.size,
        fileType: file.type,
        index: currentFileIdx
    });

    let offset = 0;
    const reader = new FileReader();

    reader.onload = (e) => {
        conn.send({
            type: 'chunk',
            data: e.target.result
        });

        offset += e.target.result.byteLength;

        if (offset < file.size) {
            readNextChunk();
        } else {
            els.sendStatus.textContent = `Verifying ${file.name}...`;
        }
    };

    function readNextChunk() {
        if (conn.dataChannel.bufferedAmount > MAX_BUFFER) {
            setTimeout(readNextChunk, 10);
            return;
        }
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    }

    readNextChunk();
}

function updateSenderProgress(current, total, startTime) {
    const percent = (current / total) * 100;
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = elapsed > 0 ? current / elapsed : 0;

    els.senderProgressFill.style.width = `${percent}%`;
    els.senderPercent.textContent = `${Math.round(percent)}%`;
    els.senderSpeed.textContent = `${formatBytes(speed)}/s`;
    updateTitle(percent);
}

function resetSendState() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    clearInterval(timerInterval);
    els.stepCode.classList.add('hidden');
    els.stepUpload.classList.remove('hidden');
    els.sendStatus.style.color = 'var(--text-color)';
    els.senderProgressContainer.classList.add('hidden');
    filesQueue = [];
    transferActive = false;
    releaseWakeLock();
    updateTitle(null);
}

els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) initSender(e.target.files);
});
els.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropZone.classList.add('dragover');
});
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('dragover'));
els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) initSender(e.dataTransfer.files);
});
if (els.cancelSendBtn) els.cancelSendBtn.addEventListener('click', resetSendState);
if (els.senderCloseBtn) els.senderCloseBtn.addEventListener('click', resetSendState);

els.copyCodeBtn.addEventListener('click', () => {
    const code = els.generatedCode.textContent.replace(/\s/g, '');
    navigator.clipboard.writeText(code).then(() => {
        const originalIcon = '<i class="fa-regular fa-copy"></i>';
        els.copyCodeBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => els.copyCodeBtn.innerHTML = originalIcon, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Clipboard access denied');
    });
});

if (els.copyLinkBtn) {
    els.copyLinkBtn.addEventListener('click', () => {
        const code = els.generatedCode.textContent.replace(/\s/g, '');
        const link = `${window.location.origin}${window.location.pathname}?code=${code}`;

        navigator.clipboard.writeText(link).then(() => {
            const originalHTML = els.copyLinkBtn.innerHTML;
            els.copyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> ' + (currentLang === 'en' ? 'Copied!' : '¡Copiado!');
            setTimeout(() => els.copyLinkBtn.innerHTML = originalHTML, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Clipboard access denied');
        });
    });
}

// --- RECEIVE FLOW ---
function initReceiver() {
    const code = els.receiveCodeInput.value.replace(/\s/g, '');
    if (code.length !== 6) return;

    els.receiveStatus.setAttribute('data-i18n', 'status_connecting');
    els.receiveStatus.textContent = translations[currentLang].status_connecting;

    if (peer) peer.destroy();
    peer = new Peer({
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    peer.on('open', () => {
        const conn = peer.connect(`pf-${code}`);
        transferActive = true;
        requestWakeLock();

        conn.on('open', () => {
            els.receiveStatus.setAttribute('data-i18n', 'status_receiving');
            els.receiveStatus.textContent = translations[currentLang].status_receiving;
        });

        let receivedChunks = [];
        let receivedSize = 0;
        let totalSize = 0;
        let fileName = '';
        let fileType = '';
        let startTime = 0;
        let uiItem = null;
        let lastAckTime = 0;
        let batchTotal = 0;
        let batchCount = 0;
        let fileStream = null;
        let writable = null;

        conn.on('data', async (data) => {
            if (data.type === 'batch-meta') {
                batchTotal = data.count;
                batchCount = 0;
                els.receiveStatus.textContent = `Receiving ${batchTotal} files...`;
            }
            else if (data.type === 'meta') {
                fileName = data.name;
                totalSize = data.size;
                fileType = data.fileType;
                receivedChunks = [];
                receivedSize = 0;
                startTime = Date.now();
                batchCount = data.index + 1;

                uiItem = createTransferItem(`${fileName} (${batchCount}/${batchTotal})`, totalSize);
                lastAckTime = 0;

                // Try File System Access API (Streams)
                if (window.showSaveFilePicker) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: fileName
                        });
                        writable = await handle.createWritable();
                        fileStream = true;
                    } catch (err) {
                        console.log("Stream cancelled or failed, falling back to RAM");
                        fileStream = false;
                    }
                }
            }
            else if (data.type === 'chunk') {
                receivedSize += data.data.byteLength;

                if (fileStream && writable) {
                    await writable.write(data.data);
                } else {
                    receivedChunks.push(data.data);
                }

                updateTransferProgress(uiItem, receivedSize, totalSize, startTime);

                const now = Date.now();
                if (now - lastAckTime > 200) {
                    conn.send({ type: 'ack-progress', received: receivedSize });
                    lastAckTime = now;
                }

                if (receivedSize === totalSize) {
                    if (fileStream && writable) {
                        await writable.close();
                        writable = null;
                        fileStream = null;
                    } else {
                        // RAM Fallback (Blob)
                        // iOS Fix: Force application/octet-stream
                        const type = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'application/octet-stream' : fileType;
                        const blob = new Blob(receivedChunks, { type: type });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                    }

                    uiItem.querySelector('.progress-fill').style.backgroundColor = 'var(--success-color)';
                    uiItem.querySelector('.transfer-details').innerHTML = '<span style="color:var(--success-color)">Completed</span>';

                    addToHistory('received', fileName, totalSize);
                    vibrateSuccess();
                    updateTitle(100);

                    conn.send({ type: 'ack-file' });

                    const closeBtn = uiItem.querySelector('.close-transfer-btn');
                    if (closeBtn) closeBtn.classList.remove('hidden');
                }
            }
            else if (data.type === 'batch-complete') {
                els.receiveStatus.setAttribute('data-i18n', 'status_received_batch');
                els.receiveStatus.textContent = translations[currentLang].status_received_batch;
                transferActive = false;
                releaseWakeLock();
                updateTitle(null);
            }
        });

        conn.on('error', (err) => {
            els.receiveStatus.setAttribute('data-i18n', 'status_error');
            els.receiveStatus.textContent = translations[currentLang].status_error;
            transferActive = false;
            releaseWakeLock();
            vibrateError();
            updateTitle(null);
        });

        conn.on('close', () => {
            transferActive = false;
            releaseWakeLock();
            updateTitle(null);
        });

        setTimeout(() => {
            if (!conn.open) {
                els.receiveStatus.textContent = translations[currentLang].status_error;
            }
        }, 5000);
    });
}

// --- UI Helpers ---
function createTransferItem(filename, size) {
    const div = document.createElement('div');
    div.className = 'transfer-item';
    div.innerHTML = `
        <i class="fa-solid fa-arrow-down"></i>
        <div class="transfer-info">
            <div class="file-header">
                <div class="file-name">${filename}</div>
                <div class="file-size">${formatBytes(size)}</div>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
            <div class="transfer-details">
                <span class="transfer-speed">0 MB/s</span>
                <span class="transfer-percent">0%</span>
            </div>
            <button class="secondary-btn close-transfer-btn hidden" style="margin-top: 0.5rem; width: 100%;" data-i18n="close_btn">${translations[currentLang].close_btn}</button>
        </div>
    `;

    const closeBtn = div.querySelector('.close-transfer-btn');
    closeBtn.addEventListener('click', () => {
        div.remove();
    });

    els.transfersList.prepend(div);
    return div;
}

function updateTransferProgress(item, current, total, startTime) {
    const percent = (current / total) * 100;
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = elapsed > 0 ? current / elapsed : 0;

    item.querySelector('.progress-fill').style.width = `${percent}%`;
    item.querySelector('.transfer-percent').textContent = `${Math.round(percent)}%`;
    item.querySelector('.transfer-speed').textContent = `${formatBytes(speed)}/s`;
    updateTitle(percent);
}

els.receiveCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

els.receiveBtn.addEventListener('click', initReceiver);

updateLanguage('en');
renderHistory();

const urlParams = new URLSearchParams(window.location.search);
const magicCode = urlParams.get('code');

if (magicCode) {
    els.tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="receive"]').classList.add('active');
    els.sendPanel.classList.add('hidden');
    els.receivePanel.classList.remove('hidden');
    els.receiveCodeInput.value = magicCode;

    // Auto-connect
    setTimeout(() => {
        initReceiver();
    }, 500);
}
