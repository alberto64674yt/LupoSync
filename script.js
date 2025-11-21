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
        status_sent: "File sent successfully!",
        cancel_btn: "Cancel",
        enter_code_title: "Enter 6-digit Key",
        receive_btn: "Receive",
        status_connecting: "Connecting...",
        status_receiving: "Receiving file...",
        status_error: "Error or Invalid Code",
        file_received: "File received"
    },
    es: {
        tab_send: "Enviar",
        tab_receive: "Recibir",
        drop_zone_title: "Arrastra archivos aquí",
        drop_zone_subtitle: "o haz clic para buscar",
        share_code_msg: "Comparte este código con el destinatario",
        status_waiting_receiver: "Esperando al receptor...",
        status_sending: "Enviando archivo...",
        status_sent: "¡Archivo enviado!",
        cancel_btn: "Cancelar",
        enter_code_title: "Introduce Clave de 6 dígitos",
        receive_btn: "Recibir",
        status_connecting: "Conectando...",
        status_receiving: "Recibiendo archivo...",
        status_error: "Error o Código Inválido",
        file_received: "Archivo recibido"
    }
};

// State
let currentLang = 'en';
let peer = null;
let conn = null;
let fileToSend = null;
let timerInterval = null;
const CHUNK_SIZE = 16384; // 16KB chunks

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

    // Receive Mode
    receiveCodeInput: document.getElementById('receive-code-input'),
    receiveBtn: document.getElementById('receive-btn'),
    receiveStatus: document.getElementById('receive-status'),
    transfersList: document.getElementById('transfers-list')
};

// --- Language System ---
function updateLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.textContent = translations[lang][key];
    });
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
        } else {
            els.sendPanel.classList.add('hidden');
            els.receivePanel.classList.remove('hidden');
        }
    });
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
    let timeLeft = 600; // 10 minutes
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

function initSender(file) {
    fileToSend = file;
    const code = generateCode();

    // UI Update
    els.stepUpload.classList.add('hidden');
    els.stepCode.classList.remove('hidden');
    els.generatedCode.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
    els.sendStatus.textContent = translations[currentLang].status_waiting_receiver;

    // QR Code
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

    // PeerJS Init
    if (peer) peer.destroy();
    peer = new Peer(`pf-${code}`);

    peer.on('error', (err) => {
        console.error(err);
        if (err.type === 'unavailable-id') {
            initSender(file);
        }
    });

    peer.on('connection', (connection) => {
        conn = connection;
        els.sendStatus.textContent = translations[currentLang].status_sending;
        clearInterval(timerInterval);

        conn.on('open', () => {
            sendFileChunked(file);
        });
    });
}

function sendFileChunked(file) {
    if (!conn) return;

    // Send Metadata
    conn.send({
        type: 'meta',
        name: file.name,
        size: file.size,
        fileType: file.type
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
            els.sendStatus.textContent = translations[currentLang].status_sent;
            els.sendStatus.style.color = 'var(--success-color)';
            setTimeout(() => resetSendState(), 3000);
        }
    };

    function readNextChunk() {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    }

    readNextChunk();
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
    fileToSend = null;
}

// Send Events
// Note: Click is handled by <label> tag automatically
els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) initSender(e.target.files[0]);
});
els.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropZone.classList.add('dragover');
});
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('dragover'));
els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) initSender(e.dataTransfer.files[0]);
});
els.cancelSendBtn.addEventListener('click', resetSendState);

// Copy Code
els.copyCodeBtn.addEventListener('click', () => {
    const code = els.generatedCode.textContent.replace(/\s/g, '');
    navigator.clipboard.writeText(code);

    const originalIcon = els.copyCodeBtn.innerHTML;
    els.copyCodeBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => els.copyCodeBtn.innerHTML = originalIcon, 2000);
});

// --- RECEIVE FLOW ---
function initReceiver() {
    const code = els.receiveCodeInput.value.replace(/\s/g, '');
    if (code.length !== 6) return;

    els.receiveStatus.textContent = translations[currentLang].status_connecting;

    if (peer) peer.destroy();
    peer = new Peer();

    peer.on('open', () => {
        const conn = peer.connect(`pf-${code}`);

        conn.on('open', () => {
            els.receiveStatus.textContent = translations[currentLang].status_receiving;
        });

        let receivedChunks = [];
        let receivedSize = 0;
        let totalSize = 0;
        let fileName = '';
        let fileType = '';
        let startTime = 0;
        let uiItem = null;

        conn.on('data', (data) => {
            if (data.type === 'meta') {
                fileName = data.name;
                totalSize = data.size;
                fileType = data.fileType;
                startTime = Date.now();
                uiItem = createTransferItem(fileName, totalSize);
            } else if (data.type === 'chunk') {
                receivedChunks.push(data.data);
                receivedSize += data.data.byteLength;

                updateTransferProgress(uiItem, receivedSize, totalSize, startTime);

                if (receivedSize === totalSize) {
                    const blob = new Blob(receivedChunks, { type: fileType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();

                    els.receiveStatus.textContent = translations[currentLang].file_received;
                    conn.close();
                }
            }
        });

        conn.on('error', (err) => {
            els.receiveStatus.textContent = translations[currentLang].status_error;
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
        </div>
    `;
    els.transfersList.prepend(div);
    return div;
}

function updateTransferProgress(item, current, total, startTime) {
    const percent = (current / total) * 100;
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const speed = elapsed > 0 ? current / elapsed : 0; // bytes/sec

    item.querySelector('.progress-fill').style.width = `${percent}%`;
    item.querySelector('.transfer-percent').textContent = `${Math.round(percent)}%`;
    item.querySelector('.transfer-speed').textContent = `${formatBytes(speed)}/s`;
}

// Input Handling (Strip spaces)
els.receiveCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

els.receiveBtn.addEventListener('click', initReceiver);

// Init
updateLanguage('en');

// Magic Link Logic
const urlParams = new URLSearchParams(window.location.search);
const magicCode = urlParams.get('code');

if (magicCode) {
    // Switch to Receive Tab
    els.tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="receive"]').classList.add('active');
    els.sendPanel.classList.add('hidden');
    els.receivePanel.classList.remove('hidden');

    // Fill Input
    els.receiveCodeInput.value = magicCode;

    // Optional: Auto-focus or Auto-receive could go here
    // For now, just filling it is safer/better UX so user confirms
}
