// Главный файл инициализации
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Авторизация
    authBtn.addEventListener('click', showAuthModal);
    
    loginSubmitBtn.addEventListener('click', async () => {
        try {
            await loginWithEmail(loginEmail.value, loginPassword.value);
        } catch (error) {
            alert(error.message);
        }
    });
    
    logoutBtn.addEventListener('click', logout);
    
    // Создание комнаты
    createRoomBtn.addEventListener('click', async () => {
        try {
            const roomId = await createRoom();
            currentRoomId = roomId;
            
            // Подписка на обновления
            subscribeToRoom(roomId, {
                onUpdate: (data) => {
                    roomPlayers = data.players;
                    updateRoomUI(data);
                    
                    // Инициализация P2P
                    if (data.isHost) {
                        initAsHost(data.players.map(p => p.uid));
                    } else {
                        const host = data.players.find(p => p.uid === data.hostUid);
                        if (host) {
                            initAsClient(host.uid);
                        }
                    }
                },
                onRoomDeleted: () => {
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                },
                onPlayerRemoved: () => {
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                }
            });
        } catch (error) {
            alert(error.message);
        }
    });
    
    // Присоединение к комнате
    joinRoomBtn.addEventListener('click', async () => {
        const code = joinCodeInput.value.trim().toUpperCase();
        if (!code) return;
        
        try {
            await joinRoom(code);
            currentRoomId = code;
            
            subscribeToRoom(code, {
                onUpdate: (data) => {
                    roomPlayers = data.players;
                    updateRoomUI(data);
                    
                    if (data.isHost) {
                        initAsHost(data.players.map(p => p.uid));
                    } else {
                        const host = data.players.find(p => p.uid === data.hostUid);
                        if (host) {
                            initAsClient(host.uid);
                        }
                    }
                },
                onRoomDeleted: () => {
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                },
                onPlayerRemoved: () => {
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                }
            });
        } catch (error) {
            alert(error.message);
        }
    });
    
    // Переключение активности комнаты
    toggleRoomBtn.addEventListener('click', async () => {
        try {
            await toggleRoomActive();
        } catch (error) {
            alert(error.message);
        }
    });
    
    // Выход из комнаты
    leaveRoomBtn.addEventListener('click', async () => {
        await leaveRoom();
        currentRoomId = null;
        isHost = false;
        updateRoomUI(null);
        closeAllConnections();
    });
}

// Периодический пинг для отслеживания активности
setInterval(() => {
    if (currentUser && currentRoomId) {
        db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/ping`).set(Date.now());
    }
}, 15000);
