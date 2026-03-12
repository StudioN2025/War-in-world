// P2P соединения (star архитектура)
let peerConnections = new Map(); // uid -> RTCPeerConnection
let dataChannels = new Map();    // uid -> RTCDataChannel

// Конфигурация ICE серверов
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Инициализация P2P как хоста (центр звезды)
async function initAsHost(peerUids) {
    closeAllConnections();
    
    for (const peerUid of peerUids) {
        if (peerUid === currentUser?.uid) continue;
        
        const pc = new RTCPeerConnection(iceServers);
        peerConnections.set(peerUid, pc);
        
        // Создаем канал данных
        const channel = pc.createDataChannel('gameChannel');
        setupDataChannel(channel, peerUid);
        dataChannels.set(peerUid, channel);
        
        // Обработка ICE кандидатов
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendIceCandidate(peerUid, event.candidate);
            }
        };
        
        // Создаем оффер
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Отправляем оффер через сигнальный сервер
        await saveOfferToFirebase(peerUid, offer);
    }
}

// Инициализация P2P как клиента (подключаемся к хосту)
async function initAsClient(hostUid) {
    closeAllConnections();
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnections.set(hostUid, pc);
    
    // Обработка входящего канала
    pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, hostUid);
        dataChannels.set(hostUid, event.channel);
    };
    
    // ICE кандидаты
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendIceCandidate(hostUid, event.candidate);
        }
    };
    
    // Подписываемся на оффер от хоста
    subscribeToOffer(hostUid, async (offer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await saveAnswerToFirebase(hostUid, answer);
    });
    
    // Подписываемся на ICE кандидаты
    subscribeToIceCandidates(hostUid, async (candidate) => {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Ошибка добавления ICE кандидата', e);
        }
    });
}

// Настройка канала данных
function setupDataChannel(channel, peerUid) {
    channel.onopen = () => {
        console.log(`Канал с ${peerUid} открыт`);
        sendGameState(peerUid);
    };
    
    channel.onmessage = (event) => {
        handleGameMessage(peerUid, event.data);
    };
    
    channel.onclose = () => {
        console.log(`Канал с ${peerUid} закрыт`);
    };
}

// Отправка игрового состояния
function sendGameState(peerUid) {
    const channel = dataChannels.get(peerUid);
    if (channel?.readyState === 'open') {
        channel.send(JSON.stringify({
            type: 'SYNC',
            data: getCurrentGameState()
        }));
    }
}

// Обработка игровых сообщений
function handleGameMessage(peerUid, data) {
    try {
        const message = JSON.parse(data);
        console.log('Получено сообщение:', message);
        
        switch (message.type) {
            case 'SYNC':
                // Синхронизация состояния
                updateGameFromPeer(peerUid, message.data);
                break;
            case 'ACTION':
                // Действие игрока
                applyPlayerAction(peerUid, message.action);
                break;
        }
    } catch (e) {
        console.error('Ошибка обработки сообщения', e);
    }
}

// Сигналинг через Firebase
async function saveOfferToFirebase(peerUid, offer) {
    await db.ref(`signaling/${currentRoomId}/offers/${peerUid}`).set({
        offer: offer,
        from: currentUser.uid
    });
}

async function saveAnswerToFirebase(peerUid, answer) {
    await db.ref(`signaling/${currentRoomId}/answers/${currentUser.uid}`).set({
        answer: answer,
        from: currentUser.uid
    });
}

function sendIceCandidate(peerUid, candidate) {
    db.ref(`signaling/${currentRoomId}/ice/${peerUid}`).push({
        candidate: candidate,
        from: currentUser.uid
    });
}

function subscribeToOffer(peerUid, callback) {
    const offerRef = db.ref(`signaling/${currentRoomId}/offers/${peerUid}`);
    offerRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.from !== currentUser.uid) {
            callback(data.offer);
        }
    });
}

function subscribeToIceCandidates(peerUid, callback) {
    const iceRef = db.ref(`signaling/${currentRoomId}/ice/${peerUid}`);
    iceRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (data && data.from !== currentUser.uid) {
            callback(data.candidate);
        }
    });
}

// Закрытие всех соединений
function closeAllConnections() {
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    dataChannels.clear();
}

// Заглушки для игровых функций
function getCurrentGameState() {
    return { players: roomPlayers, active: roomActive };
}

function updateGameFromPeer(peerUid, data) {
    console.log('Обновление от', peerUid, data);
}

function applyPlayerAction(peerUid, action) {
    console.log('Действие от', peerUid, action);
}
