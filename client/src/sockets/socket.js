import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

let socket = null;

export const initiateSocketConnection = (token) => {
    socket = io(SOCKET_URL, {
        auth: { token: token },
        transports: ['websocket', 'polling'], // Fallback array in case WebSockets fail
        withCredentials: true // Ensure cookies/sessions aren't rejected cross-port
    });

    socket.on('connect', () => {
        console.log(`Connected to socket with ID ${socket.id}`);
    });
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const subscribeToMessages = (cb) => {
    if (!socket) return true;
    socket.off('new_message'); // Remove previously attached listeners to prevent memory leaks and duplicates
    socket.on('new_message', (newMessage) => {
        console.log('Websocket event received!');
        return cb(null, newMessage);
    });
};

export const subscribeToPresence = (cb) => {
    if (!socket) return true;
    socket.off('user_online');
    socket.off('user_offline');

    socket.on('user_online', (data) => cb(null, { ...data, isOnline: true }));
    socket.on('user_offline', (data) => cb(null, { ...data, isOnline: false }));
};

export const joinChatRoom = (chatId) => {
    if (socket) {
        socket.emit('setup', { _id: chatId });
    }
}

export const getSocket = () => {
    return socket;
};

export const emitMessageReceived = (messageId) => {
    if (socket) {
        socket.emit('message_received', messageId);
    }
};

export const subscribeToMessageStatus = (cb) => {
    if (!socket) return true;
    socket.off('message_delivered');
    socket.off('message_read');

    socket.on('message_delivered', (data) => cb(null, { ...data, status: 'delivered' }));
    socket.on('message_read', (data) => cb(null, { ...data, status: 'read' }));
};

export const emitTyping = (chatId) => {
    if (socket) socket.emit('typing', chatId);
};

export const emitStopTyping = (chatId) => {
    if (socket) socket.emit('stop_typing', chatId);
};

export const subscribeToTypingStatus = (cb) => {
    if (!socket) return true;
    socket.off('typing');
    socket.off('stop_typing');

    // We can pass data if we want to know who is typing, but for 1-on-1 true/false is sufficient
    socket.on('typing', () => cb(null, true));
    socket.on('stop_typing', () => cb(null, false));
};

export const subscribeToNewChats = (cb) => {
    if (!socket) return true;
    socket.off('new_chat');
    socket.on('new_chat', (chat) => cb(null, chat));
};

export const subscribeToProfileUpdates = (cb) => {
    if (!socket) return true;
    socket.off('profile_updated');
    socket.on('profile_updated', (data) => cb(null, data));
};

export const subscribeToGroupRemoval = (cb) => {
    if (!socket) return true;
    socket.off('removed_from_group');
    socket.on('removed_from_group', (data) => cb(null, data));
};
