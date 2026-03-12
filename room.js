// ===================== УПРАВЛЕНИЕ КОМНАТАМИ =====================
let roomUnsubscribe = null;

// Генерация кода комнаты
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Создание комнаты
async function createRoom() {
    requireAuth();
    
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
        const roomId = generateRoomCode();
        const roomRef = db.ref(`rooms/${roomId}`);
        
        const snapshot = await roomRef.once('value');
        if (!snapshot.exists()) {
            const roomData = {
                host: window.currentUser.uid,
                active: true,
                createdAt: Date.now(),
                players: {
                    [window.currentUser.uid]: {
                        email: window.currentUser.email,
                        joinedAt: Date.now()
                    }
                }
            };
            
            await roomRef.set(roomData);
            return roomId;
        }
        attempts++;
    }
    
    throw new Error('Не удалось создать комнату');
}

// Присоединение к комнате
async function joinRoom(roomId) {
    requireAuth();
    
    if (!roomId || roomId.length !== 6) {
        throw new Error('Некорректный код комнаты');
    }
    
    const roomRef = db.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.once('value');
    
    if (!snapshot.exists()) {
        throw new Error('Комната не найдена');
    }
    
    const room = snapshot.val();
    
    if (!room.active) {
        throw new Error('Комната отключена хостом');
    }
    
    const playersCount = room.players ? Object.keys(room.players).length : 0;
    if (playersCount >= 8) {
        throw new Error('Комната заполнена (максимум 8 игроков)');
    }
    
    await roomRef.child('players').child(window.currentUser.uid).set({
        email: window.currentUser.email,
        joinedAt: Date.now()
    });
    
    return roomId;
}

// Выход из комнаты
async function leaveRoom() {
    if (!window.currentRoomId || !window.currentUser) return;
    
    try {
        await db.ref(`rooms/${window.currentRoomId}/players/${window.currentUser.uid}`).remove();
    } catch (error) {
        console.error('❌ Ошибка при выходе:', error);
    }
    
    if (roomUnsubscribe) {
        roomUnsubscribe();
        roomUnsubscribe = null;
    }
}

// Переключение активности комнаты
async function toggleRoomActive() {
    if (!window.currentRoomId || !window.isHost) {
        throw new Error('Только хост может переключать комнату');
    }
    await db.ref(`rooms/${window.currentRoomId}/active`).set(!window.roomActive);
}

// Подписка на обновления комнаты
function subscribeToRoom(roomId, callbacks) {
    if (roomUnsubscribe) {
        roomUnsubscribe();
    }
    
    const roomRef = db.ref(`rooms/${roomId}`);
    
    const handleRoomUpdate = (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
            callbacks.onRoomDeleted?.();
            return;
        }
        
        if (!data.players?.[window.currentUser?.uid]) {
            callbacks.onPlayerRemoved?.();
            return;
        }
        
        const players = Object.entries(data.players || {}).map(([uid, info]) => ({
            uid,
            email: info.email,
            joinedAt: info.joinedAt
        }));
        
        // Автоматический выбор нового хоста
        if (!data.host || !data.players[data.host]) {
            const playersArray = Object.entries(data.players || {});
            if (playersArray.length > 0) {
                playersArray.sort((a, b) => a[1].joinedAt - b[1].joinedAt);
                const newHostUid = playersArray[0][0];
                db.ref(`rooms/${roomId}/host`).set(newHostUid);
            }
        }
        
        window.roomActive = data.active || false;
        window.isHost = data.host === window.currentUser?.uid;
        window.roomPlayers = players;
        
        callbacks.onUpdate?.({
            players,
            active: window.roomActive,
            isHost: window.isHost,
            hostUid: data.host
        });
    };
    
    roomRef.on('value', handleRoomUpdate);
    roomUnsubscribe = () => roomRef.off('value', handleRoomUpdate);
    return roomUnsubscribe;
}

console.log('✅ room.js загружен');
