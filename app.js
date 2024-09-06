// Configuración de Firebase (reemplaza con tus propias credenciales)
const firebaseConfig = {
    apiKey: "AIzaSyDTDl5KVNRhqpbWOS51DXMcvjmG0P48SGY",
    authDomain: "chatsc-31c8a.firebaseapp.com",
    projectId: "chatsc-31c8a",
    storageBucket: "chatsc-31c8a.appspot.com",
    messagingSenderId: "467357898222",
    appId: "1:467357898222:web:f947fe8765dd900c6a6aff"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a elementos del DOM
const authContainer = document.getElementById('authContainer');
const mainContainer = document.getElementById('mainContainer');
const chatListContainer = document.getElementById('chatListContainer');
const activeChatContainer = document.getElementById('activeChatContainer');
const chatList = document.getElementById('chatList');
const chatHeader = document.getElementById('chatHeader');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

let currentUser;
let currentChat = null;

// Función para iniciar sesión
function signIn() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            showMainContainer();
        })
        .catch((error) => {
            alert("Error de inicio de sesión: " + error.message);
        });
}

// Función para registrarse
function signUp() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value;
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            return firebase.database().ref('users/' + currentUser.uid).set({
                username: username,
                email: email
            });
        })
        .then(() => {
            showMainContainer();
        })
        .catch((error) => {
            alert("Error de registro: " + error.message);
        });
}

// Función para mostrar el contenedor principal
function showMainContainer() {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'flex';
    loadUserData();
    loadChats();
    if (window.innerWidth < 768) {
        showChatList();
    }
}

// Función para cargar datos del usuario
function loadUserData() {
    firebase.database().ref('users/' + currentUser.uid).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            currentUser.username = userData.username;
            updateUserStatus(true);
        });
}

// Función para actualizar el estado del usuario
function updateUserStatus(online) {
    firebase.database().ref('users/' + currentUser.uid).update({
        online: online,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

// Función para cargar chats
function loadChats() {
    const usersRef = firebase.database().ref('users');
    usersRef.on('value', (snapshot) => {
        chatList.innerHTML = ''; // Limpiar lista de chats
        
        // Añadir chat general
        const generalChatItem = createChatItem('general', 'Chat General', 'Bienvenido al chat general');
        chatList.appendChild(generalChatItem);
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.uid !== currentUser.uid) {
                const chatItem = createChatItem(user.uid, user.username, 'Haz clic para chatear', user.online);
                chatList.appendChild(chatItem);
            }
        });
    });
}

// Función para crear un elemento de chat
function createChatItem(uid, name, lastMessage, online) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.innerHTML = `
        <img src="/api/placeholder/40/40" alt="${name}">
        <div class="chat-info">
            <div class="chat-name">${name}</div>
            <div class="chat-last-message">${lastMessage}</div>
            ${online !== undefined ? `<div class="chat-status ${online ? 'online' : 'offline'}">${online ? 'En línea' : 'Desconectado'}</div>` : ''}
        </div>
    `;
    chatItem.onclick = () => openChat(uid, name);
    return chatItem;
}

// Función para abrir un chat
function openChat(chatId, chatName) {
    currentChat = chatId;
    chatHeader.innerHTML = `
        <button id="backToChatList" onclick="showChatList()" aria-label="Volver a la lista de chats">
            <i class="fas fa-arrow-left"></i>
        </button>
        <h2>${chatName}</h2>
    `;
    loadMessages(chatId);
    showActiveChat();
}

// Función para cargar mensajes
function loadMessages(chatId) {
    messagesDiv.innerHTML = '';
    const messagesRef = chatId === 'general' 
        ? firebase.database().ref('messages/general')
        : firebase.database().ref('privateMessages').child(getPrivateChatId(chatId));
    
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Función para mostrar un mensaje
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <strong>${message.senderName}:</strong> ${message.text}
        <div class="timestamp">${new Date(message.timestamp).toLocaleString()}</div>
    `;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Función para enviar un mensaje
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText && currentChat) {
        const message = {
            text: messageText,
            senderId: currentUser.uid,
            senderName: currentUser.username,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        const messageRef = currentChat === 'general'
            ? firebase.database().ref('messages/general')
            : firebase.database().ref('privateMessages').child(getPrivateChatId(currentChat));

        messageRef.push(message);
        messageInput.value = '';
    }
}

// Función para obtener el ID de un chat privado
function getPrivateChatId(otherUserId) {
    return [currentUser.uid, otherUserId].sort().join('_');
}

// Función para mostrar el editor de perfil
function showProfileEditor() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('profileContainer').style.display = 'block';
    
    document.getElementById('editUsername').value = currentUser.username || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('currentProfilePhoto').src = currentUser.photoURL || '/api/placeholder/100/100';
}

// Función para ocultar el editor de perfil
function hideProfileEditor() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('profileContainer').style.display = 'none';
}

// Función para actualizar el perfil
function updateProfile() {
    const newUsername = document.getElementById('editUsername').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const photoFile = document.getElementById('profilePhotoInput').files[0];

    if (!newUsername || !newEmail) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    let updatePromises = [];

    // Actualizar email en Authentication
    updatePromises.push(currentUser.updateEmail(newEmail));

    // Subir foto de perfil si se seleccionó una nueva
    if (photoFile) {
        const storageRef = firebase.storage().ref('profile_photos/' + currentUser.uid);
        updatePromises.push(
            storageRef.put(photoFile).then(() => storageRef.getDownloadURL())
        );
    }

    Promise.all(updatePromises)
        .then((results) => {
            let photoURL = results[1] ? results[1] : currentUser.photoURL;
            
            // Actualizar datos en la base de datos
            return firebase.database().ref('users/' + currentUser.uid).update({
                username: newUsername,
                email: newEmail,
                photoURL: photoURL
            });
        })
        .then(() => {
            alert("Perfil actualizado con éxito");
            hideProfileEditor();
            currentUser.username = newUsername;
            loadChats(); // Recargar la lista de usuarios para reflejar los cambios
        })
        .catch((error) => {
            alert("Error al actualizar el perfil: " + error.message);
        });
}

// Funciones para manejar la vista en dispositivos móviles
function showChatList() {
    if (window.innerWidth < 768) {
        chatListContainer.style.display = 'flex';
        activeChatContainer.style.display = 'none';
    }
}

function showActiveChat() {
    if (window.innerWidth < 768) {
        chatListContainer.style.display = 'none';
        activeChatContainer.style.display = 'flex';
    }
}

// Evento para enviar mensaje con la tecla Enter
messageInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// Evento para previsualizar la foto de perfil
document.getElementById('profilePhotoInput').addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('currentProfilePhoto').src = e.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// Manejar cambios en el tamaño de la ventana
window.addEventListener('resize', function() {
    if (window.innerWidth >= 768) {
        chatListContainer.style.display = 'flex';
        activeChatContainer.style.display = 'flex';
    } else if (currentChat) {
        showActiveChat();
    } else {
        showChatList();
    }
});

// Escuchar cambios en el estado de autenticación
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showMainContainer();
    } else {
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
    }
});

// Cerrar sesión al cerrar la ventana
window.onbeforeunload = function() {
    if (currentUser) {
        updateUserStatus(false);
    }
};

// ... (código anterior sin cambios) ...

// Función para actualizar el estado del usuario
function updateUserStatus(online) {
    const userStatusRef = firebase.database().ref('users/' + currentUser.uid);
    userStatusRef.update({
        online: online,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });

    if (online) {
        userStatusRef.onDisconnect().update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

// Función para actualizar el estado de escritura
function updateTypingStatus(isTyping) {
    if (currentChat) {
        const typingRef = firebase.database().ref('typing/' + getPrivateChatId(currentChat));
        if (isTyping) {
            typingRef.set({
                [currentUser.uid]: true
            });
        } else {
            typingRef.child(currentUser.uid).remove();
        }
    }
}

// Función para crear un elemento de chat
function createChatItem(uid, name, lastMessage, online, lastSeen) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.innerHTML = `
        <img src="/api/placeholder/40/40" alt="${name}">
        <div class="chat-info">
            <div class="chat-name">${name}</div>
            <div class="chat-last-message">${lastMessage}</div>
            <div class="chat-status">
                ${online ? '<span class="online-status">En línea</span>' : 
                           '<span class="last-seen">Última vez: ${formatLastSeen(lastSeen)}</span>'}
            </div>
        </div>
    `;
    chatItem.onclick = () => openChat(uid, name);
    return chatItem;
}

// Función para formatear la última vez visto
function formatLastSeen(timestamp) {
    if (!timestamp) return 'Desconocido';
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMinutes = Math.floor((now - lastSeen) / 60000);

    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} horas`;
    return `Hace ${Math.floor(diffMinutes / 1440)} días`;
}

// Función para abrir un chat
function openChat(chatId, chatName) {
    currentChat = chatId;
    chatHeader.innerHTML = `
        <button id="backToChatList" onclick="showChatList()" aria-label="Volver a la lista de chats">
            <i class="fas fa-arrow-left"></i>
        </button>
        <h2>${chatName}</h2>
        <div id="chatStatus"></div>
    `;
    loadMessages(chatId);
    showActiveChat();
    listenForTyping(chatId);
}

// Función para escuchar el estado de escritura
function listenForTyping(chatId) {
    const typingRef = firebase.database().ref('typing/' + getPrivateChatId(chatId));
    typingRef.on('value', (snapshot) => {
        const typingStatus = snapshot.val();
        const chatStatus = document.getElementById('chatStatus');
        if (typingStatus && Object.keys(typingStatus).length > 0 && !typingStatus[currentUser.uid]) {
            chatStatus.textContent = 'Escribiendo...';
        } else {
            chatStatus.textContent = '';
        }
    });
}

// Modificar la función loadChats para incluir el estado en línea y última conexión
function loadChats() {
    const usersRef = firebase.database().ref('users');
    usersRef.on('value', (snapshot) => {
        chatList.innerHTML = ''; // Limpiar lista de chats
        
        // Añadir chat general
        const generalChatItem = createChatItem('general', 'Chat General', 'Bienvenido al chat general');
        chatList.appendChild(generalChatItem);
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.uid !== currentUser.uid) {
                const chatItem = createChatItem(user.uid, user.username, 'Haz clic para chatear', user.online, user.lastSeen);
                chatList.appendChild(chatItem);
            }
        });
    });
}

// Evento para detectar cuando el usuario está escribiendo
messageInput.addEventListener('input', function() {
    updateTypingStatus(this.value.length > 0);
});

// Evento para detectar cuando el usuario deja de escribir
messageInput.addEventListener('blur', function() {
    updateTypingStatus(false);
});

// ... (resto del código sin cambios) ...
