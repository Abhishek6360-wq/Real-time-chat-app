import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { emitTyping, emitStopTyping, subscribeToTypingStatus } from '../sockets/socket';
import ChatInfoModal from './GroupInfoModal';
import './Chatroom.css';

const Chatroom = () => {
  const [message, setMessage] = useState('');
  const { activeChat, messages, sendMessage, sendMediaMessage, loadMoreMessages, loadingMessages, hasMoreMessages } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // Restore scroll position after paginating, or auto-scroll to bottom for new messages
  useEffect(() => {
    if (prevScrollHeight > 0 && messagesAreaRef.current) {
      // We just loaded older messages, preserve the scroll position relative to what we were looking at
      const scrollDiff = messagesAreaRef.current.scrollHeight - prevScrollHeight;
      messagesAreaRef.current.scrollTop = scrollDiff;
      setPrevScrollHeight(0);
    } else if (prevScrollHeight === 0) {
      // Normal flow (new message arrived or chat opened), scroll to the bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, prevScrollHeight]);

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && hasMoreMessages && !loadingMessages) {
      setPrevScrollHeight(e.target.scrollHeight);
      loadMoreMessages();
    }
  };

  // Subscribe to typing indicators
  useEffect(() => {
    if (!activeChat) return;

    setIsTyping(false); // Reset when switching chats

    subscribeToTypingStatus((err, typingStatus) => {
      if (!err) {
        setIsTyping(typingStatus);
      }
    });
  }, [activeChat]);

  if (!activeChat) {
    return (
      <div className="chatroom-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <h3 style={{ color: '#94a3b8' }}>Select a chat to start messaging</h3>
      </div>
    );
  }



  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const type = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        await sendMediaMessage(message, selectedFile, type);
        setSelectedFile(null);
        setMessage('');
      } catch (error) {
        console.error("Failed to upload file", error);
      } finally {
        setIsUploading(false);
      }
    } else {
      sendMessage(message);
      setMessage('');
    }

    if (activeChat) {
      emitStopTyping(activeChat._id);
      if (typingTimeout) clearTimeout(typingTimeout);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!activeChat) return;

    emitTyping(activeChat._id);

    if (typingTimeout) clearTimeout(typingTimeout);

    const newTimeout = setTimeout(() => {
      emitStopTyping(activeChat._id);
    }, 2000);

    setTypingTimeout(newTimeout);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const getChatName = () => {
    if (activeChat.isGroup) return activeChat.name;
    const otherUser = activeChat.participants.find(p => p._id !== user._id);
    return otherUser ? otherUser.username : 'Unknown User';
  };

  const getOtherUser = () => {
    if (activeChat.isGroup) return null;
    return activeChat.participants.find(p => p._id !== user._id);
  };

  const isChatOnline = () => {
    const otherUser = getOtherUser();
    return otherUser ? otherUser.isOnline : false;
  };

  const getLastSeenText = () => {
    const otherUser = getOtherUser();
    if (!otherUser) return activeChat.isGroup ? `${activeChat.participants.length} members` : '';
    if (otherUser.isOnline) return 'Online';
    if (!otherUser.lastSeen) return 'Offline';

    // Format "Last seen at HH:MM"
    const date = new Date(otherUser.lastSeen);
    return `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const chatName = getChatName();

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReadReceiptIcon = (msg) => {
    if (!activeChat) return null;

    if (!activeChat.isGroup) {
      const otherUser = getOtherUser();
      if (!otherUser) return null;

      // Check if the other user has explicitly read or received it
      const hasRead = msg.readBy && msg.readBy.some(id => id.toString() === otherUser._id.toString());
      const hasDelivered = msg.deliveredTo && msg.deliveredTo.some(id => id.toString() === otherUser._id.toString());

      if (hasRead) {
        return <span style={{ color: '#3b82f6', fontSize: '12px' }}>✓✓</span>;
      } else if (hasDelivered) {
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>✓✓</span>;
      } else {
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>✓</span>;
      }
    } else {
      // Group Chat Logic
      const otherParticipants = activeChat.participants.filter(p => p._id !== user._id);
      if (otherParticipants.length === 0) {
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>✓</span>;
      }

      // Check if ALL other participants have read it
      const allRead = otherParticipants.every(p =>
        msg.readBy && msg.readBy.some(id => id.toString() === p._id.toString())
      );

      // Check if ALL other participants have at least had it delivered (or read)
      const allDelivered = otherParticipants.every(p =>
        (msg.deliveredTo && msg.deliveredTo.some(id => id.toString() === p._id.toString())) ||
        (msg.readBy && msg.readBy.some(id => id.toString() === p._id.toString()))
      );

      // If at least ONE person has read it, we can show double grey to indicate it's making progress
      const anyRead = otherParticipants.some(p =>
        msg.readBy && msg.readBy.some(id => id.toString() === p._id.toString())
      );

      if (allRead) {
        return <span style={{ color: '#3b82f6', fontSize: '12px', transition: 'color 0.3s' }}>✓✓</span>; // Double Blue Ticks
      } else if (allDelivered || anyRead) {
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>✓✓</span>; // Double Grey Ticks
      } else {
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>✓</span>; // Single Grey Tick
      }
    }
  };

  return (
    <div className="chatroom-container">
      {/* Top Header */}
      <div className="chatroom-header">
        <div
          className="chat-header-info"
          onClick={() => setIsGroupInfoOpen(true)}
          style={{ cursor: 'pointer' }}
          title="Click for Chat Info"
        >
          <div
            className="header-avatar"
            style={{
              position: 'relative',
              backgroundImage: activeChat.isGroup && activeChat.avatar?.url ? `url(${activeChat.avatar.url})` : (!activeChat.isGroup && getOtherUser()?.avatar?.url) ? `url(${getOtherUser().avatar.url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: (activeChat.isGroup && activeChat.avatar?.url) || (!activeChat.isGroup && getOtherUser()?.avatar?.url) ? 'transparent' : 'white'
            }}
          >
            {!((activeChat.isGroup && activeChat.avatar?.url) || (!activeChat.isGroup && getOtherUser()?.avatar?.url)) && chatName.charAt(0).toUpperCase()}
            {isChatOnline() && (
              <span style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '12px',
                height: '12px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                border: '2px solid white'
              }}></span>
            )}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{chatName}</h3>
            <span className="online-status" style={{ color: isChatOnline() ? '#10b981' : '#94a3b8', fontSize: '0.85rem' }}>
              {isTyping ? <span style={{ color: '#0ea5e9', fontStyle: 'italic' }}>Typing...</span> : getLastSeenText()}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setIsGroupInfoOpen(true)} title="Chat Settings">⋮</button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
        {loadingMessages && <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8' }}>Loading older messages...</div>}
        {messages.map((msg) => {
          // Determine if sender object is populated or just an ID
          const senderId = msg.sender?._id || msg.sender;
          const isOwn = senderId === user._id;
          const senderName = msg.sender?.username || 'Unknown';

          return (
            <div key={msg._id || msg.id} className={`message-wrapper ${isOwn ? 'message-own' : ''}`}>
              {!isOwn && (
                <div
                  className="message-avatar"
                  title={senderName}
                  style={{
                    backgroundImage: msg.sender?.avatar?.url ? `url(${msg.sender.avatar.url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: msg.sender?.avatar?.url ? 'transparent' : 'white'
                  }}
                >
                  {!msg.sender?.avatar?.url && senderName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="message-content">
                <div className="message-bubble" style={{ padding: (msg.type === 'image' && !msg.content) ? '4px' : '10px 15px' }}>

                  {/* Media Rendering */}
                  {msg.type === 'image' && msg.media && (
                    <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                      <img src={msg.media.url} alt="Shared Image" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '6px', display: 'block' }} loading="lazy" />
                    </div>
                  )}
                  {msg.type === 'file' && msg.media && (
                    <div style={{ marginBottom: msg.content ? '8px' : '0', padding: '10px', backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                      <a href={msg.media.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        <span style={{ fontSize: '1.2rem' }}>📄</span> Download File
                      </a>
                    </div>
                  )}

                  {msg.content && <p>{msg.content}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isOwn ? 'flex-end' : 'flex-start', gap: '4px', marginTop: '2px' }}>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                  {isOwn && getReadReceiptIcon(msg)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Media Preview */}
      {selectedFile && (
        <div style={{ padding: '10px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          {selectedFile.type.startsWith('image/') && (
            <img src={URL.createObjectURL(selectedFile)} alt="Preview" style={{ height: '50px', width: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          )}
          {!selectedFile.type.startsWith('image/') && (
            <div style={{ height: '50px', width: '50px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📄</div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{selectedFile.name}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
          <button onClick={() => setSelectedFile(null)} disabled={isUploading} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', height: '30px', width: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      {/* Input Area */}
      <div className="message-input-area" style={{ opacity: isUploading ? 0.7 : 1 }}>
        <button className="icon-btn attach-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>+</button>
        <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} />
        <input
          type="text"
          placeholder={isUploading ? "Uploading media..." : "Type a message..."}
          className="msg-input"
          value={message}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          disabled={isUploading}
        />
        <button className="send-btn" onClick={handleSend} disabled={isUploading}>
          {isUploading ? '...' : 'Send'}
        </button>
      </div>

      <ChatInfoModal
        isOpen={isGroupInfoOpen}
        onClose={() => setIsGroupInfoOpen(false)}
      />
    </div>
  );
};

export default Chatroom;