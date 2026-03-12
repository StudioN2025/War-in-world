// ===================== ГЛАВНЫЙ ФАЙЛ =====================

// Глобальные переменные (будут доступны из других файлов)
let currentUser = null;
let currentRoomId = null;
let isHost = false;
let roomActive = false;
let roomPlayers = [];
let gameLoopInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра загружается...');
    initializeApp();
    setupEventListeners();
    testConnection();
    if (typeof game !== 'undefined' && game.initializeGame) {
        game.initializeGame();
    }
});

// Инициализация приложения
function initializeApp() {
    // Показываем приветственное сообщение
    setTimeout(() => {
        if (!currentUser) {
            console.log('ℹ️ Для игры требуется авторизация');
        }
    }, 2000);
}

// Тест подключения к Firebase
function testConnection() {
    console.log('🔍 Проверка подключения...');
    
    // Проверка базы данных
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            console.log('✅ Подключение к базе данных установлено');
            if (typeof showSuccess === 'function') {
                showSuccess('Подключение к серверу установлено');
            }
        } else {
            console.log('❌ Нет подключения к базе данных');
            if (typeof showError === 'function') {
                showError('Нет подключения к серверу. Проверьте интернет');
            }
        }
    });
    
    // Проверка аутентификации
    setTimeout(() => {
        if (auth) {
            console.log('🔐 Auth доступен');
        }
    }, 1000);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // ===== АВТОРИЗАЦИЯ =====
    const authBtn = document.getElementById('authBtn');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    
    if (authBtn) authBtn.addEventListener('click', () => {
        if (typeof showAuthModal === 'function') showAuthModal();
    });
    
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async () => {
            const email = loginEmail ? loginEmail.value.trim() : '';
            const password = loginPassword ? loginPassword.value.trim() : '';
            
            if (!email || !password) {
                if (typeof showError === 'function') showError('Введите email и пароль');
                return;
            }
            
            try {
                if (typeof setButtonsLoading === 'function') setButtonsLoading(true);
                loginSubmitBtn.textContent = '⏳ Подождите...';
                
                if (typeof loginWithEmail === 'function') {
                    await loginWithEmail(email, password);
                }
                
                if (loginEmail) loginEmail.value = '';
                if (loginPassword) loginPassword.value = '';
                if (typeof hideAuthModal === 'function') hideAuthModal();
                if (typeof showSuccess === 'function') showSuccess('Вход выполнен!');
            } catch (error) {
                if (typeof showError === 'function') showError(error.message);
            } finally {
                if (typeof setButtonsLoading === 'function') setButtonsLoading(false);
                loginSubmitBtn.textContent = '📧 войти / регистрация';
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (typeof logout === 'function') await logout();
            } catch (error) {
                if (typeof showError === 'function') showError('Ошибка выхода: ' + error.message);
            }
        });
    }
    
    // ===== УПРАВЛЕНИЕ КОМНАТОЙ =====
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const toggleRoomBtn = document.getElementById('toggleRoomBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const joinCodeInput = document.getElementById('joinCodeInput');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    
    // Создание комнаты
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', async () => {
            try {
                if (!currentUser) {
                    if (typeof showAuthModal === 'function') showAuthModal();
                    return;
                }
                
                if (typeof setButtonsLoading === 'function') setButtonsLoading(true);
                createRoomBtn.textContent = '⏳ Создание...';
                
                if (typeof createRoom === 'function') {
                    const roomId = await createRoom();
                    currentRoomId = roomId;
                    
                    console.log('✅ Комната создана:', roomId);
                    if (typeof showSuccess === 'function') showSuccess('Комната создана! Код: ' + roomId);
                    
                    // Подписываемся на обновления комнаты
                    if (typeof subscribeToRoom === 'function') {
                        subscribeToRoom(roomId, {
                            onUpdate: (data) => {
                                roomPlayers = data.players;
                                if (typeof updateRoomUI === 'function') updateRoomUI(data);
                                
                                // Добавляем игроков в игру при обновлении
                                if (typeof game !== 'undefined' && game.addPlayerToGame) {
                                    data.players.forEach(p => {
                                        game.addPlayerToGame(p.uid, p.email);
                                    });
                                }
                                
                                // Инициализация P2P соединений
                                if (data.isHost) {
                                    const peerUids = data.players
                                        .map(p => p.uid)
                                        .filter(uid => uid !== currentUser?.uid);
                                    
                                    if (peerUids.length > 0 && typeof initAsHost === 'function') {
                                        console.log('🎮 Инициализация как хост для', peerUids.length, 'пиров');
                                        initAsHost(peerUids);
                                    }
                                } else {
                                    const host = data.players.find(p => p.uid === data.hostUid);
                                    if (host && host.uid !== currentUser?.uid && typeof initAsClient === 'function') {
                                        console.log('🎮 Инициализация как клиент для хоста', host.email);
                                        initAsClient(host.uid);
                                    }
                                }
                            },
                            
                            onRoomDeleted: () => {
                                console.log('ℹ️ Комната удалена');
                                currentRoomId = null;
                                isHost = false;
                                if (typeof updateRoomUI === 'function') updateRoomUI(null);
                                if (typeof closeAllConnections === 'function') closeAllConnections();
                                if (typeof showError === 'function') showError('Комната была удалена');
                            },
                            
                            onPlayerRemoved: () => {
                                console.log('ℹ️ Вы удалены из комнаты');
                                currentRoomId = null;
                                isHost = false;
                                if (typeof updateRoomUI === 'function') updateRoomUI(null);
                                if (typeof closeAllConnections === 'function') closeAllConnections();
                                if (typeof showError === 'function') showError('Вы были удалены из комнаты');
                            }
                        });
                    }
                    
                    if (joinCodeInput) joinCodeInput.value = '';
                }
            } catch (error) {
                if (typeof showError === 'function') showError(error.message);
            } finally {
                if (typeof setButtonsLoading === 'function') setButtonsLoading(false);
                createRoomBtn.textContent = '➕ создать';
            }
        });
    }
    
    // Присоединение к комнате
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', async () => {
            const code = joinCodeInput ? joinCodeInput.value.trim().toUpperCase() : '';
            
            if (!code) {
                if (typeof showError === 'function') showError('Введите код комнаты');
                if (joinCodeInput) joinCodeInput.focus();
                return;
            }
            
            if (code.length !== 6) {
                if (typeof showError === 'function') showError('Код должен быть 6 символов (буквы и цифры)');
                if (joinCodeInput) joinCodeInput.focus();
                return;
            }
            
            try {
                if (!currentUser) {
                    if (typeof showAuthModal === 'function') showAuthModal();
                    return;
                }
                
                if (typeof setButtonsLoading === 'function') setButtonsLoading(true);
                joinRoomBtn.textContent = '⏳ Подключение...';
                
                if (typeof joinRoom === 'function') {
                    await joinRoom(code);
                    currentRoomId = code;
                    
                    console.log('✅ Присоединились к комнате:', code);
                    if (typeof showSuccess === 'function') showSuccess('Присоединение выполнено!');
                    
                    // Подписываемся на обновления комнаты
                    if (typeof subscribeToRoom === 'function') {
                        subscribeToRoom(code, {
                            onUpdate: (data) => {
                                roomPlayers = data.players;
                                if (typeof updateRoomUI === 'function') updateRoomUI(data);
                                
                                // Добавляем игроков в игру при обновлении
                                if (typeof game !== 'undefined' && game.addPlayerToGame) {
                                    data.players.forEach(p => {
                                        game.addPlayerToGame(p.uid, p.email);
                                    });
                                }
                                
                                if (data.isHost) {
                                    const peerUids = data.players
                                        .map(p => p.uid)
                                        .filter(uid => uid !== currentUser?.uid);
                                    
                                    if (peerUids.length > 0 && typeof initAsHost === 'function') {
                                        console.log('🎮 Инициализация как хост для', peerUids.length, 'пиров');
                                        initAsHost(peerUids);
                                    }
                                } else {
                                    const host = data.players.find(p => p.uid === data.hostUid);
                                    if (host && host.uid !== currentUser?.uid && typeof initAsClient === 'function') {
                                        console.log('🎮 Инициализация как клиент для хоста', host.email);
                                        initAsClient(host.uid);
                                    }
                                }
                            },
                            
                            onRoomDeleted: () => {
                                console.log('ℹ️ Комната удалена');
                                currentRoomId = null;
                                if (typeof updateRoomUI === 'function') updateRoomUI(null);
                                if (typeof closeAllConnections === 'function') closeAllConnections();
                                if (typeof showError === 'function') showError('Комната была удалена');
                            },
                            
                            onPlayerRemoved: () => {
                                console.log('ℹ️ Вы удалены из комнаты');
                                currentRoomId = null;
                                if (typeof updateRoomUI === 'function') updateRoomUI(null);
                                if (typeof closeAllConnections === 'function') closeAllConnections();
                                if (typeof showError === 'function') showError('Вы были удалены из комнаты');
                            }
                        });
                    }
                }
            } catch (error) {
                if (typeof showError === 'function') showError(error.message);
            } finally {
                if (typeof setButtonsLoading === 'function') setButtonsLoading(false);
                joinRoomBtn.textContent = 'вход';
            }
        });
    }
    
    // Переключение активности комнаты (только для хоста)
    if (toggleRoomBtn) {
        toggleRoomBtn.addEventListener('click', async () => {
            try {
                if (!currentRoomId) {
                    if (typeof showError === 'function') showError('Вы не в комнате');
                    return;
                }
                
                if (!isHost) {
                    if (typeof showError === 'function') showError('Только хост может переключать комнату');
                    return;
                }
                
                if (typeof toggleRoomActive === 'function') {
                    await toggleRoomActive();
                    if (typeof showSuccess === 'function') showSuccess(`Комната ${!roomActive ? 'включена' : 'выключена'}`);
                }
            } catch (error) {
                if (typeof showError === 'function') showError(error.message);
            }
        });
    }
    
    // Выход из комнаты
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', async () => {
            try {
                if (!currentRoomId) {
                    if (typeof showError === 'function') showError('Вы не в комнате');
                    return;
                }
                
                if (typeof setButtonsLoading === 'function') setButtonsLoading(true);
                leaveRoomBtn.textContent = '⏳ Выход...';
                
                // Удаляем игрока из игры
                if (typeof game !== 'undefined' && game.removePlayerFromGame && currentUser) {
                    game.removePlayerFromGame(currentUser.uid);
                }
                
                if (typeof leaveRoom === 'function') await leaveRoom();
                
                currentRoomId = null;
                isHost = false;
                if (typeof updateRoomUI === 'function') updateRoomUI(null);
                if (typeof closeAllConnections === 'function') closeAllConnections();
                
                if (typeof showSuccess === 'function') showSuccess('Вы вышли из комнаты');
                
            } catch (error) {
                if (typeof showError === 'function') showError('Ошибка при выходе: ' + error.message);
            } finally {
                if (typeof setButtonsLoading === 'function') setButtonsLoading(false);
                leaveRoomBtn.textContent = '🚪 выйти';
            }
        });
    }
    
    // Копирование кода комнаты
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            if (currentRoomId) {
                navigator.clipboard.writeText(currentRoomId)
                    .then(() => {
                        if (typeof showSuccess === 'function') showSuccess('Код скопирован в буфер обмена!');
                        
                        // Визуальный эффект на кнопке
                        copyCodeBtn.style.background = '#3f9e6b';
                        setTimeout(() => {
                            copyCodeBtn.style.background = '#346f8c';
                        }, 200);
                    })
                    .catch(() => {
                        alert('Код комнаты: ' + currentRoomId);
                    });
            } else {
                if (typeof showError === 'function') showError('Нет активной комнаты');
            }
        });
    }
    
    // ===== ИГРОВЫЕ КНОПКИ =====
    const startGameBtn = document.getElementById('startGameBtn');
    const stopGameBtn = document.getElementById('stopGameBtn');
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (!isHost) {
                if (typeof showError === 'function') showError('Только хост может запустить игру');
                return;
            }
            
            if (!currentRoomId) {
                if (typeof showError === 'function') showError('Сначала создайте или войдите в комнату');
                return;
            }
            
            if (typeof game === 'undefined') {
                if (typeof showError === 'function') showError('Игровая логика не загружена');
                return;
            }
            
            // Добавляем всех игроков в игру
            roomPlayers.forEach(p => {
                if (game.addPlayerToGame) {
                    game.addPlayerToGame(p.uid, p.email);
                }
            });
            
            // Запускаем игровой цикл
            if (game.startGameLoop) {
                game.startGameLoop();
            }
            
            // Оповещаем всех через P2P
            if (isHost && typeof dataChannels !== 'undefined') {
                dataChannels.forEach(channel => {
                    if (channel.readyState === 'open') {
                        channel.send(JSON.stringify({ type: 'START_GAME' }));
                    }
                });
            }
            
            if (typeof showSuccess === 'function') {
                showSuccess('Игра началась! Месяц будет проходить каждую минуту');
            }
        });
    }
    
    if (stopGameBtn) {
        stopGameBtn.addEventListener('click', () => {
            if (!isHost) {
                if (typeof showError === 'function') showError('Только хост может остановить игру');
                return;
            }
            
            if (typeof game !== 'undefined' && game.stopGameLoop) {
                game.stopGameLoop();
            }
            
            // Оповещаем всех через P2P
            if (isHost && typeof dataChannels !== 'undefined') {
                dataChannels.forEach(channel => {
                    if (channel.readyState === 'open') {
                        channel.send(JSON.stringify({ type: 'STOP_GAME' }));
                    }
                });
            }
            
            if (typeof showSuccess === 'function') {
                showSuccess('Игра остановлена');
            }
        });
    }
    
    // ===== ОБРАБОТКА КЛАВИШ =====
    if (joinCodeInput) {
        joinCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && joinRoomBtn) {
                joinRoomBtn.click();
            }
        });
    }
    
    if (loginEmail) {
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && loginPassword) {
                loginPassword.focus();
            }
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && loginSubmitBtn) {
                loginSubmitBtn.click();
            }
        });
    }
    
    // Закрытие модалки по клику вне её
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal && typeof hideAuthModal === 'function') {
                hideAuthModal();
            }
        });
    }
}

// Пинг для отслеживания активности (каждые 15 секунд)
setInterval(() => {
    if (currentUser && currentRoomId && db) {
        db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/ping`)
            .set(Date.now())
            .then(() => console.log('📡 Пинг отправлен'))
            .catch(err => console.log('⚠️ Пинг не удался:', err.message));
    }
}, 15000);

// Обработка ошибок сети
window.addEventListener('online', () => {
    console.log('🌐 Соединение восстановлено');
    if (typeof showSuccess === 'function') showSuccess('Соединение восстановлено');
});

window.addEventListener('offline', () => {
    console.log('🌐 Соединение потеряно');
    if (typeof showError === 'function') showError('Потеряно соединение с интернетом');
});

// Предотвращение случайного закрытия страницы
window.addEventListener('beforeunload', (e) => {
    if (currentRoomId && isHost) {
        // Если хост закрывает страницу, предупреждаем
        e.preventDefault();
        e.returnValue = 'Вы хост комнаты. Выход может прервать игру других игроков.';
    }
});

// Функция для блокировки/разблокировки кнопок
function setButtonsLoading(loading) {
    const buttons = [
        document.getElementById('createRoomBtn'),
        document.getElementById('joinRoomBtn'),
        document.getElementById('loginSubmitBtn'),
        document.getElementById('leaveRoomBtn'),
        document.getElementById('startGameBtn'),
        document.getElementById('stopGameBtn')
    ];
    
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = loading;
            btn.style.opacity = loading ? '0.5' : '1';
            btn.style.pointerEvents = loading ? 'none' : 'auto';
        }
    });
}

// Экспортируем функции в глобальную область
window.main = {
    initializeApp,
    testConnection,
    setupEventListeners,
    setButtonsLoading
};

console.log('✅ main.js полностью загружен');
