import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { renameGroup, addMemberToGroup, removeMemberFromGroup, leaveGroup, searchUsers, archiveChat, unarchiveChat } from '../api/chat';
import { blockUser, unblockUser } from '../api/user';
import { toast } from 'react-hot-toast';
import './CreateGroupModal.css'; // Reusing established modal CSS

const ChatInfoModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { activeChat, setActiveChat, loadChats } = useChat();

    const [groupName, setGroupName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Assume not blocked initially if we don't have global state. User can toggle it.
    const [isUserBlocked, setIsUserBlocked] = useState(false);

    if (!isOpen || !activeChat) return null;

    const isGroup = activeChat.isGroup;
    const otherUser = !isGroup ? activeChat.participants.find(p => p._id !== user._id) : null;

    // Helper to check if current user is an admin
    const isAdmin = isGroup && (activeChat.admins?.some(admin => admin._id === user._id) || activeChat.groupAdmin?.toString() === user._id.toString());

    const handleRename = async () => {
        if (!groupName.trim() || groupName === activeChat.name) {
            setIsRenaming(false);
            return;
        }

        try {
            const data = await renameGroup(activeChat._id, groupName);
            setActiveChat(data.data); // Update locally
            toast.success("Group renamed");
            setIsRenaming(false);
        } catch (error) {
            toast.error("Failed to rename group");
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const result = await searchUsers(query);
            // Filter out people who are already in the group
            const filtered = (result.data || []).filter(u =>
                !activeChat.participants.some(p => p._id === u._id)
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddMember = async (userToAdd) => {
        if (!isAdmin) return toast.error("Only admins can add members");

        try {
            const data = await addMemberToGroup(activeChat._id, userToAdd._id);
            setActiveChat(data.data); // Update locally
            toast.success(`${userToAdd.username} added to group`);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add user");
        }
    };

    const handleRemoveMember = async (userToRemove) => {
        if (!isAdmin && user._id !== userToRemove._id) {
            return toast.error("Only admins can remove members");
        }

        try {
            const data = await removeMemberFromGroup(activeChat._id, userToRemove._id);
            setActiveChat(data.data);
            toast.success(`${userToRemove.username} removed`);
        } catch (error) {
            toast.error("Failed to remove user");
        }
    };

    const handleLeaveGroup = async () => {
        if (window.confirm("Are you sure you want to leave this group?")) {
            try {
                await leaveGroup(activeChat._id);
                toast.success("Left group successfully");
                onClose();
                setActiveChat(null); // Clear chatroom
                loadChats(); // Refresh sidebar list
            } catch (error) {
                toast.error("Error leaving group");
            }
        }
    };

    const handleBlockToggle = async () => {
        if (!otherUser) return;
        try {
            if (isUserBlocked) {
                await unblockUser(otherUser._id);
                toast.success(`Unblocked ${otherUser.username}`);
                setIsUserBlocked(false);
            } else {
                await blockUser(otherUser._id);
                toast.success(`Blocked ${otherUser.username}`);
                setIsUserBlocked(true);
            }
        } catch (error) {
            toast.error("Failed to update block status");
        }
    };

    const handleArchiveToggle = async () => {
        try {
            if (activeChat.isArchieved) {
                await unarchiveChat(activeChat._id);
                toast.success("Chat unarchived");
            } else {
                await archiveChat(activeChat._id);
                toast.success("Chat archived");
            }
            onClose();
            setActiveChat(null);
            loadChats(); // refresh sidebar based on active tab
        } catch (error) {
            toast.error("Failed to update archive status");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content group-modal">
                <div className="modal-header">
                    <h2>Group Info</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {!isGroup ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div
                                className="search-result-avatar"
                                style={{
                                    margin: '0 auto 15px auto',
                                    width: '80px',
                                    height: '80px',
                                    fontSize: '2rem',
                                    backgroundImage: otherUser?.avatar?.url ? `url(${otherUser.avatar.url})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    color: otherUser?.avatar?.url ? 'transparent' : 'white'
                                }}
                            >
                                {!otherUser?.avatar?.url && otherUser?.username?.charAt(0).toUpperCase()}
                            </div>
                            <h2 style={{ marginBottom: '5px' }}>{otherUser?.username}</h2>
                            <p style={{ color: '#64748b', marginBottom: '20px' }}>{otherUser?.email}</p>

                            <button
                                onClick={handleBlockToggle}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    background: isUserBlocked ? '#e2e8f0' : '#fee2e2',
                                    color: isUserBlocked ? '#1e293b' : '#ef4444'
                                }}
                            >
                                {isUserBlocked ? 'Unblock User' : 'Block User'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Rename Section */}
                            <div className="form-group margin-bottom" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {isRenaming ? (
                                    <>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            defaultValue={activeChat.name}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            autoFocus
                                        />
                                        <button className="btn-primary" onClick={handleRename}>Save</button>
                                        <button className="btn-cancel" onClick={() => setIsRenaming(false)}>X</button>
                                    </>
                                ) : (
                                    <>
                                        <h3 style={{ margin: 0, flex: 1 }}>{activeChat.name}</h3>
                                        {isAdmin && (
                                            <button className="icon-btn" onClick={() => { setIsRenaming(true); setGroupName(activeChat.name); }}>✎</button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Add Member Section (Admin Only) */}
                            {isAdmin && (
                                <div className="form-group margin-bottom">
                                    <label>Add Member</label>
                                    <input
                                        type="text"
                                        className="settings-input"
                                        placeholder="Search by username..."
                                        value={searchQuery}
                                        onChange={handleSearch}
                                    />

                                    {/* Search Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="search-results-box" style={{ marginTop: '5px' }}>
                                            {searchResults.map((u) => (
                                                <div
                                                    key={u._id}
                                                    className="search-result-item"
                                                    onClick={() => handleAddMember(u)}
                                                >
                                                    <div className="search-result-avatar">{u.username.charAt(0).toUpperCase()}</div>
                                                    <span className="search-result-name">{u.username}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>+ Add</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Participants List */}
                            <div className="form-group margin-bottom">
                                <label style={{ marginBottom: '10px', display: 'block' }}>{activeChat.participants.length} Participants</label>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {activeChat.participants.map(p => {
                                        const isParticipantAdmin = activeChat.admins?.some(a => a._id === p._id) || activeChat.groupAdmin === p._id;

                                        return (
                                            <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div
                                                        className="search-result-avatar"
                                                        style={{
                                                            margin: 0,
                                                            width: '36px',
                                                            height: '36px',
                                                            backgroundImage: p.avatar?.url ? `url(${p.avatar.url})` : 'none',
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                            color: p.avatar?.url ? 'transparent' : 'white'
                                                        }}
                                                    >
                                                        {!p.avatar?.url && p.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                                                            {p.username} {p._id === user._id && '(You)'}
                                                        </div>
                                                        {isParticipantAdmin && <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>Admin</div>}
                                                    </div>
                                                </div>

                                                {isAdmin && p._id !== user._id && (
                                                    <button
                                                        onClick={() => handleRemoveMember(p)}
                                                        style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', padding: '15px 20px', borderTop: '1px solid #e2e8f0', marginTop: '20px' }}>
                    {isGroup && <button className="btn-cancel" onClick={handleLeaveGroup} style={{ color: '#ef4444', borderColor: '#ef4444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: '#fee2e2', border: 'none', fontWeight: 600 }}>Leave Group</button>}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px' }}>
                        <button
                            className="btn-save"
                            onClick={handleArchiveToggle}
                            style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}
                        >
                            {activeChat.isArchieved ? 'Unarchive Chat' : 'Archive Chat'}
                        </button>
                        <button className="btn-save" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: '#0284c7', color: 'white', border: 'none', fontWeight: 600 }}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInfoModal;
