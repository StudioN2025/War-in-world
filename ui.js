// ===================== УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ =====================
// DOM элементы
const userEmailSpan = document.getElementById('userEmail');
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinCodeInput = document.getElementById('joinCodeInput');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const toggleRoomBtn = document.getElementById('toggleRoomBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const peerCounter = document.getElementById('peerCounter');
const roomStatusIcon = document.getElementById('roomStatusIcon');
const playerListContainer = document.getElementById('playerListContainer');

// Функции отображения
function showError(message) {
    console.error('❌', message);
    alert('❌ ' + message);
}

function showSuccess(message) {
    console.log('✅', message);
    alert('✅ ' + message);
}

function updateUserUI(user) {
    if (user) {
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.color = '#9ac7e7';
    } else {
        userEmailSpan.textContent = 'не авторизован';
        userEmailSpan.style.color = '#ff9999';
    }
}

function showAuthModal() {
    if (authModal) {
        authModal.classList.remove('hidden');
        loginEmail.value = '';
        loginPassword.value = '';
    }
}

function hideAuthModal() {
    if (authModal) {
        authModal.classList.add('hidden');
    }
}

function updateRoomUI(roomData) {
    if (!roomData || !roomData.players) {
        roomCodeDisplay.textContent = '----';
        peerCounter.textContent = '0 игроков';
        roomStatusIcon.textContent = '⚫';
        playerListContainer.innerHTML = '<div class="player-item">👤 нет комнаты</div>';
        return;
    }
    
    const { players, active, isHost: userIsHost, hostUid } = roomData;
    
    roomCodeDisplay.textContent = currentRoomId || '----';
    peerCounter.textContent = `${players.length} игроков`;
    roomStatusIcon.textContent = active ? '🟢' : '🔴';
    
    playerListContainer.innerHTML = '';
    
    if (players.length === 0) {
        playerListContainer.innerHTML = '<div class="player-item">👤 пусто</div>';
        return;
    }
    
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.uid === currentUser?.uid) return -1;
        if (b.uid === currentUser?.uid) return 1;
        return 0;
    });
    
    sortedPlayers.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-item';
        
        const isMe = player.uid === currentUser?.uid;
        const isHostPlayer = player.uid === hostUid;
        
        div.innerHTML = `
            <span>${isMe ? '⭐' : '👤'}</span>
            <span style="flex:1">${player.email || 'Игрок'} ${isMe ? '(вы)' : ''}</span>
            ${isHostPlayer ? '<span class="crown">👑</span>' : ''}
        `;
        
        playerListContainer.appendChild(div);
    });
    
    if (userIsHost) {
        toggleRoomBtn.style.background = active ? '#ac9f3f' : '#3f9e6b';
        toggleRoomBtn.style.boxShadow = active ? '0 5px 0 #6b4f1a' : '0 5px 0 #1a5f3a';
    }
}
