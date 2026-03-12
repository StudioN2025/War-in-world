// ===================== УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ =====================
let currentUser = null;

// Функция для понятных сообщений об ошибках
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Некорректный email',
        'auth/user-disabled': 'Пользователь заблокирован',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/email-already-in-use': 'Этот email уже используется',
        'auth/weak-password': 'Пароль должен быть минимум 6 символов',
        'auth/operation-not-allowed': 'Вход по Email/Password не включен в консоли Firebase',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
        'auth/network-request-failed': 'Ошибка сети. Проверьте подключение',
        'auth/invalid-login-credentials': 'Неверный email или пароль'
    };
    return messages[errorCode] || 'Ошибка авторизации: ' + errorCode;
}

// Слушатель состояния аутентификации
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        console.log('✅ Пользователь авторизован:', user.email);
        updateUserUI(user);
        hideAuthModal();
    } else {
        console.log('ℹ️ Пользователь не авторизован');
        updateUserUI(null);
    }
});

// Функция входа/регистрации
async function loginWithEmail(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Введите email и пароль');
        }
        
        email = email.trim().toLowerCase();
        
        console.log('🔑 Попытка входа для:', email);
        
        // Пробуем войти
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Вход успешен');
            return userCredential.user;
        } catch (loginError) {
            console.log('❌ Ошибка входа:', loginError.code);
            
            // Если пользователь не найден - пробуем зарегистрировать
            if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-login-credentials') {
                try {
                    console.log('📝 Пробуем зарегистрировать нового пользователя...');
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    console.log('✅ Регистрация успешна');
                    return userCredential.user;
                } catch (regError) {
                    console.error('❌ Ошибка регистрации:', regError.code);
                    throw new Error(getAuthErrorMessage(regError.code));
                }
            } else {
                throw new Error(getAuthErrorMessage(loginError.code));
            }
        }
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        throw error;
    }
}

// Выход из системы
async function logout() {
    try {
        if (currentRoomId && currentUser) {
            await db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}`).remove();
        }
        await auth.signOut();
        console.log('✅ Выход выполнен');
        window.location.reload();
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
        showError('Ошибка выхода: ' + error.message);
    }
}

// Получение текущего пользователя
function getCurrentUser() {
    return currentUser;
}

// Проверка авторизации
function requireAuth() {
    if (!currentUser) {
        showAuthModal();
        throw new Error('Требуется авторизация');
    }
    return currentUser;
}
