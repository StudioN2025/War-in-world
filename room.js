// ===================== УПРАВЛЕНИЕ КОМНАТАМИ =====================
let currentRoomId = null;
let isHost = false;
let roomActive = false;
let roomPlayers = [];
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
                host: currentUser.uid,
                active: true,
                createdAt: Date.now(),
                players: {
                    [currentUser.uid]: {
                        email: currentUser.email,
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
    
    await roomRef.child('players').child(currentUser.uid).set({
        email: currentUser.email,
        joinedAt: Date.now()
    });
    
    return roomId;
}

// Выход из комнаты
async function leaveRoom() {
    if (!currentRoomId || !currentUser) return;
    
    try {
        await db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}`).remove();
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
    if (!currentRoomId || !isHost) {
        throw new Error('Только хост может переключать комнату');
    }
    await db.ref(`rooms/${currentRoomId}/active`).set(!roomActive);
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
        
        if (!data.players?.[currentUser?.uid]) {
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
        
        roomActive = data.active || false;
        isHost = data.host === currentUser?.uid;
        
        callbacks.onUpdate?.({
            players,
            active: roomActive,
            isHost,
            hostUid: data.host
        });
    };
    
    roomRef.on('value', handleRoomUpdate);
    roomUnsubscribe = () => roomRef.off('value', handleRoomUpdate);
    return roomUnsubscribe;
}
