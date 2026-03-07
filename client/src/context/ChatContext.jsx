import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAllChats, fetchMessages, sendMessage as sendMessageApi, markMessagesAsRead, sendMessageWithMedia as sendMessageWithMediaApi } from '../api/chat';
import { initiateSocketConnection, disconnectSocket, subscribeToMessages, joinChatRoom, subscribeToPresence, subscribeToMessageStatus, emitMessageReceived, subscribeToNewChats, subscribeToProfileUpdates } from '../sockets/socket';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const ChatContext = createContext(null);

const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.warn("Audio not supported");
    }
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isViewingArchived, setIsViewingArchived] = useState(false);

    // Initialize socket when user logs in
    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('token');
            if (token) initiateSocketConnection(token);
        } else {
            disconnectSocket();
        }

        return () => disconnectSocket();
    }, [user]);

    // Handle incoming websocket messages
    useEffect(() => {
        subscribeToMessages((err, data) => {
            if (err) return;

            const upcomingChatId = typeof data.chat === 'string' ? data.chat : data.chat?._id;

            if (data.sender?._id !== user._id && data.sender !== user._id) {
                emitMessageReceived(data._id);
            }

            if (activeChat && activeChat._id === upcomingChatId) {
                setMessages((prev) => {
                    if (prev.some(msg => msg._id === data._id)) return prev;
                    return [...prev, data];
                });

                if (data.sender?._id !== user._id && data.sender !== user._id) {
                    markMessagesAsRead(activeChat._id).catch(console.error);
                }

                setChats(prevChats => {
                    const mapped = prevChats.map(c => c._id === upcomingChatId ? { ...c, lastMessage: data } : c);
                    const idx = mapped.findIndex(c => c._id === upcomingChatId);
                    if (idx > 0) {
                        const moved = mapped.splice(idx, 1)[0];
                        mapped.unshift(moved);
                    }
                    return mapped;
                });
            } else {
                if (data.sender?._id !== user._id && data.sender !== user._id) {
                    const senderName = data.sender?.username || 'Someone';
                    let chatName = null;
                    const targetLocalChat = chats.find(c => c._id === upcomingChatId);
                    if (targetLocalChat && targetLocalChat.isGroup) {
                        chatName = targetLocalChat.name;
                    } else if (typeof data.chat === 'object' && data.chat.isGroup) {
                        chatName = data.chat.name;
                    }

                    const previewText = data.type === 'text' ? data.content : `Sent a ${data.type}`;
                    const notificationTitle = chatName ? `${senderName} in ${chatName}` : `${senderName}`;

                    toast((t) => (
                        <div>
                            <strong>{notificationTitle}</strong>
                            <div style={{ fontSize: '0.9em', color: '#94a3b8' }}>{previewText}</div>
                        </div>
                    ), {
                        icon: '💬',
                        style: {
                            borderRadius: '10px',
                            background: '#1e293b',
                            color: '#fff',
                        },
                    });

                    playNotificationSound();

                    setChats(prevChats => {
                        const mapped = prevChats.map(c => {
                            if (c._id === upcomingChatId) {
                                return { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: data };
                            }
                            return c;
                        });
                        const idx = mapped.findIndex(c => c._id === upcomingChatId);
                        if (idx > 0) {
                            const moved = mapped.splice(idx, 1)[0];
                            mapped.unshift(moved);
                        }
                        return mapped;
                    });
                }
            }
        });
    }, [activeChat, user, chats]);

    // Handle incoming message status updates (Delivered / Read)
    useEffect(() => {
        if (!user) return;
        subscribeToMessageStatus((err, data) => {
            if (err) return;
            const { messageId, userId, chatId, status } = data;

            if (status === 'delivered') {
                setMessages(prev => prev.map(msg =>
                    msg._id === messageId
                        ? { ...msg, status: 'delivered', deliveredTo: [...(msg.deliveredTo || []), userId] }
                        : msg
                ));
            } else if (status === 'read') {
                // 'read' event targets an entire chat, updating all previous unread messages
                setMessages(prev => prev.map(msg => {
                    const msgChatId = msg.chat?._id || msg.chat;
                    if (msgChatId === chatId && !msg.readBy?.includes(userId)) {
                        return { ...msg, status: 'read', readBy: [...(msg.readBy || []), userId] };
                    }
                    return msg;
                }));
            }
        });
    }, [user]);

    // Handle incoming presence updates (online/offline)
    useEffect(() => {
        if (!user) return;
        subscribeToPresence((err, data) => {
            if (err) return;

            const { userId, isOnline } = data;

            // Update chats list
            setChats(prevChats => prevChats.map(chat => ({
                ...chat,
                participants: chat.participants.map(p =>
                    p._id === userId ? { ...p, isOnline, lastSeen: new Date() } : p
                ),
                admins: chat.admins ? chat.admins.map(a =>
                    a._id === userId ? { ...a, isOnline, lastSeen: new Date() } : a
                ) : []
            })));

            // Update active chat if it contains the participant
            setActiveChat(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map(p =>
                        p._id === userId ? { ...p, isOnline, lastSeen: new Date() } : p
                    ),
                    admins: prev.admins ? prev.admins.map(a =>
                        a._id === userId ? { ...a, isOnline, lastSeen: new Date() } : a
                    ) : []
                };
            });
        });
    }, [user]);

    // Handle incoming profile updates (name/avatar change)
    useEffect(() => {
        if (!user) return;
        subscribeToProfileUpdates((err, data) => {
            if (err) return;

            const { userId, username, avatar } = data;

            // Update chats list participants
            setChats(prevChats => prevChats.map(chat => ({
                ...chat,
                participants: chat.participants.map(p =>
                    p._id === userId ? { ...p, username, avatar } : p
                ),
                admins: chat.admins ? chat.admins.map(a =>
                    a._id === userId ? { ...a, username, avatar } : a
                ) : []
            })));

            // Update active chat participants
            setActiveChat(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map(p =>
                        p._id === userId ? { ...p, username, avatar } : p
                    ),
                    admins: prev.admins ? prev.admins.map(a =>
                        a._id === userId ? { ...a, username, avatar } : a
                    ) : []
                };
            });

            // Dynamically update old messages in view to adopt the new name and avatar
            setMessages(prev => prev.map(msg => {
                const senderId = msg.sender?._id || msg.sender;
                if (senderId === userId) {
                    return {
                        ...msg,
                        sender: {
                            ...(typeof msg.sender === 'object' ? msg.sender : { _id: senderId }),
                            username,
                            avatar
                        }
                    };
                }
                return msg;
            }));
        });
    }, [user]);

    // Handle newly created chats by other users
    useEffect(() => {
        if (!user) return;
        subscribeToNewChats((err, newChat) => {
            if (err) return;
            setChats(prev => {
                // Prevent duplicates
                if (prev.some(c => c._id === newChat._id)) return prev;
                return [newChat, ...prev];
            });
        });
    }, [user]);

    const loadChats = async (archived = isViewingArchived) => {
        setLoadingChats(true);
        try {
            const result = await fetchAllChats(archived);
            // Extract the actual array from the backend response
            setChats(result.data || []);
        } catch (error) {
            console.error("Failed to load chats:", error);
        } finally {
            setLoadingChats(false);
        }
    };

    // Effect to reload chats when toggle changes
    useEffect(() => {
        if (user) {
            loadChats(isViewingArchived);
        }
    }, [isViewingArchived, user]);

    const selectChat = async (chat) => {
        setActiveChat(chat);
        joinChatRoom(chat._id);
        setPage(1);
        setHasMoreMessages(true);
        setLoadingMessages(true);

        try {
            const result = await fetchMessages(chat._id, 1);
            // Extract the messages array and reverse it to chronological order (oldest -> newest)
            const msgs = result.data || [];
            setMessages(msgs.reverse());

            if (msgs.length < 20) {
                setHasMoreMessages(false);
            }

            // Immediately mark these newly opened messages as read
            markMessagesAsRead(chat._id).catch(console.error);

            // Clear unread count locally upon selecting
            setChats(prevChats => prevChats.map(c =>
                c._id === chat._id ? { ...c, unreadCount: 0 } : c
            ));
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const loadMoreMessages = async () => {
        if (!activeChat || loadingMessages || !hasMoreMessages) return;

        setLoadingMessages(true);
        try {
            const nextPage = page + 1;
            const result = await fetchMessages(activeChat._id, nextPage);
            const newMsgs = result.data || [];

            if (newMsgs.length > 0) {
                setMessages(prev => [...newMsgs.reverse(), ...prev]);
                setPage(nextPage);
            }

            if (newMsgs.length < 20) {
                setHasMoreMessages(false);
            }
        } catch (error) {
            console.error("Failed to load more messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const sendMessage = async (content) => {
        if (!activeChat) return;
        try {
            const result = await sendMessageApi(activeChat._id, content);
            if (result && result.data) {
                setMessages((prev) => {
                    if (prev.some(msg => msg._id === result.data._id)) return prev;
                    return [...prev, result.data];
                });

                setChats(prevChats => {
                    const mapped = prevChats.map(c => c._id === activeChat._id ? { ...c, lastMessage: result.data } : c);
                    const idx = mapped.findIndex(c => c._id === activeChat._id);
                    if (idx > 0) {
                        const moved = mapped.splice(idx, 1)[0];
                        mapped.unshift(moved);
                    }
                    return mapped;
                });
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMsg = error.response?.data?.message || error.message;
            if (errorMsg === "You cannot send messages to a blocked contact") {
                toast.error(errorMsg);
            } else if (errorMsg === "You have been blocked by this user") {
                const fakeMessage = {
                    _id: "fake_" + Date.now(),
                    chat: activeChat._id,
                    sender: user._id,
                    content: content,
                    type: 'text',
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                    readBy: [],
                    deliveredTo: []
                };
                setMessages((prev) => [...prev, fakeMessage]);
                setChats(prevChats => {
                    const mapped = prevChats.map(c => c._id === activeChat._id ? { ...c, lastMessage: fakeMessage } : c);
                    const idx = mapped.findIndex(c => c._id === activeChat._id);
                    if (idx > 0) {
                        const moved = mapped.splice(idx, 1)[0];
                        mapped.unshift(moved);
                    }
                    return mapped;
                });
            } else {
                toast.error("Failed to send message");
            }
        }
    };

    const sendMediaMessage = async (content, file, type) => {
        if (!activeChat) return;
        try {
            const result = await sendMessageWithMediaApi(activeChat._id, content, file, type);
            if (result && result.data) {
                setMessages((prev) => {
                    if (prev.some(msg => msg._id === result.data._id)) return prev;
                    return [...prev, result.data];
                });

                setChats(prevChats => {
                    const mapped = prevChats.map(c => c._id === activeChat._id ? { ...c, lastMessage: result.data } : c);
                    const idx = mapped.findIndex(c => c._id === activeChat._id);
                    if (idx > 0) {
                        const moved = mapped.splice(idx, 1)[0];
                        mapped.unshift(moved);
                    }
                    return mapped;
                });
            }
            return result;
        } catch (error) {
            console.error("Failed to send media message:", error);
            const errorMsg = error.response?.data?.message || error.message;
            if (errorMsg === "You cannot send messages to a blocked contact") {
                toast.error(errorMsg);
            } else if (errorMsg === "You have been blocked by this user") {
                const fakeMessage = {
                    _id: "fake_" + Date.now(),
                    chat: activeChat._id,
                    sender: user._id,
                    content: content || '',
                    type: type,
                    media: { url: type === 'image' && file ? URL.createObjectURL(file) : '' },
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                    readBy: [],
                    deliveredTo: []
                };
                setMessages((prev) => [...prev, fakeMessage]);
                setChats(prevChats => {
                    const mapped = prevChats.map(c => c._id === activeChat._id ? { ...c, lastMessage: fakeMessage } : c);
                    const idx = mapped.findIndex(c => c._id === activeChat._id);
                    if (idx > 0) {
                        const moved = mapped.splice(idx, 1)[0];
                        mapped.unshift(moved);
                    }
                    return mapped;
                });
            } else {
                toast.error("Failed to send media message");
            }
            throw error;
        }
    };

    const clearChatUI = () => {
        if (!activeChat) return;
        setMessages([]);
        setChats(prevChats => prevChats.map(c =>
            c._id === activeChat._id ? { ...c, lastMessage: null, unreadCount: 0 } : c
        ));
    };

    return (
        <ChatContext.Provider value={{
            chats, activeChat, setActiveChat, messages, loadingChats,
            loadingMessages, hasMoreMessages, loadChats,
            selectChat, sendMessage, loadMoreMessages,
            sendMediaMessage, isViewingArchived, setIsViewingArchived,
            clearChatUI
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
