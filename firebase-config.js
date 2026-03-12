// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyB7kxK1lF3kXUzLm_5oHk-z7zX9Q8vW2jM",
    authDomain: "country-p2p-star.firebaseapp.com",
    projectId: "country-p2p-star",
    databaseURL: "https://country-p2p-star-default-rtdb.firebaseio.com/",
    storageBucket: "country-p2p-star.appspot.com",
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Глобальные ссылки
const auth = firebase.auth();
const db = firebase.database();
