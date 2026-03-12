// Состояние авторизации
let currentUser = null;

// Наблюдатель за состоянием
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUserUI(user);
    if (user) {
        hideAuthModal();
    } else {
        showAuthModal();
    }
});

// Вход/регистрация
async function loginWithEmail(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            try {
                await auth.createUserWithEmailAndPassword(email, password);
            } catch (regError) {
                throw new Error('Ошибка регистрации: ' + regError.message);
            }
        } else {
            throw new Error('Ошибка входа: ' + error.message);
        }
    }
}

// Выход
async function logout() {
    await auth.signOut();
    window.location.reload();
}

// Получение текущего пользователя
function getCurrentUser() {
    return currentUser;
}
