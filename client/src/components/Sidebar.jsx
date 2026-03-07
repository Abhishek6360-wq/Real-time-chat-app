import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { searchUsers, createChat } from '../api/chat';
import { toast } from 'react-hot-toast';
import SettingsModal from './SettingsModal';
import CreateGroupModal from './CreateGroupModal';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { chats, loadChats, selectChat, activeChat, isViewingArchived, setIsViewingArchived } = useChat();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const data = await searchUsers(searchQuery);
      setSearchResults(data.data || []);
    } catch (error) {
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateChat = async (userId) => {
    try {
      const chat = await createChat(userId);
      await loadChats(); // refresh the sidebar list
      selectChat(chat.data); // select the newly created or fetched chat
      setIsSearchModalOpen(false); // close modal
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('Failed to create chat');
    }
  };

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.name;
    const otherUser = chat.participants.find(p => p._id !== user._id);
    return otherUser ? otherUser.username : 'Unknown User';
  };

  const isChatOnline = (chat) => {
    if (chat.isGroup) return false;
    const otherUser = chat.participants.find(p => p._id !== user._id);
    return otherUser ? otherUser.isOnline : false;
  };

  const getOtherUser = (chat) => {
    if (chat.isGroup) return null;
    return chat.participants.find(p => p._id !== user._id);
  };

  const getLastMessageText = (chat) => {
    if (!chat.lastMessage || !chat.lastMessage.content) return 'No messages yet';
    return chat.lastMessage.content.length > 30
      ? chat.lastMessage.content.substring(0, 30) + '...'
      : chat.lastMessage.content;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="profile-icon"
              title={user?.username}
              onClick={() => setIsSettingsModalOpen(true)}
              style={{
                cursor: 'pointer',
                backgroundImage: user?.avatar?.url ? `url(${user.avatar.url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: user?.avatar?.url ? 'transparent' : 'white',
                width: '45px',
                height: '45px',
                fontSize: '1.2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {!user?.avatar?.url && (user?.username?.charAt(0)?.toUpperCase() || 'P')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-dark)' }}>{user?.username}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>My Profile</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="icon-btn"
              title="Create Group Chat"
              onClick={() => setIsGroupModalOpen(true)}
              style={{ fontSize: '1.2rem', backgroundColor: '#e2e8f0', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
            >
              +
            </button>
            <button
              onClick={logout}
              title="Logout"
              style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', transition: 'background-color 0.2s' }}
            >
              ⎋
            </button>
          </div>
        </div>
        <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-dark)' }}>Chats</h2>
      </div>

      <div className="search-bar">
        <button
          className="search-input"
          style={{ width: '100%', textAlign: 'left', cursor: 'text' }}
          onClick={() => setIsSearchModalOpen(true)}
        >
          <span style={{ color: '#94a3b8' }}>Search users to start chatting...</span>
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '10px', padding: '0 15px' }}>
        <button
          onClick={() => setIsViewingArchived(false)}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: !isViewingArchived ? '2px solid #3b82f6' : '2px solid transparent', color: !isViewingArchived ? '#3b82f6' : '#64748b', fontWeight: !isViewingArchived ? 'bold' : 'normal', cursor: 'pointer', outline: 'none' }}
        >Active</button>
        <button
          onClick={() => setIsViewingArchived(true)}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: isViewingArchived ? '2px solid #3b82f6' : '2px solid transparent', color: isViewingArchived ? '#3b82f6' : '#64748b', fontWeight: isViewingArchived ? 'bold' : 'normal', cursor: 'pointer', outline: 'none' }}
        >Archived</button>
      </div>

      <div className="chat-list">
        {chats && chats.length > 0 ? chats.map(chat => {
          const chatName = getChatName(chat);
          const isOnline = isChatOnline(chat);
          const isActive = activeChat && activeChat._id === chat._id;
          return (
            <div
              key={chat._id}
              className={`chat-item ${isActive ? 'active' : ''}`}
              onClick={() => selectChat(chat)}
            >
              <div
                className="chat-avatar"
                style={{
                  position: 'relative',
                  backgroundImage: chat.isGroup && chat.avatar?.url ? `url(${chat.avatar.url})` : (!chat.isGroup && getOtherUser(chat)?.avatar?.url) ? `url(${getOtherUser(chat).avatar.url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: (chat.isGroup && chat.avatar?.url) || (!chat.isGroup && getOtherUser(chat)?.avatar?.url) ? 'transparent' : 'white'
                }}
              >
                {!((chat.isGroup && chat.avatar?.url) || (!chat.isGroup && getOtherUser(chat)?.avatar?.url)) && chatName.charAt(0).toUpperCase()}
                {isOnline && (
                  <span style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    border: '2px solid white'
                  }} title="Online"></span>
                )}
              </div>

              <div className="chat-info">
                <div className="chat-info-top">
                  <span className="chat-name">{chatName}</span>
                  <span className="chat-time">{formatTime(chat.lastMessage?.createdAt)}</span>
                </div>
                <div className="chat-info-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="chat-last-message">{getLastMessageText(chat)}</span>
                  {chat.unreadCount > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      minWidth: '18px',
                      textAlign: 'center'
                    }}>
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        }) : <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No chats found.</div>}
      </div>

      {/* Search Modal Overlay */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start New Chat</h3>
              <button className="icon-btn" onClick={() => setIsSearchModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSearch} className="modal-search-form">
              <input
                type="text"
                placeholder="Search by username..."
                className="sidebar-input"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={isSearching}>
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            <div className="modal-results">
              {searchResults.length > 0 ? (
                searchResults.map(resultUser => (
                  <div key={resultUser._id} className="search-result-item" onClick={() => handleCreateChat(resultUser._id)}>
                    <div
                      className="chat-avatar"
                      style={{
                        backgroundImage: resultUser.avatar?.url ? `url(${resultUser.avatar.url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: resultUser.avatar?.url ? 'transparent' : 'white'
                      }}
                    >
                      {!resultUser.avatar?.url && resultUser.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{resultUser.username}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                  {searchQuery ? 'No users found matching query.' : 'Type a name to search...'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;